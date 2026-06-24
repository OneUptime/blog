# How to Test IPv6 Networking Code in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, IPv6, Testing, Jest, Mocha, Integration Test

Description: Test IPv6 networking code in Node.js using Jest and Mocha with in-process servers, parameterized tests, and conditional test skipping.

## Testing IPv6 Validation Logic

```javascript
// ipv6-utils.js
const net = require('net');

function isValidIPv6(addr) {
    if (typeof addr !== 'string') return false;
    // Strip zone ID before validating
    const clean = addr.includes('%') ? addr.split('%')[0] : addr;
    return net.isIPv6(clean);
}

function normalizeIPv4Mapped(addr) {
    if (addr && addr.startsWith('::ffff:')) {
        return addr.slice(7);
    }
    return addr;
}

module.exports = { isValidIPv6, normalizeIPv4Mapped };
```

```javascript
// ipv6-utils.test.js (Jest)
const { isValidIPv6, normalizeIPv4Mapped } = require('./ipv6-utils');

describe('isValidIPv6', () => {
    test.each([
        ['2001:db8::1', true],
        ['::1', true],
        ['::', true],
        ['fe80::1%eth0', true],        // zone ID stripped
        ['2001:db8::gg', false],        // invalid hex
        ['not-an-address', false],
        [null, false],
    ])('%s → %s', (input, expected) => {
        expect(isValidIPv6(input)).toBe(expected);
    });
});

describe('normalizeIPv4Mapped', () => {
    test('strips ::ffff: prefix', () => {
        expect(normalizeIPv4Mapped('::ffff:192.168.1.1')).toBe('192.168.1.1');
    });

    test('leaves IPv6 unchanged', () => {
        expect(normalizeIPv4Mapped('2001:db8::1')).toBe('2001:db8::1');
    });

    test('leaves IPv4 unchanged', () => {
        expect(normalizeIPv4Mapped('192.168.1.1')).toBe('192.168.1.1');
    });
});
```

## Integration Test with In-Process Server

```javascript
// server.integration.test.js (Jest + supertest)
const http = require('http');
const supertest = require('supertest');

function createTestServer() {
    const net = require('net');

    const server = http.createServer((req, res) => {
        let ip = req.socket.remoteAddress || '';
        if (ip.startsWith('::ffff:')) ip = ip.slice(7);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ip,
            isIPv6: net.isIPv6(ip),
            path: req.url,
        }));
    });

    return server;
}

describe('IPv6 HTTP Server', () => {
    let server;
    let request;

    beforeAll((done) => {
        server = createTestServer();
        server.listen(0, '::1', () => {
            const port = server.address().port;
            request = supertest(`http://[::1]:${port}`);
            done();
        });
    });

    afterAll((done) => {
        server.close(done);
    });

    test('responds to IPv6 requests', async () => {
        const res = await request.get('/health').expect(200);
        expect(res.body).toHaveProperty('ip');
        expect(res.body.isIPv6).toBe(true);
    });

    test('returns correct path', async () => {
        const res = await request.get('/test?q=1').expect(200);
        expect(res.body.path).toBe('/test?q=1');
    });
});
```

## Testing TCP Servers with IPv6

```javascript
// tcp.integration.test.js (Jest)
const net = require('net');

function createEchoServer(host, port) {
    return new Promise((resolve, reject) => {
        const server = net.createServer((socket) => {
            socket.on('data', (data) => socket.write(data));
        });

        server.listen(port, host, () => resolve(server));
        server.on('error', reject);
    });
}

function tcpSend(host, port, message) {
    return new Promise((resolve, reject) => {
        const client = net.createConnection(port, host);
        let received = '';

        client.on('connect', () => client.write(message));
        client.on('data', (data) => {
            received += data.toString();
            if (received.length >= message.length) {
                client.destroy();
                resolve(received);
            }
        });
        client.on('error', reject);
    });
}

describe('IPv6 TCP Echo Server', () => {
    let server;

    beforeAll(async () => {
        server = await createEchoServer('::1', 0);
    });

    afterAll((done) => server.close(done));

    test('echoes data over IPv6', async () => {
        const port = server.address().port;
        const result = await tcpSend('::1', port, 'Hello IPv6');
        expect(result).toBe('Hello IPv6');
    });
});
```

## Conditional Tests for IPv6 Availability

```javascript
// Return early if IPv6 is not available on the test machine
function isIPv6Available() {
    return new Promise((resolve) => {
        const server = require('net').createServer();
        server.once('error', () => resolve(false));
        server.listen(0, '::1', () => {
            server.close(() => resolve(true));
        });
    });
}

// In Jest
let ipv6Available = false;

beforeAll(async () => {
    ipv6Available = await isIPv6Available();
});

test('IPv6 TCP connection', async () => {
    if (!ipv6Available) {
        console.log('IPv6 not available; test not run');
        return;
    }
    // ... IPv6 test
});
```

## Testing Express IPv6 Middleware

```javascript
// express-ipv6.test.js (Jest + supertest)
const express = require('express');
const supertest = require('supertest');

function createApp() {
    const app = express();

    app.use((req, res, next) => {
        req.clientIP = req.headers['x-forwarded-for']
            || req.socket.remoteAddress
            || '';
        if (req.clientIP.startsWith('::ffff:')) {
            req.clientIP = req.clientIP.slice(7);
        }
        next();
    });

    app.get('/ip', (req, res) => res.json({ ip: req.clientIP }));
    return app;
}

describe('Express IPv6 middleware', () => {
    const app = createApp();

    test('extracts IP from X-Forwarded-For', async () => {
        const res = await supertest(app)
            .get('/ip')
            .set('X-Forwarded-For', '2001:db8::1')
            .expect(200);
        expect(res.body.ip).toBe('2001:db8::1');
    });

    test('falls back to socket address', async () => {
        const res = await supertest(app).get('/ip').expect(200);
        expect(res.body.ip).toBeDefined();
    });
});
```

## Conclusion

Testing IPv6 Node.js code follows standard patterns with a few adjustments. Bind in-process test servers to `'::1'` for loopback IPv6 testing. Use `supertest` with `http://[::1]:port` URL format for HTTP testing. Conditional availability checks handle CI environments without IPv6 support. Parameterized tests with `test.each` efficiently cover many IPv6 address edge cases. Mock `X-Forwarded-For` headers in middleware tests to simulate proxy-forwarded IPv6 addresses.
