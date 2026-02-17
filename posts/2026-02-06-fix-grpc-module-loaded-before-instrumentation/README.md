# How to Fix OpenTelemetry gRPC Instrumentation Warning 'Module @grpc/grpc-js Loaded Before Instrumentation'

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, gRPC, Node.js, Instrumentation

Description: Resolve the warning about grpc-js being loaded before OpenTelemetry instrumentation and restore gRPC span generation.

The `@grpc/grpc-js` module is commonly used both by your application code and by the OpenTelemetry SDK itself (specifically the OTLP gRPC exporter). This creates a chicken-and-egg problem: the SDK needs gRPC to export telemetry, but loading gRPC before the instrumentation hooks are registered means the instrumentation cannot patch it.

## The Specific Problem

When you use the OTLP gRPC exporter, the SDK imports `@grpc/grpc-js` during initialization:

```javascript
// This import chain loads @grpc/grpc-js internally
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
```

If you then also use gRPC in your application:

```javascript
const grpc = require('@grpc/grpc-js');
// This returns the already-cached module - no instrumentation hooks applied
```

The result: gRPC spans from your application's gRPC calls are missing.

## Diagnosing the Issue

Enable debug logging:

```javascript
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
```

You will see:

```
@opentelemetry/instrumentation-grpc Module @grpc/grpc-js has been loaded before
@opentelemetry/instrumentation-grpc can patch it.
```

## Fix 1: Switch to the HTTP Exporter

The simplest fix is to use the OTLP HTTP exporter instead of gRPC. The HTTP exporter does not import `@grpc/grpc-js`, so it does not interfere with gRPC instrumentation:

```javascript
// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

// Use HTTP exporter instead of gRPC exporter
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',  // HTTP port, not gRPC
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

This completely avoids the conflict because the HTTP exporter uses `http` module, not `@grpc/grpc-js`.

## Fix 2: Register Instrumentation Before Creating the Exporter

If you must use the gRPC exporter, register the gRPC instrumentation before the exporter loads `@grpc/grpc-js`:

```javascript
// tracing.js
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { GrpcInstrumentation } = require('@opentelemetry/instrumentation-grpc');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');

// Register gRPC instrumentation hooks FIRST
registerInstrumentations({
  instrumentations: [
    new GrpcInstrumentation(),
    new HttpInstrumentation(),
  ],
});

// NOW load the gRPC exporter (which triggers require('@grpc/grpc-js'))
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { Resource } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

const provider = new NodeTracerProvider({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'grpc-service',
  }),
});

provider.addSpanProcessor(new BatchSpanProcessor(new OTLPTraceExporter()));
provider.register();
```

The key difference is calling `registerInstrumentations` before any import that pulls in `@grpc/grpc-js`.

## Fix 3: Use the Proto Exporter

The `@opentelemetry/exporter-trace-otlp-proto` package uses HTTP with protobuf encoding and does not depend on `@grpc/grpc-js`:

```javascript
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-proto');

const exporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
});
```

This gives you protobuf efficiency without the gRPC dependency conflict.

## Verifying the Fix

After applying any of the fixes above, restart your application with debug logging and confirm you see:

```
@opentelemetry/instrumentation-grpc Applying instrumentation patch for module @grpc/grpc-js
```

Then make a gRPC call and verify that spans appear. A successful gRPC call should produce spans like:

```
grpc.unary/mypackage.MyService/MyMethod    [========] 25ms
```

## Checking for Other Transitive gRPC Imports

The problem is not always the OTLP exporter. Other packages in your dependency tree might import `@grpc/grpc-js` early:

```bash
# Search for packages that depend on @grpc/grpc-js
npm ls @grpc/grpc-js
```

If multiple packages depend on it, the first one that loads wins. Make sure your tracing setup runs before any of them.

## Summary

The gRPC instrumentation conflict arises because the OTLP gRPC exporter and the gRPC instrumentation both need to interact with `@grpc/grpc-js`. The cleanest solution is to use the HTTP exporter, which avoids the conflict entirely. If you need the gRPC exporter, register the instrumentation hooks before creating the exporter instance.
