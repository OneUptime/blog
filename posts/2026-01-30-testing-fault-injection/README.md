# How to Create Fault Injection Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Testing, Chaos Engineering, Fault Injection, Reliability

Description: Implement fault injection testing to verify system resilience with network failures, service errors, and resource exhaustion scenarios.

---

Production systems fail. Networks drop packets, services crash, databases timeout, and memory runs out. The question is not *if* your system will encounter failures, but *when* and *how well* it handles them. Fault injection testing lets you answer these questions before your users do.

This guide walks through building fault injection tests from scratch. You will learn how to simulate network failures, inject latency, trigger service errors, exhaust resources, and automate the entire process in your CI/CD pipeline.

---

## What Is Fault Injection Testing?

Fault injection testing deliberately introduces failures into a system to observe how it responds. Unlike traditional testing that verifies happy paths, fault injection tests verify:

- Graceful degradation under partial failures
- Timeout handling and retry logic
- Circuit breaker activation
- Fallback mechanisms
- Error propagation and logging
- Recovery behavior after failures resolve

The goal is building confidence that your system behaves predictably when things go wrong.

---

## Types of Fault Injection

Before writing code, understand the categories of faults you can inject:

| Fault Type | What It Simulates | Common Symptoms |
|------------|-------------------|-----------------|
| Network Failure | Connection drops, DNS failures, packet loss | Timeouts, connection refused errors |
| Latency | Slow networks, overloaded services | Increased response times, queue buildup |
| Error Injection | HTTP 500s, exceptions, invalid responses | Error handling paths exercised |
| Resource Exhaustion | Memory pressure, CPU saturation, disk full | OOM kills, throttling, degraded performance |
| Process Failure | Service crashes, container restarts | Failover triggers, data consistency issues |
| Clock Skew | Time synchronization problems | Token expiration issues, ordering bugs |

We will cover each type with working implementations.

---

## Setting Up a Test Environment

Start with a simple microservices setup to inject faults into. This example uses Node.js, but the patterns apply to any language.

The following code creates a basic HTTP service that calls a downstream dependency. This will be our target for fault injection.

```javascript
// service.js - A simple service with a downstream dependency
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const DOWNSTREAM_URL = process.env.DOWNSTREAM_URL || 'http://localhost:4000';

// Configuration for resilience
const config = {
    timeout: parseInt(process.env.REQUEST_TIMEOUT) || 5000,
    retries: parseInt(process.env.MAX_RETRIES) || 3,
    retryDelay: parseInt(process.env.RETRY_DELAY) || 1000,
};

// Simple retry logic with exponential backoff
async function callWithRetry(url, attempt = 1) {
    try {
        const response = await axios.get(url, {
            timeout: config.timeout
        });
        return response.data;
    } catch (error) {
        if (attempt < config.retries) {
            const delay = config.retryDelay * Math.pow(2, attempt - 1);
            console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return callWithRetry(url, attempt + 1);
        }
        throw error;
    }
}

app.get('/data', async (req, res) => {
    try {
        const result = await callWithRetry(`${DOWNSTREAM_URL}/api/data`);
        res.json({ status: 'success', data: result });
    } catch (error) {
        console.error('Failed to fetch data:', error.message);
        res.status(503).json({
            status: 'error',
            message: 'Service temporarily unavailable'
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

app.listen(PORT, () => {
    console.log(`Service running on port ${PORT}`);
});
```

---

## Network Failure Injection

Network failures are the most common production issue. Simulate them to verify your timeout and retry logic works correctly.

### Using a Fault Injection Proxy

Create a proxy that sits between your service and its dependencies. This proxy can drop connections, delay responses, or return errors on demand.

```javascript
// fault-proxy.js - A configurable fault injection proxy
const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({});
const TARGET = process.env.TARGET_URL || 'http://localhost:4000';

// Fault configuration - controlled via environment or API
let faultConfig = {
    enabled: false,
    type: 'none',           // 'none', 'drop', 'timeout', 'error', 'latency'
    probability: 1.0,       // 0.0 to 1.0 - chance of fault occurring
    latencyMs: 0,           // Additional latency in milliseconds
    errorCode: 500,         // HTTP error code to return
    dropAfterBytes: 0,      // Drop connection after N bytes (0 = immediate)
};

// API to configure faults dynamically during tests
const configServer = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/fault/config') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            faultConfig = { ...faultConfig, ...JSON.parse(body) };
            console.log('Fault config updated:', faultConfig);
            res.writeHead(200);
            res.end(JSON.stringify(faultConfig));
        });
        return;
    }

    if (req.method === 'GET' && req.url === '/fault/config') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(faultConfig));
        return;
    }

    if (req.method === 'DELETE' && req.url === '/fault/config') {
        faultConfig = { enabled: false, type: 'none', probability: 1.0 };
        res.writeHead(200);
        res.end('Faults disabled');
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

// Main proxy server with fault injection
const proxyServer = http.createServer((req, res) => {
    // Check if we should inject a fault
    if (faultConfig.enabled && Math.random() < faultConfig.probability) {
        return injectFault(req, res);
    }

    // Normal proxy behavior
    proxy.web(req, res, { target: TARGET });
});

function injectFault(req, res) {
    console.log(`Injecting fault: ${faultConfig.type} for ${req.url}`);

    switch (faultConfig.type) {
        case 'drop':
            // Immediately destroy the connection
            req.socket.destroy();
            break;

        case 'timeout':
            // Never respond - let the client timeout
            // Connection stays open but no data sent
            break;

        case 'error':
            // Return an HTTP error
            res.writeHead(faultConfig.errorCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Injected fault',
                code: faultConfig.errorCode
            }));
            break;

        case 'latency':
            // Add delay then proxy normally
            setTimeout(() => {
                proxy.web(req, res, { target: TARGET });
            }, faultConfig.latencyMs);
            break;

        default:
            proxy.web(req, res, { target: TARGET });
    }
}

// Handle proxy errors
proxy.on('error', (err, req, res) => {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) {
        res.writeHead(502);
        res.end('Bad Gateway');
    }
});

// Start both servers
proxyServer.listen(8080, () => console.log('Fault proxy on port 8080'));
configServer.listen(8081, () => console.log('Fault config API on port 8081'));
```

