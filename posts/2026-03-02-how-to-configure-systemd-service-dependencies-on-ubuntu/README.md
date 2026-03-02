# How to Configure systemd Service Dependencies on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, Service, Linux, Administration

Description: Configure systemd service dependencies on Ubuntu using Requires, Wants, After, Before, and BindsTo directives to control service start order and failure behavior.

---

systemd's dependency system controls the order in which services start and what happens when one service fails. Getting dependencies right ensures services start in the correct order, do not race with each other, and handle failures predictably. Getting them wrong leads to services starting before their dependencies are ready, or services not starting at all because of missed dependencies.

## The Two Axes of Dependencies

systemd dependencies work along two separate axes:

1. **Ordering:** Controls the sequence in which units start or stop (`After=`, `Before=`)
2. **Activation:** Controls whether starting one unit causes another to start (`Requires=`, `Wants=`, `BindsTo=`)

These are independent. `After=` alone does not cause a unit to be started - it only says "if both units need to start, start this one after that one." You need both ordering and activation directives for most dependency scenarios.

## Ordering Directives

### After= and Before=

```ini
[Unit]
Description=My Application

# Start this service after these units (if they are being started)
After=network-online.target postgresql.service redis.service

# Start this service before these units
Before=maintenance.service
```

`After=` is the most common ordering directive. The listed units do not need to exist or start - the ordering only applies if they are being started in the same transaction.

```bash
# Check a service's ordering dependencies
systemctl list-dependencies --after nginx.service
systemctl list-dependencies --before nginx.service
```

## Activation Directives

### Wants= (Soft Dependency)

```ini
[Unit]
Description=My Application

# Try to start cache.service when this service starts.
# If cache.service fails to start, this service continues anyway.
Wants=cache.service

# Almost always combined with After= to ensure proper ordering
After=cache.service
```

`Wants=` is the recommended way to express "I work better with this, but can run without it." It is better to use `Wants=` than `Requires=` unless the service genuinely cannot function without the dependency.

### Requires= (Hard Dependency)

```ini
[Unit]
Description=My Application

# If database.service fails to start, this service also fails.
# If database.service stops, this service also stops.
Requires=database.service postgresql.service

# Ordering still needs to be specified separately
After=database.service postgresql.service
```

`Requires=` creates a hard dependency. If any required unit fails to start, this unit fails too. If a required unit stops while this unit is running, this unit also stops.

Use `Requires=` only when the service truly cannot operate without the dependency. Over-using `Requires=` makes the system fragile - if the required service is unavailable for any reason (maintenance, failure), your service fails completely.

### BindsTo= (Strict Binding)

```ini
[Unit]
Description=Service Bound to Device

# If device.service stops for ANY reason (including reload), stop this service too
BindsTo=device.service
After=device.service
```

`BindsTo=` is stricter than `Requires=`. With `Requires=`, if the required service deactivates unexpectedly (crashes), the dependent service may continue. With `BindsTo=`, if the bound unit deactivates at all, the binding unit also stops.

Use `BindsTo=` for services that are tightly coupled to a device or resource and must stop when that resource disappears.

### PartOf= (Stop/Restart Propagation)

```ini
[Unit]
Description=Component Service

# If parent.service is stopped or restarted, so is this service.
# But stopping this service does NOT stop parent.service.
PartOf=parent.service
```

`PartOf=` is one-directional. Stopping or restarting the parent propagates to this unit. Stopping this unit does not affect the parent. This is useful for services that are components of a larger service group.

## Practical Examples

### Web Application Stack

A common pattern: web server requires database, database requires network.

```bash
sudo nano /etc/systemd/system/webapp.service
```

```ini
[Unit]
Description=Web Application
Documentation=https://docs.example.com

# Hard dependency on the database - app cannot start without it
Requires=postgresql.service

# Soft dependency on cache - app is slower without it, but still works
Wants=redis.service

# Start after all dependencies are ready
After=network-online.target postgresql.service redis.service

[Service]
Type=notify
User=webapp
ExecStart=/usr/bin/webapp --config /etc/webapp/config.yaml
Restart=on-failure
RestartSec=10s
TimeoutStartSec=60s

[Install]
WantedBy=multi-user.target
```

### Reverse Proxy with Backend

Configure nginx to start after and require the backend service:

```bash
sudo nano /etc/systemd/system/nginx.service.d/webapp-dependency.conf
```

```ini
[Unit]
# nginx should not start if webapp is not running
Requires=webapp.service
After=webapp.service
```

```bash
sudo systemctl daemon-reload
```

Now if `webapp.service` fails, `nginx.service` also fails rather than starting with nothing to proxy to.

