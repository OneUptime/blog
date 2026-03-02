# How to Set Up Icinga2 for Infrastructure Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Icinga2, Monitoring, Infrastructure, DevOps

Description: A complete guide to installing and configuring Icinga2 on Ubuntu for infrastructure monitoring, including host and service checks, notifications, and the Icinga Web 2 dashboard.

---

Icinga2 is an open-source monitoring system that grew out of the Nagios project. It monitors hosts and services across your infrastructure, sends notifications when things fail, and provides a web interface for visualizing the state of your systems. Unlike Nagios, Icinga2 was rewritten from the ground up with a cluster-capable architecture, a configuration language that handles dependencies cleanly, and much better performance at scale.

## Architecture Overview

Icinga2 runs as a daemon (`icinga2`) that executes checks at regular intervals using check plugins (the same ones that work with Nagios). Results are stored in a database (MySQL/PostgreSQL) and served through the Icinga Web 2 interface.

The typical single-server setup has all components on one machine:
- Icinga2 daemon (checks, notifications)
- MySQL database (stores check results and historical data)
- Icinga Web 2 (the web dashboard)
- Icinga DB (the modern results backend, replaces IDO)

## Installing Icinga2

### Add the Icinga Repository

```bash
# Add Icinga repository
curl -sSL https://packages.icinga.com/icinga.key | sudo gpg --dearmor -o /usr/share/keyrings/icinga.gpg

echo "deb [signed-by=/usr/share/keyrings/icinga.gpg] https://packages.icinga.com/ubuntu icinga-$(lsb_release -cs) main" | \
  sudo tee /etc/apt/sources.list.d/icinga.list

sudo apt update
```

### Install Icinga2 and Plugins

```bash
# Install Icinga2
sudo apt install icinga2

# Install the monitoring plugins (checks for ping, HTTP, SSH, etc.)
sudo apt install monitoring-plugins

# Enable the built-in check plugins
sudo icinga2 feature enable command

# Verify installation
icinga2 --version
```

## Setting Up the Database Backend

### Install MySQL and Icinga DB

```bash
# Install MySQL
sudo apt install mysql-server

# Install Icinga DB
sudo apt install icingadb

# Install the MySQL connector for Icinga DB
sudo apt install icingadb-redis
```

### Configure the Database

```bash
# Secure MySQL installation
sudo mysql_secure_installation

# Create databases
sudo mysql -u root -p << 'EOF'
-- Icinga DB database
CREATE DATABASE icingadb CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE USER 'icingadb'@'localhost' IDENTIFIED BY 'icingadb-password';
GRANT SELECT,INSERT,UPDATE,DELETE,DROP,CREATE,ALTER,INDEX,EXECUTE ON icingadb.* TO 'icingadb'@'localhost';

-- Icinga Web 2 database
CREATE DATABASE icingaweb2;
CREATE USER 'icingaweb2'@'localhost' IDENTIFIED BY 'icingaweb2-password';
GRANT ALL ON icingaweb2.* TO 'icingaweb2'@'localhost';
FLUSH PRIVILEGES;
EOF
```

### Configure Icinga DB

```bash
# Edit the Icinga DB configuration
sudo nano /etc/icingadb/config.yml
```

```yaml
database:
  host: localhost
  port: 3306
  database: icingadb
  user: icingadb
  password: icingadb-password

redis:
  host: localhost
  port: 6380
```

```bash
# Start Icinga DB Redis (bundled Redis instance for Icinga DB)
sudo systemctl enable icingadb-redis
sudo systemctl start icingadb-redis

# Run database migrations
sudo icingadb-schema --import-mysql-scheme

# Start Icinga DB
sudo systemctl enable icingadb
sudo systemctl start icingadb
```

### Enable the Icinga DB Feature in Icinga2

```bash
sudo icinga2 feature enable icingadb

# Restart Icinga2 to apply
sudo systemctl restart icinga2
```

## Basic Icinga2 Configuration

Icinga2's configuration lives in `/etc/icinga2/`. The main configuration is `icinga2.conf` which includes files from `conf.d/`:

```bash
ls /etc/icinga2/conf.d/
# commands.conf  downtimes.conf  groups.conf
# hosts.conf     notifications.conf  services.conf  templates.conf  users.conf
```

### Configuring a Host

```bash
sudo nano /etc/icinga2/conf.d/hosts.conf
```

```
// Monitor a specific server
object Host "webserver01" {
    // The address for checks
    address = "192.168.1.50"
    address6 = "2001:db8::50"

    // Check type - checks if the host is reachable
    check_command = "hostalive"

    // Assign the host to groups
    vars.os = "Linux"
    vars.server_role = "web"

    // Custom variables used by services
    vars.http_port = 80
    vars.http_vhost = "www.example.com"
}

// Template for Linux hosts
template Host "linux-host" {
    max_check_attempts = 5
    check_interval = 1m
    retry_interval = 30s
    check_timeout = 30s
}

// Apply the template
object Host "database01" {
    import "linux-host"
    address = "192.168.1.60"
    check_command = "hostalive"
    vars.mysql_port = 3306
}
```

### Configuring Services

```bash
sudo nano /etc/icinga2/conf.d/services.conf
```

