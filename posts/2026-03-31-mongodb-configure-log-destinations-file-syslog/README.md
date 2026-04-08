# How to Configure Log Destinations (File, Syslog) in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Logging, Syslog, Configuration, Log Destination

Description: Learn how to configure MongoDB to log to a file, syslog, or stdout and how to switch between destinations in different deployment environments.

---

## MongoDB Log Destination Options

MongoDB supports three log destinations controlled by `systemLog.destination` in `mongod.conf`:

- `file` - write to a specific file path (recommended for production)
- `syslog` - send to the system's syslog daemon (useful for centralized log management)
- *(no destination set)* - logs go to stdout (useful for Docker/containers)

## Logging to a File

The most common production configuration:

```yaml
systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true
  logRotate: reopen
  verbosity: 0
```

`logAppend: true` preserves log history across restarts. `logRotate: reopen` tells mongod to close and reopen the log file when it receives `SIGUSR1`, enabling external log rotation tools like `logrotate` to work correctly.

Set up `logrotate` to rotate daily:

```text
/var/log/mongodb/mongod.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        mongosh --quiet --eval "db.adminCommand({ logRotate: 1 })" > /dev/null 2>&1
    endscript
}
```

## Logging to Syslog

On Linux systems using rsyslog or syslog-ng, route MongoDB logs through syslog:

```yaml
systemLog:
  destination: syslog
  syslogFacility: daemon
  verbosity: 0
```

MongoDB will use the `daemon` syslog facility. Valid facilities include `user`, `local0` through `local7`, and `daemon`. Check `/var/log/syslog` or `/var/log/daemon.log` for the output.

Configure rsyslog to forward MongoDB logs to a remote server:

```text
# /etc/rsyslog.d/50-mongodb.conf
:programname, isequal, "mongod" @@log-aggregator.example.com:514
```

## Logging to Stdout (Container Deployments)

For Docker or Kubernetes, omit `destination` to write to stdout:

```yaml
systemLog:
  verbosity: 0
  # No destination = stdout
```

Or launch mongod explicitly without `--logpath`:

```bash
mongod --port 27017 --dbpath /data/db
```

In Kubernetes, stdout logs are captured by the container runtime and available via `kubectl logs`.

## Switching Log Destination at Runtime

Log rotation (but not destination change) can be triggered without restarting:

```javascript
// Rotate the current log file
db.adminCommand({ logRotate: 1 });

// Rotate a specific log type (MongoDB 5.1+)
db.adminCommand({ logRotate: "server" });
```

Changing the `destination` itself requires a `mongod` restart.

## Dual Logging: File and Syslog

MongoDB does not natively support writing to both simultaneously. To achieve dual logging, use syslog and configure a syslog rule to write to a local file:

```text
# /etc/rsyslog.d/50-mongodb.conf
:programname, isequal, "mongod" /var/log/mongodb/mongod.log
:programname, isequal, "mongod" @@central-logs.example.com:514
```

## Verifying Log Configuration

```javascript
// Check current log settings
db.adminCommand({ getCmdLineOpts: 1 }).parsed.systemLog
```

```bash
# Tail the log file to verify output
tail -f /var/log/mongodb/mongod.log | python3 -c "
import sys, json
for line in sys.stdin:
    try:
        d = json.loads(line)
        print(d['t']['\$date'], d['s'], d['c'], d.get('msg',''))
    except: print(line.rstrip())
"
```

## Summary

Configure MongoDB log destination in `mongod.conf` using `destination: file` for production deployments with `logrotate`, `destination: syslog` for centralized Linux log management, or omit destination for containerized environments that capture stdout. Use `logRotate: reopen` to work correctly with external rotation tools, and verify settings with `getCmdLineOpts`. Syslog routing through rsyslog enables forwarding to remote log aggregation platforms without changes to MongoDB configuration.