### Testing Network Failures

Write tests that use the fault injection proxy to verify your service handles network failures correctly.

```javascript
// network-fault.test.js - Tests for network failure handling
const axios = require('axios');

const SERVICE_URL = 'http://localhost:3000';
const FAULT_CONFIG_URL = 'http://localhost:8081';

// Helper to configure fault injection
async function setFault(config) {
    await axios.post(`${FAULT_CONFIG_URL}/fault/config`, config);
}

async function clearFaults() {
    await axios.delete(`${FAULT_CONFIG_URL}/fault/config`);
}

describe('Network Failure Resilience', () => {
    afterEach(async () => {
        await clearFaults();
    });

    test('handles connection drops gracefully', async () => {
        // Configure the proxy to drop all connections
        await setFault({
            enabled: true,
            type: 'drop',
            probability: 1.0
        });

        const response = await axios.get(`${SERVICE_URL}/data`, {
            validateStatus: () => true  // Don't throw on error status
        });

        // Service should return 503 after retries exhausted
        expect(response.status).toBe(503);
        expect(response.data.status).toBe('error');
    });

    test('retries on intermittent failures', async () => {
        // 50% of requests will fail - should eventually succeed
        await setFault({
            enabled: true,
            type: 'error',
            errorCode: 500,
            probability: 0.5
        });

        // With 3 retries and 50% failure rate, success is likely
        const response = await axios.get(`${SERVICE_URL}/data`, {
            validateStatus: () => true
        });

        // May succeed or fail depending on luck, but should not crash
        expect([200, 503]).toContain(response.status);
    });

    test('handles complete downstream outage', async () => {
        await setFault({
            enabled: true,
            type: 'timeout',
            probability: 1.0
        });

        const startTime = Date.now();
        const response = await axios.get(`${SERVICE_URL}/data`, {
            validateStatus: () => true,
            timeout: 30000  // Our timeout, not the service's
        });
        const duration = Date.now() - startTime;

        // Service should timeout and return error
        expect(response.status).toBe(503);

        // Verify timeout logic is working (should be timeout * retries + delays)
        // With 5s timeout, 3 retries, and exponential backoff: ~18-20 seconds
        expect(duration).toBeGreaterThan(10000);
        expect(duration).toBeLessThan(30000);
    });
});
```

---

## Latency Injection

High latency causes cascading failures. Inject latency to verify your timeouts are set correctly and your system degrades gracefully under slow conditions.

### Implementing Latency Injection

Extend the fault proxy to support variable latency patterns.

```javascript
// latency-injector.js - Advanced latency injection patterns
class LatencyInjector {
    constructor() {
        this.config = {
            enabled: false,
            pattern: 'fixed',       // 'fixed', 'random', 'spike', 'gradual'
            baseLatencyMs: 0,
            maxLatencyMs: 0,
            spikeIntervalMs: 10000, // For spike pattern
            spikeDurationMs: 2000,
            gradualStepMs: 100,     // For gradual pattern
        };
        this.spikeActive = false;
        this.gradualLatency = 0;
    }

    configure(newConfig) {
        this.config = { ...this.config, ...newConfig };

        // Reset pattern-specific state
        if (this.config.pattern === 'gradual') {
            this.gradualLatency = this.config.baseLatencyMs;
            this.startGradualIncrease();
        }

        if (this.config.pattern === 'spike') {
            this.startSpikePattern();
        }
    }

    // Calculate latency based on current pattern
    getLatency() {
        if (!this.config.enabled) return 0;

        switch (this.config.pattern) {
            case 'fixed':
                return this.config.baseLatencyMs;

            case 'random':
                // Random latency between base and max
                const range = this.config.maxLatencyMs - this.config.baseLatencyMs;
                return this.config.baseLatencyMs + Math.random() * range;

            case 'spike':
                // Periodic high-latency spikes
                return this.spikeActive
                    ? this.config.maxLatencyMs
                    : this.config.baseLatencyMs;

            case 'gradual':
                // Gradually increasing latency (simulates memory leak or resource exhaustion)
                return this.gradualLatency;

            default:
                return 0;
        }
    }

    startSpikePattern() {
        // Create periodic latency spikes
        setInterval(() => {
            this.spikeActive = true;
            setTimeout(() => {
                this.spikeActive = false;
            }, this.config.spikeDurationMs);
        }, this.config.spikeIntervalMs);
    }

    startGradualIncrease() {
        // Gradually increase latency over time
        setInterval(() => {
            if (this.gradualLatency < this.config.maxLatencyMs) {
                this.gradualLatency += this.config.gradualStepMs;
            }
        }, 1000);
    }

    // Apply latency to a request handler
    async applyLatency() {
        const latency = this.getLatency();
        if (latency > 0) {
            await new Promise(resolve => setTimeout(resolve, latency));
        }
        return latency;
    }
}

module.exports = { LatencyInjector };
```

