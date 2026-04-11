# How to Manage Redis Configuration Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Configuration, DevOps

Description: Learn how to manage Redis configuration files effectively, covering file structure, runtime changes, and persisting settings across restarts.

---

Redis configuration is managed through a primary `redis.conf` file and runtime commands. Understanding how to manage this file properly ensures your Redis instance behaves predictably across environments and restarts.

## Understanding redis.conf Structure

The default configuration file uses a simple key-value format:

```text
# redis.conf
bind 127.0.0.1
port 6379
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
loglevel notice
logfile /var/log/redis/redis.log
```

Locate your configuration file:

```bash
redis-cli CONFIG GET *  # view all current settings
redis-server --version  # check version
find /etc -name "redis.conf" 2>/dev/null
```

## Viewing and Modifying Configuration

Use `CONFIG GET` to read specific settings:

```bash
redis-cli CONFIG GET maxmemory
redis-cli CONFIG GET save
redis-cli CONFIG GET bind
```

Modify settings at runtime with `CONFIG SET`:

```bash
redis-cli CONFIG SET maxmemory 4gb
redis-cli CONFIG SET maxmemory-policy volatile-lru
redis-cli CONFIG SET hz 15
```

## Persisting Runtime Changes

Runtime changes via `CONFIG SET` are lost on restart unless you persist them:

```bash
redis-cli CONFIG REWRITE
```

This updates `redis.conf` with all current runtime settings. Always ensure Redis was started with a config file path:

```bash
redis-server /etc/redis/redis.conf
```

## Environment-Specific Overrides

Use include directives for layered configuration:

```text
# redis.conf (base)
include /etc/redis/base.conf
include /etc/redis/environment.conf
```

Create environment-specific files:

```bash
# /etc/redis/production.conf
maxmemory 8gb
loglevel warning
appendonly yes
```

## Validating Configuration Changes

Start Redis in the foreground to check for configuration errors:

```bash
redis-server /etc/redis/redis.conf --daemonize no --loglevel debug
```

This starts Redis with your configuration and outputs any parsing errors to the terminal. Press Ctrl+C to stop the server once you have verified the configuration loads without errors.

## Backing Up Configuration

Automate configuration backups before changes:

```bash
#!/bin/bash
CONF=/etc/redis/redis.conf
BACKUP_DIR=/etc/redis/backups
DATE=$(date +%Y%m%d-%H%M%S)
cp "$CONF" "$BACKUP_DIR/redis.conf.$DATE"
echo "Backed up to $BACKUP_DIR/redis.conf.$DATE"
```

## Reload Without Full Restart

Redis does not support reloading the configuration file via signals like SIGHUP. To change settings without restarting, use `CONFIG SET` to modify parameters at runtime:

```bash
redis-cli CONFIG SET loglevel warning
redis-cli CONFIG SET hz 15
redis-cli CONFIG REWRITE
```

Not all parameters support runtime changes. Settings like `bind`, `port`, and `tls-port` require a full restart to take effect.

## Summary

Redis configuration management centers on the `redis.conf` file and the `CONFIG GET/SET/REWRITE` commands. Use include directives to layer environment-specific settings, always persist runtime changes with `CONFIG REWRITE`, and automate backups before applying changes to keep your configuration history clean.
