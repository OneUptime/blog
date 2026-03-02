# How to Create systemd Template Units on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, Service, System Administration

Description: Learn how to create and use systemd template units on Ubuntu to manage multiple instances of a service with a single unit file, using instance-specific configuration.

---

A systemd template unit is a single unit file that can be instantiated multiple times with different parameters. Instead of writing separate service files for each instance of a service (say, three Node.js workers or five VPN tunnels), you write one template that accepts an instance name and configures itself accordingly.

Template units are identified by an `@` in their filename before the `.service` extension: `myservice@.service`. Instances are started with the instance name after the `@`: `systemctl start myservice@instance1`.

## Template Unit Syntax

In a template unit file, the `%i` specifier represents the instance name. The `%I` variant provides the same name but with special characters decoded. Other specifiers are also available:

| Specifier | Meaning |
|-----------|---------|
| `%i` | Instance name (encoded) |
| `%I` | Instance name (decoded) |
| `%n` | Full unit name with instance |
| `%N` | Same as %n but unescaped |
| `%p` | Prefix name (part before @) |
| `%H` | Hostname |
| `%u` | User the service runs as |

## Creating a Basic Template Unit

Here is a template for running multiple instances of a Python worker process:

```bash
sudo nano /etc/systemd/system/worker@.service
```

```ini
[Unit]
Description=Background Worker Instance %i
Documentation=https://example.com/workers
# This instance should start after network is available
After=network.target

# Template units can depend on each other
# (e.g., require a base service to be running)
# Requires=base-service.service

[Service]
Type=simple
User=www-data
Group=www-data

# The instance name (%i) becomes the worker ID
# This allows each instance to have its own log file and config
Environment=WORKER_ID=%i
Environment=WORKER_LOG=/var/log/workers/worker-%i.log
Environment=WORKER_CONFIG=/etc/workers/worker-%i.conf

# The actual command - same binary, different instance variable
ExecStart=/usr/local/bin/myworker --id %i --config /etc/workers/worker-%i.conf

Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal

# Resource limits per instance
MemoryMax=512M
CPUQuota=25%

[Install]
WantedBy=multi-user.target
```

## Starting and Managing Template Instances

```bash
# Start specific instances
sudo systemctl start worker@1.service
sudo systemctl start worker@2.service
sudo systemctl start worker@3.service

# Or use the short form (systemd infers .service)
sudo systemctl start worker@1

# Enable instances to start at boot
sudo systemctl enable worker@1 worker@2 worker@3

# Check status of all instances
sudo systemctl status "worker@*.service"

# Check a specific instance
sudo systemctl status worker@2.service

# Stop an instance
sudo systemctl stop worker@2

# Restart all instances matching the template
sudo systemctl restart "worker@*.service"
```

## Real-World Example: Multiple OpenVPN Tunnels

Managing several VPN tunnels with one template unit:

```bash
sudo nano /etc/systemd/system/openvpn-client@.service
```

```ini
[Unit]
Description=OpenVPN Client - %i
After=network-online.target
Wants=network-online.target

[Service]
Type=forking
PIDFile=/run/openvpn-client/%i.pid
ExecStart=/usr/sbin/openvpn \
    --daemon openvpn-%i \
    --status /run/openvpn-client/%i.status \
    --cd /etc/openvpn/client \
    --config /etc/openvpn/client/%i.conf \
    --writepid /run/openvpn-client/%i.pid

ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
RestartSec=5s

RuntimeDirectory=openvpn-client
RuntimeDirectoryMode=0710

[Install]
WantedBy=multi-user.target
```

With config files at `/etc/openvpn/client/office.conf`, `/etc/openvpn/client/datacenter.conf`, etc.:

```bash
# Start specific tunnels
sudo systemctl start openvpn-client@office
sudo systemctl start openvpn-client@datacenter

# Enable specific tunnels at boot
sudo systemctl enable openvpn-client@office openvpn-client@datacenter
```

