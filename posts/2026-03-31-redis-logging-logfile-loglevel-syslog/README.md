# How to Configure Redis Logging (logfile, loglevel, syslog)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Logging, Configuration, Monitoring

Description: Configure Redis logging by setting log level, output file, and syslog integration to capture the right information for debugging and monitoring.

---

Redis logging is controlled through three main directives in `redis.conf`: `loglevel`, `logfile`, and the syslog settings. Getting these right helps you debug issues without flooding disk with unnecessary output.

## Setting the Log Level

Redis supports four log levels:

- `debug` - Very detailed, useful only during development
- `verbose` - More detail than notice, includes timing info
- `notice` - Default; production-appropriate events
- `warning` - Only critical messages

```text
# redis.conf
loglevel notice
```

To temporarily raise verbosity on a running instance without restart:

```bash
redis-cli CONFIG SET loglevel verbose
redis-cli CONFIG GET loglevel
```

Reset back to notice after debugging:

```bash
redis-cli CONFIG SET loglevel notice
```

## Configuring a Log File

By default Redis logs to stdout. To write logs to a file:

```text
# redis.conf
logfile /var/log/redis/redis-server.log
```

Make sure the directory exists and Redis has write permission:

```bash
sudo mkdir -p /var/log/redis
sudo chown redis:redis /var/log/redis
```

To log to stdout explicitly (useful in Docker containers):

```text
logfile ""
```

Check recent log entries:

```bash
tail -f /var/log/redis/redis-server.log
```

## Rotating Log Files

Use `logrotate` to prevent the log file from growing unbounded:

```text
# /etc/logrotate.d/redis
/var/log/redis/redis-server.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

The `copytruncate` directive copies the log file and then truncates the original in place. This is the recommended approach because Redis does not support signal-based log file reopening, so it must continue writing to the same file descriptor.

## Enabling Syslog Integration

To route Redis logs through syslog instead of a dedicated file:

```text
# redis.conf
syslog-enabled yes
syslog-ident redis
syslog-facility local0
```

The `syslog-ident` is the program name shown in syslog, and `syslog-facility` controls which facility receives the messages (local0 through local7 are common choices).

Verify log entries appear in syslog:

```bash
journalctl -t redis
# or
grep redis /var/log/syslog | tail -20
```

## Example: Production Logging Configuration

A typical production setup combines file logging with notice level:

```text
# redis.conf - production logging
loglevel notice
logfile /var/log/redis/redis-server.log
syslog-enabled no
```

For containerized Redis (such as in Kubernetes), disable the log file and send to stdout so the container runtime can collect it:

```text
loglevel notice
logfile ""
```

Then read logs with:

```bash
kubectl logs deployment/redis -f
# or
docker logs redis-container -f
```

## Interpreting Key Log Messages

Common patterns to watch for:

```text
# Memory warning
WARNING: 32 bit instance detected but no memory limit set.

# Background save completed
Background saving terminated with success

# Replica connected
Replica 192.168.1.10:6380 asks for synchronization
```

Use a log aggregation tool like Loki or CloudWatch to set alerts on warning-level messages in production.

## Summary

Configure Redis logging with `loglevel` (notice for production), `logfile` (a path or empty for stdout), and optional syslog integration via `syslog-enabled`. Use `CONFIG SET loglevel` to temporarily change verbosity on a live instance without restarting. Containerized deployments should log to stdout and rely on the container runtime for log collection.