```
// Apply rule - add this service to all hosts with vars.os == "Linux"
apply Service "ssh" {
    check_command = "ssh"
    check_interval = 2m
    retry_interval = 30s

    assign where host.vars.os == "Linux"
}

// Apply HTTP check to all web servers
apply Service "http" {
    check_command = "http"

    vars.http_port = host.vars.http_port
    vars.http_vhost = host.vars.http_vhost

    assign where host.vars.server_role == "web"
}

// Check disk space on Linux hosts
apply Service "disk" {
    check_command = "disk"

    vars.disk_wfree = "20%"
    vars.disk_cfree = "10%"

    assign where host.vars.os == "Linux"
}

// Check load average
apply Service "load" {
    check_command = "load"

    vars.load_wload1 = "5"
    vars.load_cload1 = "10"

    assign where host.vars.os == "Linux"
}

// Monitor a specific MySQL instance
apply Service "mysql" {
    check_command = "mysql"

    vars.mysql_hostname = host.address
    vars.mysql_port = host.vars.mysql_port

    assign where host.vars.mysql_port
}
```

### Validating Configuration

```bash
# Always validate before restarting
sudo icinga2 daemon -C

# If validation passes, restart
sudo systemctl restart icinga2

# Check status
sudo systemctl status icinga2
```

## Setting Up Notifications

### Install msmtp for Email Notifications

```bash
sudo apt install msmtp msmtp-mta

sudo nano /etc/msmtprc
```

```
# msmtp configuration for icinga notifications
account default
host smtp.gmail.com
port 587
tls on
tls_starttls on
auth on
user your-email@gmail.com
password your-app-password
from your-email@gmail.com
logfile /var/log/msmtp.log
```

### Configure Notification Users

```bash
sudo nano /etc/icinga2/conf.d/users.conf
```

```
object User "ops-team" {
    display_name = "Ops Team"
    email = "ops@example.com"

    states = [ OK, Warning, Critical, Unknown ]
    types = [ Problem, Recovery ]
}
```

```bash
sudo nano /etc/icinga2/conf.d/notifications.conf
```

```
// Apply notification to all services
apply Notification "mail-service" to Service {
    command = "mail-service-notification"
    users = [ "ops-team" ]

    types = [ Problem, Acknowledgement, Recovery, Custom ]
    states = [ Warning, Critical, Unknown ]

    // Only notify after the first hard state
    period = "24x7"

    assign where true
}
```

## Installing Icinga Web 2

```bash
# Install Icinga Web 2 and its dependencies
sudo apt install icingaweb2 icingaweb2-module-icingadb

# Install PHP and web server
sudo apt install apache2 php libapache2-mod-php

# Enable required PHP extensions
sudo apt install php-intl php-imagick php-gd php-mysql php-curl php-mbstring

# Set up web server configuration
sudo a2enmod rewrite
sudo systemctl restart apache2
```

### Configure Icinga Web 2

```bash
# Generate a setup token
sudo icingacli setup token create

# Note the token output - you'll need it in the web setup
```

Open a browser and navigate to `http://your-server/icingaweb2/setup`. Enter the token to start the setup wizard.

During setup you'll configure:
- Authentication (database or LDAP)
- The Icinga DB resource (MySQL connection for icingadb database)
- The Icinga Web database (MySQL connection for icingaweb2 database)

## Monitoring Remote Hosts with Icinga Agents

For detailed monitoring (disk space, processes, etc.) on remote Linux hosts, deploy the Icinga2 agent:

### On the Remote Host (Agent)

```bash
# Install Icinga2
sudo apt install icinga2 monitoring-plugins

# Generate a certificate for the agent
sudo icinga2 node wizard
```

Follow the wizard, providing:
- The master's hostname and address
- This node's hostname (must match DNS)

### On the Master Server

```bash
# After running the wizard on the agent, accept the certificate
sudo icinga2 ca sign agent-hostname

# Add the remote host to the master configuration
sudo nano /etc/icinga2/conf.d/hosts.conf
```

```
object Endpoint "agent-hostname" {
    host = "192.168.1.70"
}

object Zone "agent-hostname" {
    endpoints = ["agent-hostname"]
    parent = "master"
}

object Host "agent-hostname" {
    address = "192.168.1.70"
    check_command = "hostalive"

    // Run checks remotely on the agent
    command_endpoint = "agent-hostname"

    vars.os = "Linux"
}
```

```bash
sudo systemctl restart icinga2
```

## Useful Command-Line Operations

```bash
# Force an immediate check of a host or service
sudo icinga2 daemon --validate  # Validate config
icingacli monitoring list hosts  # List monitored hosts
icingacli monitoring list services --host=webserver01

# Check current Icinga2 status
sudo systemctl status icinga2

# View Icinga2 logs
sudo tail -f /var/log/icinga2/icinga2.log

# View check output logs
sudo tail -f /var/log/icinga2/debug.log
```

## Scheduling Downtime

When performing maintenance, schedule downtime to suppress notifications:

```bash
# Schedule downtime via icingacli
icingacli monitoring downtime schedule \
  --host=webserver01 \
  --start=$(date +%s) \
  --end=$(($(date +%s) + 3600)) \
  --comment="Maintenance window"
```

Or use the Icinga Web 2 interface: find the host, click "Schedule Downtime", and fill in the duration.

Icinga2's configuration language takes some getting used to if you're coming from Nagios, but the `apply` rules for services are significantly more powerful than Nagios's service templates, and the ability to set custom variables on hosts that get used by service check commands makes large configurations much more maintainable.