### Service Group with Shared Lifecycle

```bash
sudo nano /etc/systemd/system/worker1.service
```

```ini
[Unit]
Description=Worker Process 1
PartOf=workers.target
After=workers.target

[Service]
Type=simple
ExecStart=/usr/bin/worker --id 1

[Install]
WantedBy=workers.target
```

```bash
sudo nano /etc/systemd/system/workers.target
```

```ini
[Unit]
Description=All Worker Processes
Wants=worker1.service worker2.service worker3.service

[Install]
WantedBy=multi-user.target
```

With this setup:
- `systemctl start workers.target` starts all three workers
- `systemctl stop workers.target` stops all three workers
- Individual workers can be managed separately

### Waiting for Network

The correct way to express "wait for network to be up" depends on what "up" means:

```ini
# network.target: basic network configured (IP address assigned)
# Good enough for services that bind to 0.0.0.0 or localhost
After=network.target

# network-online.target: network is fully operational, routable, DNS works
# Required for services that need to reach external hosts
After=network-online.target
Wants=network-online.target
```

`network-online.target` requires `systemd-networkd-wait-online.service` or `NetworkManager-wait-online.service` to be running to actually wait for the network to be up. Verify this:

```bash
systemctl is-enabled systemd-networkd-wait-online.service
# or
systemctl is-enabled NetworkManager-wait-online.service
```

If neither is enabled, `network-online.target` is reached immediately and does not actually wait for the network.

## Debugging Dependency Issues

### Viewing Dependency Trees

```bash
# Show forward dependencies (what this service depends on)
systemctl list-dependencies myapp.service

# Show reverse dependencies (what depends on this service)
systemctl list-dependencies --reverse myapp.service

# Show all dependencies recursively
systemctl list-dependencies --all myapp.service

# Check for circular dependencies
systemd-analyze verify myapp.service
```

### Service Fails Immediately After Starting

```bash
# Check if a dependency failed
journalctl -u myapp.service -b | head -30

# Check if the required dependency is running
systemctl status postgresql.service

# Check the full startup log to see ordering
journalctl -b | grep "Starting\|Started\|Failed" | head -50
```

### Service Starts Before Dependency is Ready

A common issue: `postgresql.service` is "active" but not yet accepting connections when `webapp.service` tries to connect. The `After=` ensures ordering but not readiness.

Solutions:

**Option 1:** Use Type=notify in the dependency service so it signals when truly ready.

**Option 2:** Add a wait loop to ExecStartPre:

```ini
[Service]
ExecStartPre=/bin/bash -c 'for i in $(seq 1 30); do pg_isready && break; sleep 2; done'
ExecStart=/usr/bin/webapp
```

**Option 3:** Set `Restart=on-failure` and let the app retry:

```ini
[Service]
Restart=on-failure
RestartSec=5s
StartLimitIntervalSec=60s
StartLimitBurst=10
```

## Using Conditions and Assertions

Conditions allow a unit to be skipped (not started) when conditions are not met:

```ini
[Unit]
# Skip starting this service if the config file does not exist
ConditionPathExists=/etc/myapp/config.yaml

# Skip if a file exists (useful for disable-flag files)
ConditionPathNotExists=/etc/myapp/disabled

# Skip if not running on a specific architecture
ConditionArchitecture=x86-64

# Fail (not skip) if condition not met - use Assert instead of Condition
AssertFileNotEmpty=/etc/myapp/config.yaml
```

The difference between `Condition*` and `Assert*` is subtle but important:
- `Condition*`: If condition fails, the unit is silently skipped (result: success)
- `Assert*`: If assertion fails, the unit fails (result: failure)

For most dependency scenarios, `Condition*` is appropriate for optional checks, while explicit dependency directives (`Requires=`, `Wants=`) handle the actual service dependencies.

## Best Practices

1. **Use `Wants=` over `Requires=` by default.** Unless your service genuinely cannot operate at all without the dependency, prefer `Wants=`. Failing softly is usually better than hard failures.

2. **Always pair activation with ordering.** `Requires=database.service` without `After=database.service` means systemd tries to start both simultaneously.

3. **Use `network-online.target` for external network access, `network.target` for local binding.**

4. **Test with `systemd-analyze verify`** before deploying new unit files.

5. **Avoid dependency cycles.** If service A depends on B and B depends on A, systemd cannot resolve the ordering. Use `Wants=` and design your services to not need circular dependencies.

```bash
# Detect cycles in the unit dependency graph
systemd-analyze verify myapp.service
systemd-analyze plot > /tmp/boot-graph.svg
```

Proper dependency configuration makes your services robust, starts them in the right order, and makes failures more predictable and easier to diagnose.