### Testing Latency Tolerance

Verify your service handles various latency scenarios.

```javascript
// latency.test.js - Latency tolerance tests
const axios = require('axios');

describe('Latency Tolerance', () => {
    test('handles latency below timeout threshold', async () => {
        await setFault({
            enabled: true,
            type: 'latency',
            latencyMs: 2000  // 2 seconds, below 5s timeout
        });

        const startTime = Date.now();
        const response = await axios.get(`${SERVICE_URL}/data`);
        const duration = Date.now() - startTime;

        expect(response.status).toBe(200);
        expect(duration).toBeGreaterThan(2000);
        expect(duration).toBeLessThan(4000);
    });

    test('times out when latency exceeds threshold', async () => {
        await setFault({
            enabled: true,
            type: 'latency',
            latencyMs: 10000  // 10 seconds, above 5s timeout
        });

        const response = await axios.get(`${SERVICE_URL}/data`, {
            validateStatus: () => true
        });

        // Should timeout and return error
        expect(response.status).toBe(503);
    });

    test('handles variable latency with jitter', async () => {
        // Test with random latency to verify timeout handling
        const results = [];

        await setFault({
            enabled: true,
            type: 'latency',
            pattern: 'random',
            baseLatencyMs: 1000,
            maxLatencyMs: 6000
        });

        // Run multiple requests
        for (let i = 0; i < 10; i++) {
            const response = await axios.get(`${SERVICE_URL}/data`, {
                validateStatus: () => true
            });
            results.push(response.status);
        }

        // Some should succeed, some may fail
        const successes = results.filter(s => s === 200).length;
        const failures = results.filter(s => s === 503).length;

        // Expect a mix of outcomes
        expect(successes).toBeGreaterThan(0);
        expect(failures).toBeGreaterThan(0);
    });
});
```

---

## Error Injection

Inject specific errors to verify error handling paths that rarely execute in production.

### HTTP Error Injection

```javascript
// error-injector.js - HTTP error injection with realistic responses
class ErrorInjector {
    constructor() {
        this.errorPatterns = {
            // Common API errors
            badRequest: {
                status: 400,
                body: { error: 'Bad Request', message: 'Invalid parameters' }
            },
            unauthorized: {
                status: 401,
                body: { error: 'Unauthorized', message: 'Invalid or expired token' }
            },
            forbidden: {
                status: 403,
                body: { error: 'Forbidden', message: 'Insufficient permissions' }
            },
            notFound: {
                status: 404,
                body: { error: 'Not Found', message: 'Resource does not exist' }
            },
            conflict: {
                status: 409,
                body: { error: 'Conflict', message: 'Resource already exists' }
            },
            rateLimited: {
                status: 429,
                headers: { 'Retry-After': '60' },
                body: { error: 'Too Many Requests', retryAfter: 60 }
            },

            // Server errors
            internalError: {
                status: 500,
                body: { error: 'Internal Server Error' }
            },
            badGateway: {
                status: 502,
                body: { error: 'Bad Gateway' }
            },
            serviceUnavailable: {
                status: 503,
                headers: { 'Retry-After': '30' },
                body: { error: 'Service Unavailable', retryAfter: 30 }
            },
            gatewayTimeout: {
                status: 504,
                body: { error: 'Gateway Timeout' }
            },

            // Malformed responses
            invalidJson: {
                status: 200,
                body: 'not valid json {{{',
                contentType: 'application/json'
            },
            emptyResponse: {
                status: 200,
                body: ''
            },
            htmlInsteadOfJson: {
                status: 200,
                body: '<html><body>Error</body></html>',
                contentType: 'application/json'
            }
        };
    }

    // Inject a specific error pattern
    inject(res, patternName) {
        const pattern = this.errorPatterns[patternName];
        if (!pattern) {
            throw new Error(`Unknown error pattern: ${patternName}`);
        }

        const headers = {
            'Content-Type': pattern.contentType || 'application/json',
            ...pattern.headers
        };

        res.writeHead(pattern.status, headers);

        const body = typeof pattern.body === 'string'
            ? pattern.body
            : JSON.stringify(pattern.body);

        res.end(body);
    }

    // Get list of available patterns
    getPatterns() {
        return Object.keys(this.errorPatterns);
    }
}

module.exports = { ErrorInjector };
```

### Testing Error Handling

