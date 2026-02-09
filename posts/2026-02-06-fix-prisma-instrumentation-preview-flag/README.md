# How to Fix Prisma Instrumentation Not Generating Spans Because the Preview Feature Flag Is Missing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Prisma, Node.js, Database Tracing

Description: Enable Prisma database spans in OpenTelemetry by configuring the required tracing preview feature flag in your Prisma schema.

Prisma requires an explicit opt-in to enable OpenTelemetry tracing. Without the `tracing` preview feature flag in your Prisma schema and the correct client extension, Prisma queries produce no spans even when `@opentelemetry/instrumentation-prisma` is installed and configured. This is different from most libraries where auto-instrumentation works out of the box.

## The Missing Configuration

If you have set up OpenTelemetry and installed the Prisma instrumentation but see no database spans, the issue is almost certainly the missing preview feature flag.

## Step 1: Enable the Tracing Preview Feature

Add the `tracing` preview feature to your Prisma schema:

```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["tracing"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
}
```

## Step 2: Regenerate the Prisma Client

After adding the preview feature, regenerate the client:

```bash
npx prisma generate
```

This regenerates the Prisma client with tracing support compiled in. Without this step, the old client without tracing support is still in use.

## Step 3: Configure the OpenTelemetry Instrumentation

```javascript
// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { PrismaInstrumentation } = require('@opentelemetry/instrumentation-prisma');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [
    new HttpInstrumentation(),
    new PrismaInstrumentation(),
  ],
});
sdk.start();
```

## Step 4: Initialize Prisma with Tracing Enabled

When creating the Prisma client, you may need to pass the tracing configuration:

```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// For Prisma 5.x+, use the $extends API for tracing
// The instrumentation package handles this automatically
// Just make sure the preview feature is enabled
```

## Verifying Spans Are Generated

Add a console exporter to see the spans:

```javascript
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');

const sdk = new NodeSDK({
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [new PrismaInstrumentation()],
});
sdk.start();
```

Make a Prisma query:

```javascript
const users = await prisma.user.findMany();
```

You should see spans like:

```
prisma:client:operation  findMany   [========] 15ms
  prisma:engine:query    SELECT ... [======]   12ms
```

If you only see `prisma:client:operation` but not `prisma:engine:query`, the preview feature flag is not set.

## Common Mistakes

### Mistake 1: Forgetting to Regenerate

After adding `previewFeatures = ["tracing"]`, you must run `npx prisma generate`. Simply editing the schema file is not enough.

### Mistake 2: Wrong Package

Make sure you install the correct instrumentation package:

```bash
# Correct
npm install @opentelemetry/instrumentation-prisma

# Not a real package - do not confuse with community packages
# npm install opentelemetry-instrumentation-prisma
```

### Mistake 3: Prisma Client Created Before Instrumentation

Like other Node.js libraries, the Prisma client should be created after the OpenTelemetry SDK is initialized:

```javascript
// tracing.js (loaded first via --require)
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { PrismaInstrumentation } = require('@opentelemetry/instrumentation-prisma');

const sdk = new NodeSDK({
  instrumentations: [new PrismaInstrumentation()],
});
sdk.start();
```

```javascript
// app.js (loaded after tracing.js)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();  // Created AFTER instrumentation is active
```

### Mistake 4: Using an Incompatible Prisma Version

Check version compatibility:

```bash
npm ls @prisma/client
npm ls @opentelemetry/instrumentation-prisma
```

The instrumentation package typically supports Prisma 4.x and 5.x. Check the package README for the exact supported versions.

## What Prisma Spans Look Like

When everything is working, a typical Prisma operation generates these spans:

```
prisma:client:operation user.findMany    [==============] 25ms
  prisma:client:serialize                [=]               2ms
  prisma:engine:connection               [=]               3ms
  prisma:engine:query SELECT "User"...     [========]     18ms
  prisma:client:deserialize                        [=]     2ms
```

These spans give you visibility into:
- How long the query took to execute
- How long serialization/deserialization took
- Connection pool wait time
- The actual SQL query (in the query span)

## Disabling the Preview Feature in Production

If you want to disable tracing in a specific environment without removing the preview feature, you can configure the instrumentation:

```javascript
const prismaInstrumentation = new PrismaInstrumentation({
  enabled: process.env.ENABLE_PRISMA_TRACING === 'true',
});
```

The preview feature flag in the schema just makes tracing support available. The instrumentation controls whether it is actually active.

Prisma's requirement for an explicit preview feature flag is unusual among Node.js libraries, but it ensures that the tracing overhead is only paid by applications that opt in. Remember: add the flag, regenerate the client, and load the instrumentation before creating the Prisma client.
