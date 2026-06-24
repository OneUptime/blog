# How to Fix Prisma Instrumentation Not Generating Spans Because the Preview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Prisma, Node.js, Database Tracing

Description: Enable Prisma database spans in OpenTelemetry by configuring the required tracing preview feature flag in your Prisma schema.

Prisma 4.2.0 through 6.0.x requires an explicit opt-in to enable OpenTelemetry tracing. Without the `tracing` preview feature flag in your Prisma schema and the official Prisma instrumentation package, Prisma queries produce no spans even when OpenTelemetry is installed and configured. In Prisma 6.1.0 and later, tracing is generally available and the preview feature flag is no longer required.

## The Missing Configuration

If you have set up OpenTelemetry and installed the Prisma instrumentation but see no database spans on Prisma versions before 6.1.0, the issue is often the missing preview feature flag.

## Step 1: Enable the Tracing Preview Feature

For Prisma 4.2.0 through 6.0.x, add the `tracing` preview feature to your Prisma schema:

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

This regenerates the Prisma client with tracing support compiled in for older Prisma versions. Without this step, the old client without tracing support is still in use.

## Step 3: Configure the OpenTelemetry Instrumentation

```javascript
// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { PrismaInstrumentation } = require('@prisma/instrumentation');
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

When creating the Prisma client, you do not need to pass a tracing option:

```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// The instrumentation package handles tracing automatically.
// For Prisma versions before 6.1.0, make sure the preview feature is enabled.
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

```text
prisma:client:operation  findMany          [========] 15ms
  prisma:engine:query                     [======]   12ms
    prisma:engine:db_query SELECT ...     [=====]    10ms
```

On Prisma versions before 6.1.0, if you only see `prisma:client:operation` but not `prisma:engine:query`, the preview feature flag may not be set.

## Common Mistakes

### Mistake 1: Forgetting to Regenerate

On Prisma versions before 6.1.0, after adding `previewFeatures = ["tracing"]`, you must run `npx prisma generate`. Simply editing the schema file is not enough.

### Mistake 2: Wrong Package

Make sure you install the correct instrumentation package:

```bash
# Correct

npm install @prisma/instrumentation

# Not a real package - do not confuse it with OpenTelemetry packages
# npm install @opentelemetry/instrumentation-prisma
```

### Mistake 3: Prisma Client Created Before Instrumentation

Like other Node.js libraries, the Prisma client should be created after the OpenTelemetry SDK is initialized:

```javascript
// tracing.js (loaded first via --require)
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { PrismaInstrumentation } = require('@prisma/instrumentation');

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
npm ls @prisma/instrumentation
```

Use compatible versions of `prisma`, `@prisma/client`, and `@prisma/instrumentation`. For Prisma 6.1.0 and later, the Prisma docs recommend using current versions of all three packages; for Prisma 4.2.0 through 6.0.x, keep the `tracing` preview feature enabled.

## What Prisma Spans Look Like

When everything is working, a typical Prisma operation generates these spans:

```text
prisma:client:operation user.findMany    [==============] 25ms
  prisma:client:serialize                [=]               2ms
  prisma:engine:query                    [========]        18ms
    prisma:engine:connection             [=]               3ms
    prisma:engine:db_query SELECT "User"... [======]       12ms
    prisma:engine:serialize              [=]               2ms
```

These spans give you visibility into:
- How long the query took to execute
- How long serialization/deserialization took
- Connection pool wait time
- The actual SQL query (in the `prisma:engine:db_query` span)

## Disabling Prisma Tracing in Production

If you want to disable tracing in a specific environment without removing the preview feature in older Prisma versions, you can configure the instrumentation:

```javascript
const prismaInstrumentation = new PrismaInstrumentation({
  enabled: process.env.ENABLE_PRISMA_TRACING === 'true',
});
```

In older Prisma versions, the preview feature flag in the schema just makes tracing support available. The instrumentation controls whether it is actually active.

Prisma's requirement for an explicit preview feature flag in versions before 6.1.0 was unusual among Node.js libraries, but it ensured that the tracing overhead was only paid by applications that opted in. Remember: for those older versions, add the flag, regenerate the client, and load the instrumentation before creating the Prisma client.
