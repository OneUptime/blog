# How to Configure Dapr Logging in JavaScript SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Logging, JavaScript, Node.js, Observability

Description: Learn how to configure and customize logging in the Dapr JavaScript SDK for better observability and debugging of Node.js microservices.

---

## Introduction

Good logging is essential for debugging and monitoring distributed applications. The Dapr JavaScript SDK provides configurable logging options and integrates with popular Node.js logging libraries so you can get structured, actionable log output from your Dapr services.

## Default Logging Behavior

By default, the Dapr JavaScript SDK logs to the console with minimal output. You can control the log level when creating the client or server:

```javascript
const { DaprClient, LogLevel } = require("@dapr/dapr");

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "3500",
  logger: {
    level: LogLevel.Debug,  // Options: Debug, Verbose, Info, Warn, Error
  },
});
```

## Available Log Levels

| Level | Use Case |
|---|---|
| `LogLevel.Debug` | Maximum detail for deep debugging |
| `LogLevel.Verbose` | Development and troubleshooting |
| `LogLevel.Info` | Standard production logging |
| `LogLevel.Warn` | Warnings only |
| `LogLevel.Error` | Errors only |

## Custom Logger Integration with Winston

Use a custom logger to route Dapr SDK logs through Winston:

```javascript
const { DaprClient, LogLevel } = require("@dapr/dapr");
const winston = require("winston");

const winstonLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "dapr-service.log" }),
  ],
});

// Wrap Winston as a Dapr logger
const daprLogger = {
  level: LogLevel.Info,
  service: {
    error: (message) => winstonLogger.error(message),
    warn: (message) => winstonLogger.warn(message),
    info: (message) => winstonLogger.info(message),
    verbose: (message) => winstonLogger.verbose(message),
    debug: (message) => winstonLogger.debug(message),
  },
};

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "3500",
  logger: daprLogger,
});
```

## Configuring DaprServer Logging

Apply the same logger to `DaprServer`:

```javascript
const { DaprServer } = require("@dapr/dapr");

const server = new DaprServer({
  serverHost: "127.0.0.1",
  serverPort: "3001",
  clientOptions: {
    daprHost: "127.0.0.1",
    daprPort: "3501",
    logger: daprLogger,
  },
  logger: daprLogger,
});
```

## Dapr Sidecar Log Level

You can also control the Dapr sidecar's own log level via CLI flags:

```bash
dapr run \
  --app-id my-service \
  --app-port 3000 \
  --log-level debug \
  -- node src/index.js
```

## Structured Logging Best Practices

Combine Dapr SDK logs with application logs in a structured format:

```javascript
const logger = winston.createLogger({
  defaultMeta: { service: "order-service", appId: "order-service" },
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

logger.info("Order created", { orderId: "order-123", userId: "user-42" });
```

## Summary

Configuring logging in the Dapr JavaScript SDK is straightforward - set a log level on the client or server and optionally wire in a custom logger from libraries like Winston or Pino. Structured, centralized logging across both the Dapr SDK and your application code makes it much easier to diagnose issues in a distributed microservices environment.