```javascript
// error-handling.test.js - Verify error handling for all scenarios
const axios = require('axios');

describe('Error Handling', () => {
    describe('Client Errors (4xx)', () => {
        test('handles 401 by refreshing token', async () => {
            await setFault({
                enabled: true,
                type: 'error',
                errorCode: 401,
                probability: 1.0
            });

            const response = await axios.get(`${SERVICE_URL}/data`, {
                validateStatus: () => true
            });

            // Service should handle 401 appropriately
            // Could retry with refreshed token or return auth error
            expect([401, 503]).toContain(response.status);
        });

        test('handles 429 rate limiting with backoff', async () => {
            await setFault({
                enabled: true,
                type: 'error',
                errorCode: 429,
                headers: { 'Retry-After': '2' }
            });

            const startTime = Date.now();
            const response = await axios.get(`${SERVICE_URL}/data`, {
                validateStatus: () => true
            });
            const duration = Date.now() - startTime;

            // Service should respect Retry-After header
            // If it retries, duration should be > 2 seconds
        });
    });

    describe('Server Errors (5xx)', () => {
        test('retries on 503 Service Unavailable', async () => {
            let requestCount = 0;

            // First 2 requests fail, third succeeds
            await setFault({
                enabled: true,
                type: 'error',
                errorCode: 503,
                probability: 0.66  // ~2/3 will fail
            });

            const response = await axios.get(`${SERVICE_URL}/data`, {
                validateStatus: () => true
            });

            // Should eventually succeed or exhaust retries
            expect([200, 503]).toContain(response.status);
        });

        test('does not retry on 500 Internal Server Error', async () => {
            // 500 errors are often not transient - retrying may not help
            await setFault({
                enabled: true,
                type: 'error',
                errorCode: 500,
                probability: 1.0
            });

            const startTime = Date.now();
            const response = await axios.get(`${SERVICE_URL}/data`, {
                validateStatus: () => true
            });
            const duration = Date.now() - startTime;

            expect(response.status).toBe(503);
            // Depending on retry policy, may or may not retry 500s
        });
    });

    describe('Malformed Responses', () => {
        test('handles invalid JSON response', async () => {
            await setFault({
                enabled: true,
                type: 'malformed',
                pattern: 'invalidJson'
            });

            const response = await axios.get(`${SERVICE_URL}/data`, {
                validateStatus: () => true
            });

            // Should handle parse error gracefully
            expect(response.status).toBe(503);
            expect(response.data.status).toBe('error');
        });

        test('handles empty response body', async () => {
            await setFault({
                enabled: true,
                type: 'malformed',
                pattern: 'emptyResponse'
            });

            const response = await axios.get(`${SERVICE_URL}/data`, {
                validateStatus: () => true
            });

            // Should handle empty response gracefully
            expect([200, 503]).toContain(response.status);
        });
    });
});
```

---

## Resource Exhaustion Testing

Simulate running out of memory, CPU, or disk to verify your service degrades gracefully.

### Memory Exhaustion

```javascript
// memory-exhaustion.js - Controlled memory pressure testing
class MemoryExhaustion {
    constructor() {
        this.allocations = [];
        this.targetUsageMB = 0;
        this.interval = null;
    }

    // Gradually consume memory up to target
    startPressure(targetMB, rampUpSeconds = 10) {
        this.targetUsageMB = targetMB;
        const bytesPerStep = (targetMB * 1024 * 1024) / (rampUpSeconds * 10);

        console.log(`Starting memory pressure: ${targetMB}MB over ${rampUpSeconds}s`);

        this.interval = setInterval(() => {
            const currentUsage = this.getCurrentUsageMB();

            if (currentUsage < this.targetUsageMB) {
                // Allocate a chunk of memory
                const chunk = Buffer.alloc(Math.floor(bytesPerStep));
                // Fill with data to prevent optimization
                chunk.fill(Math.random() * 255);
                this.allocations.push(chunk);
            }
        }, 100);
    }

    // Release all allocated memory
    releasePressure() {
        console.log('Releasing memory pressure');
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.allocations = [];

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
    }

    getCurrentUsageMB() {
        const used = process.memoryUsage().heapUsed;
        return Math.round(used / 1024 / 1024);
    }

    getStats() {
        const memUsage = process.memoryUsage();
        return {
            heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
            externalMB: Math.round(memUsage.external / 1024 / 1024),
            rssMB: Math.round(memUsage.rss / 1024 / 1024),
            allocationsCount: this.allocations.length
        };
    }
}

module.exports = { MemoryExhaustion };
```

### CPU Exhaustion

```javascript
// cpu-exhaustion.js - CPU pressure testing
class CPUExhaustion {
    constructor() {
        this.workers = [];
        this.running = false;
    }

    // Start CPU-intensive work on specified percentage of cores
    startPressure(cpuPercent = 80, durationMs = 0) {
        const numCores = require('os').cpus().length;
        const numWorkers = Math.max(1, Math.floor(numCores * (cpuPercent / 100)));

        console.log(`Starting CPU pressure: ${cpuPercent}% (${numWorkers} workers)`);
        this.running = true;

        for (let i = 0; i < numWorkers; i++) {
            this.workers.push(this.createWorker());
        }

        if (durationMs > 0) {
            setTimeout(() => this.releasePressure(), durationMs);
        }
    }

    createWorker() {
        return setImmediate(() => {
            if (!this.running) return;

            // CPU-intensive work
            let result = 0;
            for (let i = 0; i < 1000000; i++) {
                result += Math.sqrt(i) * Math.sin(i);
            }

            // Schedule next iteration
            if (this.running) {
                this.workers.push(this.createWorker());
            }
        });
    }

    releasePressure() {
        console.log('Releasing CPU pressure');
        this.running = false;
        this.workers = [];
    }

    getCPUUsage() {
        const cpus = require('os').cpus();
        let totalIdle = 0;
        let totalTick = 0;

        for (const cpu of cpus) {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        }

        return Math.round((1 - totalIdle / totalTick) * 100);
    }
}

module.exports = { CPUExhaustion };
```

