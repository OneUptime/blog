# How to Enable Diagnostic Logging in the OpenTelemetry JavaScript SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, JavaScript, Diagnostic Logging, Debugging, SDK, Node.js, Troubleshooting

Description: Learn how to enable and configure diagnostic logging in the OpenTelemetry JavaScript SDK to debug instrumentation issues, export failures, and SDK internals.

---

When something goes wrong with your OpenTelemetry setup in a JavaScript or Node.js application, the SDK stays frustratingly quiet by default. Spans go missing, exporters fail silently, and instrumentations do not patch libraries correctly, all without a single log message to help you figure out what happened. The OpenTelemetry JavaScript SDK has a built-in diagnostic logging system that can surface all of this information, but you need to explicitly enable it.

This guide covers how to turn on diagnostic logging, configure different log levels, build custom loggers, and use the output to track down real problems.

## The Diagnostic API

OpenTelemetry's diagnostic logging lives in the `@opentelemetry/api` package. It is separate from the tracing, metrics, and logging signal APIs. The diagnostic system is specifically for the SDK's own internal messages, things like "I just patched the express module" or "I failed to export 50 spans because the endpoint returned a 503."

The key components are:

- `diag`: The global diagnostic logger access point
- `DiagConsoleLogger`: A built-in logger that writes to `console.log`, `console.warn`, and `console.error`
- `DiagLogLevel`: An enum that controls which messages are shown

## Basic Setup

The simplest way to enable diagnostic logging is to set the console logger at your desired level:

```javascript
// Import the diagnostic utilities from the API package
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');

// Enable diagnostic logging BEFORE initializing the SDK
// This ensures you capture messages from SDK setup, not just runtime
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

// Now initialize your SDK as usual
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log('SDK started with diagnostic logging enabled');
```

The order matters. You must call `diag.setLogger()` before creating the SDK instance. Many important diagnostic messages are emitted during SDK initialization, such as which instrumentations are being registered and whether exporters can reach their endpoints. If you set the logger after initialization, you miss all of that.

## Understanding Log Levels

The `DiagLogLevel` enum provides five levels, each including all messages from levels above it:

```javascript
const { DiagLogLevel } = require('@opentelemetry/api');

// Available log levels from most verbose to least verbose:
// DiagLogLevel.ALL     - Everything, including internal details
// DiagLogLevel.VERBOSE - Highly detailed diagnostic information
// DiagLogLevel.DEBUG   - Debug information useful for troubleshooting
// DiagLogLevel.INFO    - General informational messages
// DiagLogLevel.WARN    - Warning messages about potential issues
// DiagLogLevel.ERROR   - Error messages about actual failures
// DiagLogLevel.NONE    - Disables all diagnostic output
```

For general troubleshooting, `DEBUG` is usually the right choice. It shows you enough detail to diagnose most problems without flooding your terminal with the extremely granular output that `VERBOSE` and `ALL` produce.

Here is what you can expect at each level:

```javascript
// ERROR level: Only critical failures
// Example output: "Failed to export spans: connect ECONNREFUSED 127.0.0.1:4318"
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

// WARN level: Adds warnings about degraded behavior
// Example output: "BatchSpanProcessor dropped 100 spans due to buffer overflow"
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

// INFO level: Adds general lifecycle events
// Example output: "Registered instrumentation: @opentelemetry/instrumentation-http"
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

// DEBUG level: Adds detailed troubleshooting info
// Example output: "Patching http.request function"
// Example output: "Exporting 25 spans to http://localhost:4318/v1/traces"
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
```

## Building a Custom Logger

The `DiagConsoleLogger` works fine for quick debugging, but for production environments or more structured debugging sessions, you probably want a custom logger that integrates with your existing logging infrastructure.

A diagnostic logger is just an object that implements the `DiagLogger` interface, which has five methods: `error`, `warn`, `info`, `debug`, and `verbose`.

```javascript
const { diag, DiagLogLevel } = require('@opentelemetry/api');

// Custom logger that adds timestamps and prefixes for easy filtering
// You can adapt this to write to files, send to a logging service, etc.
const customLogger = {
  error: (message, ...args) => {
    console.error(`[${new Date().toISOString()}] [OTEL:ERROR] ${message}`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`[${new Date().toISOString()}] [OTEL:WARN] ${message}`, ...args);
  },
  info: (message, ...args) => {
    console.info(`[${new Date().toISOString()}] [OTEL:INFO] ${message}`, ...args);
  },
  debug: (message, ...args) => {
    console.debug(`[${new Date().toISOString()}] [OTEL:DEBUG] ${message}`, ...args);
  },
  verbose: (message, ...args) => {
    console.log(`[${new Date().toISOString()}] [OTEL:VERBOSE] ${message}`, ...args);
  },
};

diag.setLogger(customLogger, DiagLogLevel.DEBUG);
```

For production use, you might want a logger that writes to a file so the diagnostic output does not mix with your application logs:

