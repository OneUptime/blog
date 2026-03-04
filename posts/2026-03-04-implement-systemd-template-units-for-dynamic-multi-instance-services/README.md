# How to Implement systemd Template Units for Multi-Instance Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, systemd, System Administration, Templates, Linux

Description: Learn how to implement systemd Template Units for Dynamic Multi-Instance Services on RHEL with step-by-step instructions, configuration examples, and best practices.

---

systemd template units let you run multiple instances of the same service with different configurations. Instead of writing separate unit files for each instance, you write one template and instantiate it with different parameters.

## Prerequisites

- RHEL with systemd
- Root or sudo access

## How Template Units Work

A template unit file has an `@` in its name, such as `myapp@.service`. The part after `@` when starting the service becomes the instance identifier, accessible as `%i` in the unit file.

## Step 1: Create a Template Unit

```bash
sudo vi /etc/systemd/system/myapp@.service
```

```ini
[Unit]
Description=MyApp Instance %i
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/myapp --config /etc/myapp/%i.conf
User=myapp
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

The `%i` specifier is replaced with the instance name at runtime.

## Step 2: Create Instance Configurations

```bash
sudo mkdir -p /etc/myapp
sudo vi /etc/myapp/production.conf
sudo vi /etc/myapp/staging.conf
```

## Step 3: Start Instances

```bash
sudo systemctl daemon-reload
sudo systemctl start myapp@production.service
sudo systemctl start myapp@staging.service
```

Each instance runs independently with its own configuration file.

## Step 4: Enable Instances at Boot

```bash
sudo systemctl enable myapp@production.service
sudo systemctl enable myapp@staging.service
```

## Step 5: Manage All Instances

Check all running instances:

```bash
systemctl list-units 'myapp@*'
```

Stop all instances:

```bash
systemctl stop 'myapp@*.service'
```

## Template Specifiers

| Specifier | Description |
|-----------|-------------|
| `%i` | Instance name (unescaped) |
| `%I` | Instance name (escaped) |
| `%n` | Full unit name |
| `%N` | Unescaped full unit name |
| `%p` | Prefix name (before @) |
| `%f` | Instance name as a path |

## Practical Example: Multi-Port Web Server

```ini
[Unit]
Description=Web server on port %i

[Service]
ExecStart=/usr/local/bin/webserver --port %i
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl start webserver@8080.service
sudo systemctl start webserver@8081.service
sudo systemctl start webserver@8082.service
```

## Combining Templates with Socket Activation

```bash
sudo vi /etc/systemd/system/myapp@.socket
```

```ini
[Unit]
Description=Socket for MyApp %i

[Socket]
ListenStream=%i

[Install]
WantedBy=sockets.target
```

## Conclusion

systemd template units eliminate duplication when running multiple instances of the same service on RHEL. By using the `%i` specifier, you can parameterize any aspect of the service configuration and manage dozens of instances from a single template file.