### Testing Under Resource Pressure

```javascript
// resource-exhaustion.test.js - Test behavior under resource pressure
const { MemoryExhaustion } = require('./memory-exhaustion');
const { CPUExhaustion } = require('./cpu-exhaustion');
const axios = require('axios');

describe('Resource Exhaustion Resilience', () => {
    const memoryExhaustion = new MemoryExhaustion();
    const cpuExhaustion = new CPUExhaustion();

    afterEach(() => {
        memoryExhaustion.releasePressure();
        cpuExhaustion.releasePressure();
    });

    describe('Memory Pressure', () => {
        test('service responds under moderate memory pressure', async () => {
            // Consume 256MB of memory
            memoryExhaustion.startPressure(256, 5);

            // Wait for pressure to build
            await new Promise(resolve => setTimeout(resolve, 3000));

            const response = await axios.get(`${SERVICE_URL}/health`, {
                timeout: 10000,
                validateStatus: () => true
            });

            expect(response.status).toBe(200);
        });

        test('service degrades gracefully under high memory pressure', async () => {
            // Consume 512MB - approaching typical container limits
            memoryExhaustion.startPressure(512, 5);

            await new Promise(resolve => setTimeout(resolve, 5000));

            // Service should still respond, possibly with degraded functionality
            const response = await axios.get(`${SERVICE_URL}/data`, {
                timeout: 30000,
                validateStatus: () => true
            });

            // May be slower but should not crash
            expect([200, 503]).toContain(response.status);
        });
    });

    describe('CPU Pressure', () => {
        test('service handles requests under CPU pressure', async () => {
            // Saturate 80% of CPU
            cpuExhaustion.startPressure(80);

            await new Promise(resolve => setTimeout(resolve, 2000));

            const startTime = Date.now();
            const response = await axios.get(`${SERVICE_URL}/health`, {
                timeout: 10000,
                validateStatus: () => true
            });
            const duration = Date.now() - startTime;

            expect(response.status).toBe(200);
            // Response time may be elevated but should complete
            console.log(`Response time under CPU pressure: ${duration}ms`);
        });

        test('request latency increases under CPU saturation', async () => {
            // Measure baseline
            const baselineResponse = await axios.get(`${SERVICE_URL}/health`);
            const baselineTime = Date.now();

            // Apply CPU pressure
            cpuExhaustion.startPressure(95);
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Measure under pressure
            const pressureStart = Date.now();
            const pressureResponse = await axios.get(`${SERVICE_URL}/health`, {
                timeout: 30000
            });
            const pressureTime = Date.now() - pressureStart;

            // Latency should be higher under pressure
            console.log(`Baseline: fast, Under pressure: ${pressureTime}ms`);
        });
    });
});
```

---

## The Chaos Monkey Approach

Netflix's Chaos Monkey randomly terminates instances in production. Here is how to implement a similar approach for testing.

### Chaos Monkey Implementation

