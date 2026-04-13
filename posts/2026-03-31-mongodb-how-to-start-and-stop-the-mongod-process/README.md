# How to Start and Stop the mongod Process

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Operation, Administration, mongod, Systemd

Description: Learn the correct ways to start, stop, and restart the mongod process on Linux using systemd, the mongo shell, and manual commands.

---

## Using systemd (Recommended on Linux)

On modern Linux distributions, MongoDB is managed by systemd when installed via the package manager.

```bash
# Start mongod
sudo systemctl start mongod

# Stop mongod
sudo systemctl stop mongod

# Restart mongod
sudo systemctl restart mongod

# Enable auto-start on boot
sudo systemctl enable mongod

# Disable auto-start on boot
sudo systemctl disable mongod
```

Check the service status:

```bash
sudo systemctl status mongod
```

## Starting mongod Manually

When running mongod directly (not via systemd), provide the required parameters:

```bash
# Minimal startup with config file
mongod --config /etc/mongod.conf

# Minimal startup with command line flags
mongod \
  --dbpath /var/lib/mongodb \
  --logpath /var/log/mongodb/mongod.log \
  --port 27017 \
  --bind_ip 127.0.0.1 \
  --fork  # Run in background

# With replica set
mongod \
  --replSet myReplicaSet \
  --dbpath /var/lib/mongodb \
  --logpath /var/log/mongodb/mongod.log \
  --port 27017 \
  --auth \
  --fork
```

## Graceful Shutdown via mongosh

The cleanest way to shut down a running mongod is from within the mongo shell, especially for replica set primaries:

```bash
# Connect as admin user
mongosh --username admin --authenticationDatabase admin
```

```javascript
// Graceful shutdown
db.adminCommand({ shutdown: 1 });
```

For a replica set primary, force it to step down before shutting down:

```javascript
// Step down first (safer for replica sets)
rs.stepDown(30);

// Then shut down
db.adminCommand({ shutdown: 1 });
```

## Stopping mongod with kill

Use `SIGTERM` (15) for graceful shutdown - mongod flushes writes and closes cleanly:

```bash
# Find the mongod PID
pgrep mongod

# Graceful shutdown
sudo kill -SIGTERM $(pgrep mongod)
```

Never use `SIGKILL` (kill -9) unless mongod is completely unresponsive - it bypasses cleanup and may corrupt the journal.

## Checking if mongod is Running

```bash
# Check process
pgrep -a mongod

# Check port
ss -tlnp | grep 27017

# Quick connectivity test
mongosh --eval "db.adminCommand({ ping: 1 })" --quiet
```

## Viewing the mongod Startup Log

After starting, check logs to confirm successful startup:

```bash
sudo tail -f /var/log/mongodb/mongod.log
```

Look for `"Waiting for connections"` which indicates mongod started successfully.

## Summary

Manage mongod with `systemctl start/stop/restart mongod` when installed via package manager on Linux. For manual startups, always use `--fork` to run in the background and ensure `--dbpath` and `--logpath` are specified. For graceful shutdown of replica set primaries, step down first with `rs.stepDown()` then issue `db.adminCommand({ shutdown: 1 })`.