```javascript
const fs = require('fs');
const path = require('path');
const { diag, DiagLogLevel } = require('@opentelemetry/api');

// File-based diagnostic logger for production debugging
// Writes OpenTelemetry diagnostic output to a separate log file
const logStream = fs.createWriteStream(
  path.join(__dirname, 'otel-diagnostics.log'),
  { flags: 'a' } // Append mode so logs persist across restarts
);

const fileLogger = {
  error: (message, ...args) => {
    logStream.write(`[ERROR] ${new Date().toISOString()} ${message} ${args.join(' ')}\n`);
  },
  warn: (message, ...args) => {
    logStream.write(`[WARN] ${new Date().toISOString()} ${message} ${args.join(' ')}\n`);
  },
  info: (message, ...args) => {
    logStream.write(`[INFO] ${new Date().toISOString()} ${message} ${args.join(' ')}\n`);
  },
  debug: (message, ...args) => {
    logStream.write(`[DEBUG] ${new Date().toISOString()} ${message} ${args.join(' ')}\n`);
  },
  verbose: (message, ...args) => {
    logStream.write(`[VERBOSE] ${new Date().toISOString()} ${message} ${args.join(' ')}\n`);
  },
};

diag.setLogger(fileLogger, DiagLogLevel.WARN);
```

## Controlling Logging with Environment Variables

You can make diagnostic logging configurable without code changes by reading from environment variables:

```javascript
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');

// Map environment variable values to DiagLogLevel
// This lets you toggle logging levels without redeploying code
const logLevelMap = {
  'all': DiagLogLevel.ALL,
  'verbose': DiagLogLevel.VERBOSE,
  'debug': DiagLogLevel.DEBUG,
  'info': DiagLogLevel.INFO,
  'warn': DiagLogLevel.WARN,
  'error': DiagLogLevel.ERROR,
  'none': DiagLogLevel.NONE,
};

// Read the desired log level from an environment variable
// Default to NONE so diagnostic logging is off unless explicitly enabled
const envLevel = (process.env.OTEL_LOG_LEVEL || 'none').toLowerCase();
const logLevel = logLevelMap[envLevel] || DiagLogLevel.NONE;

if (logLevel !== DiagLogLevel.NONE) {
  diag.setLogger(new DiagConsoleLogger(), logLevel);
  console.log(`OpenTelemetry diagnostic logging enabled at level: ${envLevel}`);
}
```

Now you can enable diagnostic logging by setting an environment variable:

```bash
# Enable debug-level diagnostic logging for a single run
OTEL_LOG_LEVEL=debug node app.js

# Enable only error-level logging in production
OTEL_LOG_LEVEL=error node app.js

# Disable diagnostic logging entirely (the default)
OTEL_LOG_LEVEL=none node app.js
```

## Reading Diagnostic Output Effectively

Diagnostic logging at the DEBUG level generates a lot of output. Here are some patterns to look for when troubleshooting specific issues.

For missing spans, look for patching messages:

```bash
# Filter diagnostic output for instrumentation patching messages
# If you do not see "Applying patch" for a library, it is not being instrumented
node app.js 2>&1 | grep -i "patch"

# Example healthy output:
# [OTEL:DEBUG] Applying instrumentation patch for module http
# [OTEL:DEBUG] Applying instrumentation patch for module express
```

For export failures, look for exporter messages:

```bash
# Filter for export-related messages to see if spans are being sent
node app.js 2>&1 | grep -i "export"

# Example output when exports fail:
# [OTEL:ERROR] Failed to export spans: connect ECONNREFUSED 127.0.0.1:4318
# [OTEL:WARN] BatchSpanProcessor: span export failed, retrying...
```

For sampler issues, look for sampling decisions:

```bash
# Filter for sampling-related messages
node app.js 2>&1 | grep -i "sampl"

# Example output showing spans being dropped by sampler:
# [OTEL:DEBUG] Sampling decision: DROP for trace abc123
```

## Disabling Logging After Debugging

Once you have resolved your issue, remember to disable or reduce the log level of diagnostic logging. DEBUG-level logging adds overhead because every diagnostic message involves string formatting and I/O operations, even when the underlying tracing is working perfectly.

```javascript
const { diag, DiagLogLevel } = require('@opentelemetry/api');

// Disable diagnostic logging entirely for production
diag.setLogger(undefined, DiagLogLevel.NONE);

// Or keep only error-level logging as a safety net
// This has minimal overhead and catches critical failures
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);
```

## Summary

The OpenTelemetry JavaScript SDK's diagnostic logging system is your best tool for understanding what the SDK is doing internally. Enable it with `diag.setLogger()` before initializing the SDK, use `DEBUG` level for troubleshooting, build custom loggers for production environments, and control the level with environment variables so you can turn it on without redeploying. When you are done debugging, scale the logging back to `ERROR` or `NONE` to avoid unnecessary overhead.