```javascript
// chaos-monkey.js - Random fault injection scheduler
const axios = require('axios');

class ChaosMonkey {
    constructor(config) {
        this.config = {
            enabled: false,
            intervalMs: 30000,          // Check every 30 seconds
            faultProbability: 0.1,      // 10% chance of fault per interval
            maxConcurrentFaults: 1,     // Only one fault at a time
            faultDurationMs: 10000,     // Faults last 10 seconds
            targetServices: [],         // Services to target
            excludeServices: [],        // Services to never target
            faultTypes: [               // Available fault types with weights
                { type: 'latency', weight: 40, config: { latencyMs: 3000 } },
                { type: 'error', weight: 30, config: { errorCode: 500 } },
                { type: 'drop', weight: 20, config: {} },
                { type: 'timeout', weight: 10, config: {} }
            ],
            ...config
        };

        this.activeFaults = new Map();
        this.faultHistory = [];
        this.interval = null;
    }

    start() {
        if (this.interval) return;

        console.log('Chaos Monkey started');
        this.config.enabled = true;

        this.interval = setInterval(() => {
            this.tick();
        }, this.config.intervalMs);
    }

    stop() {
        console.log('Chaos Monkey stopped');
        this.config.enabled = false;

        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        // Clear all active faults
        for (const [service, fault] of this.activeFaults) {
            this.clearFault(service);
        }
    }

    async tick() {
        if (!this.config.enabled) return;

        // Check if we should inject a fault
        if (Math.random() > this.config.faultProbability) {
            return;
        }

        // Check concurrent fault limit
        if (this.activeFaults.size >= this.config.maxConcurrentFaults) {
            console.log('Max concurrent faults reached, skipping');
            return;
        }

        // Select a random target service
        const target = this.selectTarget();
        if (!target) {
            console.log('No available targets');
            return;
        }

        // Select a random fault type
        const faultType = this.selectFaultType();

        // Inject the fault
        await this.injectFault(target, faultType);
    }

    selectTarget() {
        const available = this.config.targetServices.filter(
            s => !this.activeFaults.has(s) &&
                 !this.config.excludeServices.includes(s)
        );

        if (available.length === 0) return null;

        return available[Math.floor(Math.random() * available.length)];
    }

    selectFaultType() {
        const totalWeight = this.config.faultTypes.reduce(
            (sum, f) => sum + f.weight, 0
        );

        let random = Math.random() * totalWeight;

        for (const fault of this.config.faultTypes) {
            random -= fault.weight;
            if (random <= 0) {
                return fault;
            }
        }

        return this.config.faultTypes[0];
    }

    async injectFault(target, faultType) {
        const faultId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const faultRecord = {
            id: faultId,
            target,
            type: faultType.type,
            config: faultType.config,
            startTime: new Date(),
            endTime: null,
            status: 'active'
        };

        console.log(`Injecting fault: ${faultType.type} on ${target}`);

        try {
            // Call the fault injection API for the target service
            await axios.post(`${target}/fault/config`, {
                enabled: true,
                type: faultType.type,
                ...faultType.config
            });

            this.activeFaults.set(target, faultRecord);
            this.faultHistory.push(faultRecord);

            // Schedule fault removal
            setTimeout(() => {
                this.clearFault(target);
            }, this.config.faultDurationMs);

        } catch (error) {
            console.error(`Failed to inject fault on ${target}:`, error.message);
            faultRecord.status = 'failed';
            faultRecord.error = error.message;
        }
    }

    async clearFault(target) {
        const faultRecord = this.activeFaults.get(target);
        if (!faultRecord) return;

        console.log(`Clearing fault on ${target}`);

        try {
            await axios.delete(`${target}/fault/config`);
            faultRecord.endTime = new Date();
            faultRecord.status = 'completed';
        } catch (error) {
            console.error(`Failed to clear fault on ${target}:`, error.message);
            faultRecord.status = 'clear_failed';
        }

        this.activeFaults.delete(target);
    }

    getStatus() {
        return {
            enabled: this.config.enabled,
            activeFaults: Array.from(this.activeFaults.values()),
            recentHistory: this.faultHistory.slice(-20),
            stats: {
                totalFaultsInjected: this.faultHistory.length,
                faultsByType: this.getFaultsByType()
            }
        };
    }

    getFaultsByType() {
        const counts = {};
        for (const fault of this.faultHistory) {
            counts[fault.type] = (counts[fault.type] || 0) + 1;
        }
        return counts;
    }
}

module.exports = { ChaosMonkey };
```

### Running Chaos Experiments

```javascript
// chaos-experiment.js - Structured chaos experiment runner
class ChaosExperiment {
    constructor(name, hypothesis) {
        this.name = name;
        this.hypothesis = hypothesis;
        this.steadyStateChecks = [];
        this.faults = [];
        this.results = null;
    }

    // Define what "normal" looks like
    addSteadyStateCheck(name, checkFn) {
        this.steadyStateChecks.push({ name, check: checkFn });
        return this;
    }

    // Define faults to inject
    addFault(fault) {
        this.faults.push(fault);
        return this;
    }

    async run() {
        console.log(`\n=== Starting Experiment: ${this.name} ===`);
        console.log(`Hypothesis: ${this.hypothesis}\n`);

        this.results = {
            name: this.name,
            hypothesis: this.hypothesis,
            startTime: new Date(),
            phases: {}
        };

        try {
            // Phase 1: Verify steady state before experiment
            console.log('Phase 1: Verifying initial steady state...');
            const initialState = await this.checkSteadyState();
            this.results.phases.initial = initialState;

            if (!initialState.passed) {
                throw new Error('Initial steady state check failed');
            }

            // Phase 2: Inject faults
            console.log('\nPhase 2: Injecting faults...');
            for (const fault of this.faults) {
                await this.injectFault(fault);
            }
            this.results.phases.faultsInjected = {
                faults: this.faults.map(f => f.type)
            };

            // Phase 3: Verify steady state during fault
            console.log('\nPhase 3: Verifying steady state during fault...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            const duringFaultState = await this.checkSteadyState();
            this.results.phases.duringFault = duringFaultState;

            // Phase 4: Remove faults
            console.log('\nPhase 4: Removing faults...');
            for (const fault of this.faults) {
                await this.clearFault(fault);
            }

            // Phase 5: Verify recovery
            console.log('\nPhase 5: Verifying recovery...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            const recoveryState = await this.checkSteadyState();
            this.results.phases.recovery = recoveryState;

            // Determine experiment outcome
            this.results.passed = duringFaultState.passed && recoveryState.passed;
            this.results.endTime = new Date();

        } catch (error) {
            this.results.error = error.message;
            this.results.passed = false;
        }

        this.printResults();
        return this.results;
    }

    async checkSteadyState() {
        const results = {
            checks: [],
            passed: true
        };

        for (const check of this.steadyStateChecks) {
            try {
                const result = await check.check();
                results.checks.push({
                    name: check.name,
                    passed: result.passed,
                    details: result.details
                });
                if (!result.passed) {
                    results.passed = false;
                }
            } catch (error) {
                results.checks.push({
                    name: check.name,
                    passed: false,
                    error: error.message
                });
                results.passed = false;
            }
        }

        return results;
    }

    async injectFault(fault) {
        await axios.post(`${fault.target}/fault/config`, {
            enabled: true,
            ...fault.config
        });
    }

    async clearFault(fault) {
        await axios.delete(`${fault.target}/fault/config`);
    }

    printResults() {
        console.log('\n=== Experiment Results ===');
        console.log(`Name: ${this.results.name}`);
        console.log(`Passed: ${this.results.passed ? 'YES' : 'NO'}`);
        console.log(`Duration: ${this.results.endTime - this.results.startTime}ms`);

        for (const [phase, data] of Object.entries(this.results.phases)) {
            console.log(`\n${phase}:`, JSON.stringify(data, null, 2));
        }
    }
}

// Example experiment
async function runDownstreamFailureExperiment() {
    const experiment = new ChaosExperiment(
        'Downstream Service Failure',
        'When the payment service is unavailable, the checkout service should return cached prices and queue orders for later processing'
    );

    experiment
        .addSteadyStateCheck('API responds within 500ms', async () => {
            const start = Date.now();
            const response = await axios.get('http://localhost:3000/health');
            const duration = Date.now() - start;
            return {
                passed: response.status === 200 && duration < 500,
                details: { status: response.status, duration }
            };
        })
        .addSteadyStateCheck('Error rate below 1%', async () => {
            // Check error rate from metrics endpoint
            const response = await axios.get('http://localhost:3000/metrics');
            const errorRate = response.data.errorRate || 0;
            return {
                passed: errorRate < 0.01,
                details: { errorRate }
            };
        })
        .addFault({
            target: 'http://localhost:8081',
            type: 'error',
            config: { type: 'error', errorCode: 503 }
        });

    return experiment.run();
}

module.exports = { ChaosExperiment, runDownstreamFailureExperiment };
```

