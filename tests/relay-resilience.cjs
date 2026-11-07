const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(__dirname + '/../server.js', 'utf8');
const privateMarkers = [
  'PrivateFirst', 'PrivateLast', 'private@example.invalid', '07700900000',
  'PRIVATE PROPERTY ADDRESS', 'PRIVATE NOTES', 'PRIVATE USER AGENT',
  '198.51.100.123', 'private-origin.invalid', 'PRIVATE UPSTREAM FAILURE'
];
const valid = {
  firstName: privateMarkers[0], lastName: privateMarkers[1], email: privateMarkers[2],
  phone: privateMarkers[3], address1: privateMarkers[4], notes: privateMarkers[5],
  _elapsed: 5000, sourcePage: 'PRIVATE PROPERTY ADDRESS', gclid: 'PRIVATE CLICK ID',
  adUserDataConsent: 'denied'
};

function harness(mode) {
  let handler, forwarded = null, calls = 0, aborted = false;
  const logs = [], timers = new Set();
  const app = {
    set() {}, use() {}, listen() {},
    post(route, fn) { if (route === '/api/submit') handler = fn; }
  };
  const express = () => app;
  express.json = () => {};
  express.static = () => {};
  const record = (...args) => logs.push(args.map(String).join(' '));
  vm.runInNewContext(source, {
    require(name) {
      if (name === 'express') return express;
      if (name === './build') return {};
      return require(name);
    },
    __dirname: __dirname + '/..', process: { env: {} },
    console: { log: record, warn: record, error: record },
    URL, Date, Map, Set, AbortController,
    setTimeout(fn, ms) {
      assert.equal(ms, 10000, 'production relay timeout is ten seconds');
      // Exercise the real abort path without making the test wait ten seconds.
      const timer = setTimeout(fn, 2);
      timers.add(timer);
      return timer;
    },
    clearTimeout(timer) { clearTimeout(timer); timers.delete(timer); },
    async fetch(_url, options) {
      calls++;
      forwarded = JSON.parse(options.body);
      assert(options.signal instanceof AbortSignal, 'fetch receives abort signal');
      if (mode === 'timeout') {
        return new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            aborted = true;
            reject(new Error('PRIVATE UPSTREAM FAILURE'));
          }, { once: true });
        });
      }
      if (mode === 'network') throw new Error('PRIVATE UPSTREAM FAILURE private@example.invalid');
      return {
        ok: mode !== 'rejected', status: mode === 'rejected' ? 503 : 200,
        text() { throw new Error('upstream bodies must not be read for logging'); }
      };
    }
  });
  return {
    async submit(extra = {}, headers = {}) {
      let payload, status = 200;
      const res = {
        status(value) { status = value; return res; },
        json(value) { payload = value; return res; }
      };
      await handler({
        body: { ...valid, ...extra }, ip: privateMarkers[7],
        headers: { origin: 'https://southyorkshirepropertybuyers.com', 'user-agent': privateMarkers[6], ...headers }
      }, res);
      assert.equal(timers.size, 0, 'relay always clears its timeout');
      for (const marker of [...privateMarkers, 'PRIVATE CLICK ID']) {
        assert(!logs.join('\n').includes(marker), 'operational logs contain no private payload/header/error data');
      }
      return { status, payload, forwarded, calls, aborted, logs };
    }
  };
}

(async () => {
  let result = await harness('success').submit();
  assert.equal(result.status, 200);
  assert.equal(result.payload.ok, true);
  assert.equal(result.calls, 1);
  assert.equal(result.forwarded.gclid, 'PRIVATE CLICK ID');
  assert.equal(result.forwarded.adUserDataConsent, 'denied');
  assert(!('_hp' in result.forwarded) && !('_elapsed' in result.forwarded));

  result = await harness('rejected').submit();
  assert.equal(result.status, 502);
  assert.equal(result.payload.ok, false);
  assert.equal(result.calls, 1, 'upstream rejection is not retried');

  result = await harness('network').submit();
  assert.equal(result.status, 502);
  assert.equal(result.payload.ok, false);
  assert.equal(result.calls, 1, 'network failure is not retried');

  result = await harness('timeout').submit();
  assert.equal(result.status, 504);
  assert.equal(result.payload.ok, false);
  assert.equal(result.aborted, true, 'stalled upstream fetch is aborted');
  assert.equal(result.calls, 1, 'timed-out enquiries are not automatically retried');

  for (const extra of [{ _hp: 'bot' }, { _elapsed: 1 }, { notes: 'https://spam.invalid' }, { email: 'invalid' }]) {
    result = await harness('success').submit(extra);
    assert.equal(result.status, 200);
    assert.equal(result.payload.ok, true);
    assert.equal(result.payload.accepted, false);
    assert.equal(result.calls, 0, 'rejected submissions do not reach CRM');
  }
  result = await harness('success').submit({}, { origin: 'https://private-origin.invalid' });
  assert.equal(result.payload.accepted, false);
  assert.equal(result.calls, 0);
  console.log('PASS: successful, rejected, failed and timed-out relays; no retries, no contact/header/upstream-error data in logs; all upstream requests mocked.');
})().catch(error => { console.error(error); process.exitCode = 1; });
