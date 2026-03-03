# How to Configure Shinken for Service Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Shinken, Monitoring, Service Monitoring, Nagios

Description: Learn how to install and configure Shinken, the distributed Nagios-compatible monitoring framework, on Ubuntu to monitor hosts and services with a scalable architecture.

---

Shinken is a monitoring framework that was originally written as a proof-of-concept replacement for the Nagios core. It takes all of Nagios's existing plugins, configuration files, and concepts, but replaces the monolithic Nagios daemon with a distributed, multi-process architecture. The result is a monitoring system that's compatible with Nagios configurations and plugins but scales horizontally across multiple machines.

Shinken splits monitoring into several separate daemons, each responsible for a specific part of the monitoring pipeline. This design means you can distribute load across multiple servers, achieve high availability, and run checks in parallel in ways that are difficult with Nagios.

## Shinken's Architecture

Shinken's daemons:
- **Arbiter** - Reads configuration, dispatches to other daemons, acts as coordinator
- **Scheduler** - Decides when checks should run and their state transitions
- **Poller** - Actually executes the check plugins
- **Reactionner** - Runs event handlers and notifications
- **Broker** - Exports data to external storage (MySQL, Graphite, etc.)
- **Receiver** - Optional: receives passive checks from external systems

For a single-server setup, all daemons run on one machine. For scale, you can spread them across multiple servers.

## Prerequisites

Shinken requires Python 2 or Python 3. On modern Ubuntu, Python 3 is used:

```bash
sudo apt update
sudo apt install python3 python3-pip python3-dev
sudo apt install git curl

# Nagios plugins (Shinken uses these)
sudo apt install monitoring-plugins nagios-plugins
```

## Installing Shinken

### Using pip

```bash
# Create a shinken user
sudo useradd -r -s /bin/bash -d /var/lib/shinken shinken
sudo mkdir -p /var/lib/shinken
sudo chown shinken:shinken /var/lib/shinken

# Install Shinken
sudo pip3 install shinken

# Initialize Shinken directories as the shinken user
sudo -u shinken sh -c "shinken --init"
```

### From Source (Current Version)

```bash
# Clone the repository
git clone https://github.com/naparuba/shinken.git /opt/shinken-src
cd /opt/shinken-src

# Install
sudo python3 setup.py install

# Create required directories
sudo mkdir -p /var/run/shinken
sudo mkdir -p /var/log/shinken
sudo mkdir -p /etc/shinken
sudo chown -R shinken:shinken /var/run/shinken /var/log/shinken /etc/shinken
```

## Configuration File Layout

Shinken's configuration is compatible with Nagios. The main configuration files live in `/etc/shinken/`:

```bash
ls /etc/shinken/
# arbiter/    broker/     daemons/    modules/
# pollers/    reactionners/ receivers/ schedulers/
# hosts/      services/   contacts/   timeperiods/
# commands/   templates/
```

### Main Daemons Configuration

```bash
cat /etc/shinken/daemons/arbiter-master.cfg
```

```text
define arbiter{
    arbiter_name    Arbiter-Master
    host_name       localhost
    address         localhost
    port            7770
    spare           0
    # Log configuration
    log_file        /var/log/shinken/arbiter.log
}
```

Similar files exist for each daemon type in their respective directories.

## Setting Up Basic Monitoring

### Create a Command Definition

```bash
sudo nano /etc/shinken/commands/commands.cfg
```

```text
# Check host alive
define command {
    command_name    check-host-alive
    command_line    $PLUGINSDIR$/check_ping -H $HOSTADDRESS$ -w 3000.0,80% -c 5000.0,100% -p 5
}

# Check HTTP
define command {
    command_name    check_http
    command_line    $PLUGINSDIR$/check_http -I $HOSTADDRESS$ -p $ARG1$ -u $ARG2$
}

# Check SSH
define command {
    command_name    check_ssh
    command_line    $PLUGINSDIR$/check_ssh $HOSTADDRESS$
}

# Check disk space via SNMP or NRPE
define command {
    command_name    check_disk_root
    command_line    $PLUGINSDIR$/check_disk -w $ARG1$ -c $ARG2$ -p /
}

# Check load
define command {
    command_name    check_load
    command_line    $PLUGINSDIR$/check_load -w $ARG1$ -c $ARG2$
}
```

### Create a Contact (for Notifications)

```bash
sudo nano /etc/shinken/contacts/admin.cfg
```

```text
define contact {
    contact_name        admin
    alias               Administrator
    email               admin@example.com

    # Notification settings
    host_notification_period        24x7
    service_notification_period     24x7
    host_notification_options       d,u,r       # down, unreachable, recovery
    service_notification_options    w,u,c,r     # warning, unknown, critical, recovery

    host_notification_commands      notify-host-by-email
    service_notification_commands   notify-service-by-email
}

define contactgroup {
    contactgroup_name   admins
    alias               System Administrators
    members             admin
}
```

### Create a Host Template

```bash
sudo nano /etc/shinken/templates/templates.cfg
```