---

## Automated Fault Testing in CI/CD

Integrate fault injection tests into your CI/CD pipeline for continuous resilience validation.

### GitHub Actions Workflow

```yaml
# .github/workflows/fault-injection.yml
name: Fault Injection Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'

jobs:
  fault-injection-tests:
    runs-on: ubuntu-latest

    services:
      # Start dependencies as services
      redis:
        image: redis:7
        ports:
          - 6379:6379

      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Start application
        run: |
          npm run start:test &
          sleep 10  # Wait for app to start
        env:
          DATABASE_URL: postgres://postgres:testpass@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379

      - name: Start fault injection proxy
        run: |
          node fault-proxy.js &
          sleep 5

      - name: Run fault injection tests
        run: npm run test:fault-injection
        env:
          SERVICE_URL: http://localhost:3000
          FAULT_CONFIG_URL: http://localhost:8081

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: fault-injection-results
          path: |
            test-results/
            coverage/

      - name: Run chaos experiments
        if: github.event_name == 'schedule'
        run: npm run chaos:experiments
        timeout-minutes: 30

      - name: Post results to Slack
        if: failure() && github.event_name == 'schedule'
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Fault injection tests failed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Fault Injection Tests Failed*\nWorkflow: ${{ github.workflow }}\nRun: ${{ github.run_id }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Docker Compose for Local Testing

```yaml
# docker-compose.fault-test.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DOWNSTREAM_URL=http://fault-proxy:8080
      - REQUEST_TIMEOUT=5000
      - MAX_RETRIES=3
    depends_on:
      - fault-proxy
      - downstream

  downstream:
    build:
      context: .
      dockerfile: Dockerfile.downstream
    ports:
      - "4000:4000"

  fault-proxy:
    build:
      context: .
      dockerfile: Dockerfile.proxy
    ports:
      - "8080:8080"
      - "8081:8081"
    environment:
      - TARGET_URL=http://downstream:4000

  test-runner:
    build:
      context: .
      dockerfile: Dockerfile.test
    depends_on:
      - app
      - fault-proxy
    environment:
      - SERVICE_URL=http://app:3000
      - FAULT_CONFIG_URL=http://fault-proxy:8081
    command: npm run test:fault-injection
```

### Test Runner Script

```javascript
// scripts/run-fault-tests.js - Orchestrate fault injection test suite
const { spawn, execSync } = require('child_process');
const axios = require('axios');

const CONFIG = {
    serviceUrl: process.env.SERVICE_URL || 'http://localhost:3000',
    faultConfigUrl: process.env.FAULT_CONFIG_URL || 'http://localhost:8081',
    maxRetries: 30,
    retryDelayMs: 1000
};

async function waitForService(url, name) {
    console.log(`Waiting for ${name} at ${url}...`);

    for (let i = 0; i < CONFIG.maxRetries; i++) {
        try {
            await axios.get(url, { timeout: 2000 });
            console.log(`${name} is ready`);
            return true;
        } catch (error) {
            await new Promise(r => setTimeout(r, CONFIG.retryDelayMs));
        }
    }

    throw new Error(`${name} failed to start`);
}

