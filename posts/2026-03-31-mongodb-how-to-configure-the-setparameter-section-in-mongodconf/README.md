# How to Configure the setParameter Section in mongod.conf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Configuration, mongod.conf, Parameter, Tuning, Administration

Description: Learn how to configure the setParameter section in mongod.conf to persistently tune MongoDB server behavior including slow op thresholds and connection limits.

---

## Introduction

The `setParameter` section in `mongod.conf` allows you to configure MongoDB server parameters that persist across restarts. While `db.adminCommand({ setParameter: ... })` applies changes only until the next restart, settings in `mongod.conf` are applied at startup and remain in effect permanently.

## setParameter Syntax in mongod.conf

Parameters are listed as key-value pairs under the `setParameter` section:

```yaml
setParameter:
  parameterName: value
  anotherParameter: value
```

## Common setParameter Configurations

### Slow Operation Threshold

Log operations slower than 200ms to the slow query log:

```yaml
setParameter:
  slowOpThresholdMs: 200
```

### Log Verbosity

Increase log detail for debugging (0=default, 5=most verbose):

```yaml
setParameter:
  logLevel: 1
```

### Connection Limit

Set the maximum number of incoming connections. Note that this parameter can also be configured via the `net.maxIncomingConnections` config option, but should only be set in one place to avoid confusion:

```yaml
setParameter:
  maxIncomingConnections: 200
```

### Authentication Mechanisms

Specify allowed SASL authentication mechanisms:

```yaml
setParameter:
  authenticationMechanisms: SCRAM-SHA-256
```

### Fail Point for Testing

Enable fail points in test environments only:

```yaml
setParameter:
  enableTestCommands: 1
```

## Full Example mongod.conf with setParameter

```yaml
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

security:
  authorization: enabled

setParameter:
  slowOpThresholdMs: 300
  logLevel: 0
  authenticationMechanisms: SCRAM-SHA-256
  maxIncomingConnections: 500
```

## Applying Changes

After editing `mongod.conf`, restart mongod to apply changes:

```bash
sudo systemctl restart mongod
```

Verify the parameter took effect:

```javascript
db.adminCommand({ getParameter: 1, slowOpThresholdMs: 1 });
```

## Overriding setParameter at Runtime

Parameters set in `mongod.conf` can still be overridden at runtime with `setParameter`, but those changes are lost on the next restart. Always update `mongod.conf` for permanent changes:

```javascript
// Temporary runtime change
db.adminCommand({ setParameter: 1, slowOpThresholdMs: 100 });
```

## Summary

The `setParameter` section in `mongod.conf` is the correct way to make persistent MongoDB server configuration changes. It supports a wide range of tuning options including slow operation thresholds, log levels, connection limits, and authentication mechanisms. Always pair runtime `setParameter` changes with a corresponding `mongod.conf` update to prevent configuration drift after restarts.