```text
# Generic host template
define host {
    name                    generic-host
    check_command           check-host-alive
    max_check_attempts      5
    check_interval          1
    retry_interval          1
    check_period            24x7
    contact_groups          admins
    notification_period     24x7
    notification_interval   30
    notification_options    d,u,r
    register                0       # Template only, not a real host
}

# Linux server template
define host {
    name                    linux-server
    use                     generic-host
    check_interval          2
    register                0
}

# Generic service template
define service {
    name                    generic-service
    max_check_attempts      3
    check_interval          5
    retry_interval          1
    check_period            24x7
    contact_groups          admins
    notification_period     24x7
    notification_interval   30
    notification_options    w,u,c,r
    register                0
}
```

### Add Hosts

```bash
sudo nano /etc/shinken/hosts/hosts.cfg
```

```text
# Web server
define host {
    use                 linux-server
    host_name           webserver01
    alias               Web Server 01
    address             192.168.1.50
}

# Database server
define host {
    use                 linux-server
    host_name           database01
    alias               Database Server
    address             192.168.1.60
}

# Monitoring the localhost itself
define host {
    use                 linux-server
    host_name           localhost
    alias               Local Machine
    address             127.0.0.1
}
```

### Add Service Checks

```bash
sudo nano /etc/shinken/services/services.cfg
```

```text
# Check SSH on all Linux servers
define service {
    use                     generic-service
    hostgroup_name          linux-servers
    service_description     SSH
    check_command           check_ssh
}

# Check HTTP on web servers
define service {
    use                     generic-service
    host_name               webserver01
    service_description     HTTP
    check_command           check_http!80!/
}

define service {
    use                     generic-service
    host_name               webserver01
    service_description     HTTPS
    check_command           check_http!443!/
}

# Check disk space on localhost
define service {
    use                     generic-service
    host_name               localhost
    service_description     Disk Space /
    check_command           check_disk_root!20%!10%
}

define service {
    use                     generic-service
    host_name               localhost
    service_description     Load Average
    check_command           check_load!5.0,4.0,3.0!10.0,8.0,6.0
}
```

### Define Host Groups

```bash
sudo nano /etc/shinken/hosts/hostgroups.cfg
```

```text
define hostgroup {
    hostgroup_name      linux-servers
    alias               Linux Servers
    members             webserver01, database01, localhost
}

define hostgroup {
    hostgroup_name      web-servers
    alias               Web Servers
    members             webserver01
}
```

## Starting the Daemons

### Create Systemd Service Files

```bash
# Create a service for each Shinken daemon
for daemon in arbiter scheduler poller reactionner broker; do
    sudo tee /etc/systemd/system/shinken-${daemon}.service << EOF
[Unit]
Description=Shinken ${daemon} daemon
After=network.target

[Service]
Type=forking
User=shinken
Group=shinken
ExecStart=/usr/local/bin/shinken-${daemon} -d -c /etc/shinken/daemons/${daemon}-master.cfg
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
done

sudo systemctl daemon-reload
```

Start the daemons in the correct order (arbiter last):

```bash
sudo systemctl enable shinken-scheduler
sudo systemctl enable shinken-poller
sudo systemctl enable shinken-reactionner
sudo systemctl enable shinken-broker
sudo systemctl enable shinken-arbiter

sudo systemctl start shinken-scheduler
sudo systemctl start shinken-poller
sudo systemctl start shinken-reactionner
sudo systemctl start shinken-broker
sudo systemctl start shinken-arbiter
```

### Verify All Daemons Are Running

```bash
for daemon in arbiter scheduler poller reactionner broker; do
    sudo systemctl status shinken-${daemon} | head -3
done

# Check the Arbiter log for configuration errors
sudo tail -f /var/log/shinken/arbiter.log
```

## Installing the WebUI

Shinken has a WebUI module available via its package manager:

```bash
# Install WebUI
sudo -u shinken shinken install webui2

# Enable in configuration
sudo nano /etc/shinken/brokers/broker-master.cfg
```

```text
define broker {
    broker_name     Broker-Master
    modules         webui2
    ...
}
```

```bash
sudo systemctl restart shinken-broker
sudo systemctl restart shinken-arbiter

# WebUI is available at http://your-server:7767
```

## Validating Configuration

```bash
# Check configuration syntax (run as shinken user)
sudo -u shinken shinken-arbiter -v -c /etc/shinken/daemons/arbiter-master.cfg

# This will report any configuration errors before applying
```

## Troubleshooting Common Issues

```bash
# Daemons not starting - check ports
ss -tlnp | grep "7770\|7768\|7771\|7769\|7772"

# Permission issues
sudo chown -R shinken:shinken /var/log/shinken /var/run/shinken

# Plugin not found errors - check the PLUGINSDIR path
grep -r "PLUGINSDIR" /etc/shinken/resource.cfg
# Should point to where monitoring-plugins are installed
which check_ping  # Verify the plugins are in this path

# View scheduler log for check execution issues
sudo tail -f /var/log/shinken/schedulerd.log
```

Shinken's main advantage over Nagios is its distributed architecture - you can run pollers in different network segments, achieve HA with spare daemons, and scale check capacity by adding more pollers. For organizations already running Nagios, the migration path is straightforward because Shinken reads the same configuration format and uses the same plugins.