## Real-World Example: Multiple PostgreSQL Databases

Running multiple PostgreSQL instances on different ports:

```bash
sudo nano /etc/systemd/system/postgresql-custom@.service
```

```ini
[Unit]
Description=PostgreSQL Custom Instance - %i
After=network.target syslog.target

[Service]
Type=forking
User=postgres
Group=postgres

# Data directory includes instance name
Environment=PGDATA=/var/lib/postgresql/%i

ExecStartPre=/usr/bin/postgresql-check-db-dir ${PGDATA}
ExecStart=/usr/lib/postgresql/16/bin/pg_ctl \
    -D ${PGDATA} \
    -l /var/log/postgresql/postgresql-%i.log \
    start

ExecStop=/usr/lib/postgresql/16/bin/pg_ctl \
    -D ${PGDATA} \
    -m fast \
    stop

ExecReload=/usr/lib/postgresql/16/bin/pg_ctl \
    -D ${PGDATA} \
    reload

TimeoutSec=300

[Install]
WantedBy=multi-user.target
```

## Real-World Example: Multiple Static File Servers

Serving multiple directories over HTTP:

```bash
sudo nano /etc/systemd/system/http-server@.service
```

```ini
[Unit]
Description=Simple HTTP Server for %i
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data

# Instance name is the port number
# Serve files from /srv/%i
ExecStart=/usr/bin/python3 -m http.server \
    --directory /srv/%i \
    --bind 127.0.0.1 \
    %i

Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Start servers on different ports:

```bash
# Create directories
sudo mkdir -p /srv/8080 /srv/8081
sudo chown www-data:www-data /srv/8080 /srv/8081

# Start servers (instance name is the port)
sudo systemctl start http-server@8080
sudo systemctl start http-server@8081
```

## Passing Complex Instance Parameters

For instances that need more than a simple name, encode additional parameters in the instance name using URL encoding or separators:

```bash
# Service template that accepts host:port as instance
sudo nano /etc/systemd/system/proxy@.service
```

```ini
[Unit]
Description=TCP Proxy for %i
After=network.target

[Service]
Type=simple

# Split instance name on '-' to get source and destination
# Instance: 8080-10.0.0.5-9090 means: local port 8080, target 10.0.0.5:9090
ExecStart=/bin/bash -c 'IFS="-" read src host dst <<< "%i"; \
    socat TCP4-LISTEN:$src,fork,reuseaddr TCP4:$host:$dst'

Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## Using drop-in Overrides with Template Instances

Apply configuration overrides to all instances, or specific ones:

```bash
# Override for all instances of worker
sudo mkdir -p /etc/systemd/system/worker@.service.d/
sudo nano /etc/systemd/system/worker@.service.d/limits.conf
```

```ini
[Service]
# Override memory limit for all instances
MemoryMax=1G
```

For a specific instance only:

```bash
# Override only for worker@3
sudo mkdir -p /etc/systemd/system/worker@3.service.d/
sudo nano /etc/systemd/system/worker@3.service.d/high-memory.conf
```

```ini
[Service]
# Give instance 3 more memory
MemoryMax=2G
```

## Listing and Monitoring Template Instances

```bash
# List all instances of a template
systemctl list-units "worker@*.service"

# Show only active instances
systemctl list-units "worker@*.service" --state=active

# Show failed instances
systemctl list-units "worker@*.service" --state=failed

# View logs from all instances together
sudo journalctl -u "worker@*.service" -f

# View logs from a specific instance
sudo journalctl -u worker@2.service --since "1 hour ago"
```

## Summary

systemd template units eliminate the need to maintain multiple near-identical service files. A single file with `@` in its name serves as a template, and instances are created by appending the instance identifier after the `@` in systemctl commands. The `%i` specifier substitutes the instance name throughout the unit file, enabling different config files, log paths, port numbers, or any other per-instance parameters. Drop-in overrides can apply to all instances of a template or to specific ones, providing fine-grained control without duplicating the entire unit file.