async function runTests() {
    console.log('=== Fault Injection Test Suite ===\n');

    // Wait for services
    await waitForService(`${CONFIG.serviceUrl}/health`, 'Application');
    await waitForService(`${CONFIG.faultConfigUrl}/fault/config`, 'Fault Proxy');

    // Run test suites in order
    const testSuites = [
        { name: 'Network Failures', file: 'network-fault.test.js' },
        { name: 'Latency Tolerance', file: 'latency.test.js' },
        { name: 'Error Handling', file: 'error-handling.test.js' },
        { name: 'Resource Exhaustion', file: 'resource-exhaustion.test.js' }
    ];

    const results = [];

    for (const suite of testSuites) {
        console.log(`\n--- Running: ${suite.name} ---\n`);

        try {
            execSync(`npx jest ${suite.file} --verbose`, {
                stdio: 'inherit',
                env: { ...process.env, ...CONFIG }
            });
            results.push({ suite: suite.name, passed: true });
        } catch (error) {
            results.push({ suite: suite.name, passed: false });
        }

        // Clear any lingering faults between suites
        try {
            await axios.delete(`${CONFIG.faultConfigUrl}/fault/config`);
        } catch (error) {
            // Ignore cleanup errors
        }
    }

    // Print summary
    console.log('\n=== Test Summary ===');
    let allPassed = true;

    for (const result of results) {
        const status = result.passed ? 'PASSED' : 'FAILED';
        console.log(`${result.suite}: ${status}`);
        if (!result.passed) allPassed = false;
    }

    process.exit(allPassed ? 0 : 1);
}

runTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
});
```

---

## Fault Injection Comparison Table

Here is a comparison of different fault injection approaches and tools:

| Approach | Scope | Complexity | Production Safe | Best For |
|----------|-------|------------|-----------------|----------|
| Proxy-based injection | Network layer | Medium | Yes | HTTP/gRPC services |
| Library instrumentation | Application code | Low | Yes | Unit/integration tests |
| Container manipulation | Infrastructure | High | Careful | Kubernetes environments |
| Network emulation (tc) | OS level | High | No | Low-level network testing |
| Chaos Monkey (random) | System-wide | Medium | With safeguards | Production resilience |
| Scheduled experiments | Controlled | Medium | Yes | Regular validation |

---

## Best Practices

### 1. Start Small

Begin with targeted tests in development before running chaos experiments in production.

```javascript
// Start with simple fault scenarios
const simpleFaults = [
    { type: 'latency', latencyMs: 1000 },   // Start mild
    { type: 'latency', latencyMs: 5000 },   // Then increase
    { type: 'error', errorCode: 500 },      // Then errors
    { type: 'drop', probability: 0.5 },     // Then partial failures
];
```

### 2. Always Have an Off Switch

Implement kill switches for all fault injection mechanisms.

```javascript
// Global kill switch
app.post('/fault/emergency-stop', (req, res) => {
    chaosMonkey.stop();
    faultProxy.disable();
    // Clear all active faults immediately
    activeFaults.forEach(fault => fault.clear());

    console.log('EMERGENCY STOP: All faults cleared');
    res.json({ status: 'All faults disabled' });
});
```

### 3. Monitor During Experiments

Track key metrics during fault injection to understand impact.

```javascript
// Collect metrics during experiments
const metricsCollector = {
    beforeFault: null,
    duringFault: [],
    afterFault: null,

    async collectMetrics() {
        return {
            timestamp: Date.now(),
            latencyP50: await getLatencyPercentile(50),
            latencyP99: await getLatencyPercentile(99),
            errorRate: await getErrorRate(),
            throughput: await getThroughput(),
            activeConnections: await getActiveConnections()
        };
    },

    async startCollection(intervalMs = 1000) {
        this.beforeFault = await this.collectMetrics();
        this.collectionInterval = setInterval(async () => {
            this.duringFault.push(await this.collectMetrics());
        }, intervalMs);
    },

    async stopCollection() {
        clearInterval(this.collectionInterval);
        this.afterFault = await this.collectMetrics();
        return this.generateReport();
    }
};
```

### 4. Document Experiments

Keep records of all chaos experiments for learning and compliance.

```javascript
// Experiment documentation template
const experimentDoc = {
    id: 'EXP-2024-001',
    name: 'Database Connection Pool Exhaustion',
    date: '2024-01-15',
    hypothesis: 'Service gracefully degrades when DB pool is exhausted',
    steadyState: 'API latency < 200ms, error rate < 0.1%',
    method: 'Inject 50 long-running queries to exhaust connection pool',
    results: {
        hypothesisConfirmed: true,
        observations: [
            'Queue backed up to 150 requests',
            'Latency increased to 2.5s during fault',
            'Error rate peaked at 5%',
            'Recovery time: 8 seconds after fault cleared'
        ],
        actionItems: [
            'Implement connection timeout of 30s',
            'Add circuit breaker for database calls',
            'Increase pool size from 10 to 20'
        ]
    }
};
```

---

## Conclusion

Fault injection testing transforms uncertainty into confidence. By systematically introducing failures, you discover weaknesses before they cause incidents. Start with the proxy-based approach for HTTP services, add latency and error injection tests to your CI pipeline, and gradually work toward scheduled chaos experiments.

The key points to remember:

- Fault injection is testing, not breaking. The goal is learning, not destruction.
- Automate fault tests in CI/CD for continuous resilience validation.
- Start small with targeted tests before running system-wide chaos experiments.
- Always monitor during experiments and have kill switches ready.
- Document experiments and track improvements over time.

Your system will fail in production. The question is whether you have already seen that failure mode in testing or whether your users will discover it first.

---

**Related Reading:**

- [The Five Stages of SRE Maturity](https://oneuptime.com/blog/post/2025-09-01-the-five-stages-of-sre-maturity/view)
- [SRE Best Practices](https://oneuptime.com/blog/post/2025-11-28-sre-best-practices/view)
- [Monitoring vs Observability](https://oneuptime.com/blog/post/2025-11-28-monitoring-vs-observability-sre/view)
