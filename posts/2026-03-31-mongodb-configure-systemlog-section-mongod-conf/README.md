# How to Configure the systemLog Section in mongod.conf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Configuration, Logging, Verbosity, mongod

Description: Learn how to configure the systemLog section in mongod.conf to control log destination, verbosity, format, and rotation for MongoDB server logs.

---

The `systemLog` section in `mongod.conf` controls where MongoDB writes its logs, how verbose those logs are, and how they are formatted. Proper log configuration is essential for debugging operational issues and maintaining an audit trail.

## Basic Structure

```yaml
systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true
  timeStampFormat: iso8601-local
  verbosity: 0
```

## Choosing a Log Destination

MongoDB supports two destinations: `file` and `syslog`. Writing to a file is the most common approach for production deployments.

```yaml
systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true
```

Setting `logAppend: true` preserves previous log content when `mongod` is restarted. Without it, the log file is overwritten on each start.

## Sending Logs to syslog

To integrate with centralized log management, use the `syslog` destination. The `path` field is ignored in this mode.

```yaml
systemLog:
  destination: syslog
  syslogFacility: daemon
```

Logs appear in the system journal and can be forwarded by tools like `rsyslog` or `journald`.

## Setting Verbosity

Verbosity ranges from 0 (default, informational) to 5 (extremely detailed). Increase verbosity only during troubleshooting - it generates significant log volume.

```yaml
systemLog:
  verbosity: 0
  component:
    query:
      verbosity: 1
    replication:
      verbosity: 2
```

Per-component verbosity overrides the global setting. Useful when you need detailed output for a specific subsystem without flooding the entire log.

## Configuring Timestamp Format

```yaml
systemLog:
  timeStampFormat: iso8601-utc
```

`iso8601-utc` produces timestamps like `2026-03-31T10:00:00.000+00:00`, which is easier to parse in log aggregation systems than the default local time format.

## Log Rotation

MongoDB supports log rotation via a signal or admin command. Configure an external tool like `logrotate` to manage log file size.

```text
/var/log/mongodb/mongod.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        mongosh --eval "db.adminCommand({ logRotate: 1 })" > /dev/null 2>&1
    endscript
}
```

After rotation, MongoDB continues writing to the new file without a full restart.

## Verifying Log Configuration

Check the active log path and verbosity at runtime.

```javascript
db.adminCommand({ getLog: "global" })
db.adminCommand({ getCmdLineOpts: 1 }).parsed.systemLog
```

## Summary

The `systemLog` section in `mongod.conf` controls log destination (file or syslog), the log path, append mode, timestamp format, and per-component verbosity. Use `iso8601-utc` timestamps and `logAppend: true` in production. Adjust verbosity per component rather than globally to avoid log noise, and integrate with `logrotate` to manage file growth over time.
