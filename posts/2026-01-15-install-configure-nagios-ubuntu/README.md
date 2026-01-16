# How to Install and Configure Nagios on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Nagios, Monitoring, Infrastructure, Observability, Tutorial

Description: Complete guide to installing Nagios Core on Ubuntu for infrastructure monitoring, alerting, and system health checks.

---

Nagios is a powerful open-source monitoring system for networks, servers, and applications. It provides comprehensive monitoring of infrastructure components with alerting capabilities. This guide covers installing Nagios Core on Ubuntu.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- At least 2GB RAM
- Apache web server
- PHP
- Root or sudo access

## Install Dependencies

```bash
# Update system
sudo apt update

# Install required packages
sudo apt install -y apache2 php php-gd libgd-dev unzip wget build-essential libssl-dev libapache2-mod-php openssl
```

## Create Nagios User

```bash
# Create nagios user and group
sudo useradd -m -s /bin/bash nagios

# Create nagcmd group for web commands
sudo groupadd nagcmd

# Add nagios and www-data to nagcmd group
sudo usermod -aG nagcmd nagios
sudo usermod -aG nagcmd www-data
```

## Download and Install Nagios Core

```bash
# Download Nagios Core
cd /tmp
wget https://assets.nagios.com/downloads/nagioscore/releases/nagios-4.5.0.tar.gz

# Extract
tar -xzf nagios-4.5.0.tar.gz
cd nagios-4.5.0

# Configure
./configure --with-httpd-conf=/etc/apache2/sites-enabled --with-command-group=nagcmd

# Compile
make all

# Install
sudo make install
sudo make install-init
sudo make install-commandmode
sudo make install-config
sudo make install-webconf
```

## Install Nagios Plugins

```bash
# Download plugins
cd /tmp
wget https://nagios-plugins.org/download/nagios-plugins-2.4.6.tar.gz

# Extract
tar -xzf nagios-plugins-2.4.6.tar.gz
cd nagios-plugins-2.4.6

# Configure and install
./configure --with-nagios-user=nagios --with-nagios-group=nagios
make
sudo make install
```

## Configure Apache

```bash
# Enable required modules
sudo a2enmod rewrite cgi

# Create Nagios admin user
sudo htpasswd -c /usr/local/nagios/etc/htpasswd.users nagiosadmin
# Enter password when prompted

# Restart Apache
sudo systemctl restart apache2
```

## Configure Nagios

### Main Configuration

```bash
# Edit main config
sudo nano /usr/local/nagios/etc/nagios.cfg
```

Verify these settings:

```
cfg_file=/usr/local/nagios/etc/objects/commands.cfg
cfg_file=/usr/local/nagios/etc/objects/contacts.cfg
cfg_file=/usr/local/nagios/etc/objects/timeperiods.cfg
cfg_file=/usr/local/nagios/etc/objects/templates.cfg
cfg_dir=/usr/local/nagios/etc/servers
```

### Create Server Directory

```bash
sudo mkdir -p /usr/local/nagios/etc/servers
sudo chown nagios:nagios /usr/local/nagios/etc/servers
```

### Configure Contacts

```bash
sudo nano /usr/local/nagios/etc/objects/contacts.cfg
```

Update email:

```
define contact {
    contact_name            nagiosadmin
    use                     generic-contact
    alias                   Nagios Admin
    email                   admin@example.com
}
```

## Start Nagios

```bash
# Verify configuration
sudo /usr/local/nagios/bin/nagios -v /usr/local/nagios/etc/nagios.cfg

# Enable and start Nagios
sudo systemctl enable nagios
sudo systemctl start nagios

# Check status
sudo systemctl status nagios
```

## Access Web Interface

1. Open browser to `http://your_server_ip/nagios`
2. Login with `nagiosadmin` and your password
3. View dashboard and host status

## Add Hosts to Monitor

### Create Host Definition

```bash
sudo nano /usr/local/nagios/etc/servers/webserver.cfg
```

```
define host {
    use                     linux-server
    host_name               webserver
    alias                   Web Server
    address                 192.168.1.100
    max_check_attempts      5
    check_period            24x7
    notification_interval   30
    notification_period     24x7
}

define service {
    use                     generic-service
    host_name               webserver
    service_description     PING
    check_command           check_ping!100.0,20%!500.0,60%
}

define service {
    use                     generic-service
    host_name               webserver
    service_description     SSH
    check_command           check_ssh
}

define service {
    use                     generic-service
    host_name               webserver
    service_description     HTTP
    check_command           check_http
}
```

### Verify and Reload

```bash
# Verify configuration
sudo /usr/local/nagios/bin/nagios -v /usr/local/nagios/etc/nagios.cfg

# Reload Nagios
sudo systemctl reload nagios
```

## Install NRPE for Remote Monitoring

### On Nagios Server

```bash
# Download and install NRPE plugin
cd /tmp
wget https://github.com/NagiosEnterprises/nrpe/releases/download/nrpe-4.1.0/nrpe-4.1.0.tar.gz
tar -xzf nrpe-4.1.0.tar.gz
cd nrpe-4.1.0

./configure
make check_nrpe
sudo make install-plugin
```

### On Remote Host

```bash
# Install NRPE and plugins
sudo apt install nagios-nrpe-server nagios-plugins -y

# Configure NRPE
sudo nano /etc/nagios/nrpe.cfg
```

Add Nagios server IP:

```
allowed_hosts=127.0.0.1,::1,NAGIOS_SERVER_IP
```

```bash
# Restart NRPE
sudo systemctl restart nagios-nrpe-server
```

### Add NRPE Service to Host

```bash
# Add to host config on Nagios server
define service {
    use                     generic-service
    host_name               webserver
    service_description     CPU Load
    check_command           check_nrpe!check_load
}

define service {
    use                     generic-service
    host_name               webserver
    service_description     Disk Usage
    check_command           check_nrpe!check_disk
}
```

## Configure Email Notifications

```bash
# Edit commands.cfg
sudo nano /usr/local/nagios/etc/objects/commands.cfg
```

Verify notification commands:

```
define command {
    command_name    notify-host-by-email
    command_line    /usr/bin/printf "%b" "***** Nagios *****\n\nNotification Type: $NOTIFICATIONTYPE$\nHost: $HOSTNAME$\nState: $HOSTSTATE$\nAddress: $HOSTADDRESS$\nInfo: $HOSTOUTPUT$\n\nDate/Time: $LONGDATETIME$\n" | /usr/bin/mail -s "** $NOTIFICATIONTYPE$ Host Alert: $HOSTNAME$ is $HOSTSTATE$ **" $CONTACTEMAIL$
}

define command {
    command_name    notify-service-by-email
    command_line    /usr/bin/printf "%b" "***** Nagios *****\n\nNotification Type: $NOTIFICATIONTYPE$\n\nService: $SERVICEDESC$\nHost: $HOSTALIAS$\nAddress: $HOSTADDRESS$\nState: $SERVICESTATE$\n\nDate/Time: $LONGDATETIME$\n\nAdditional Info:\n\n$SERVICEOUTPUT$\n" | /usr/bin/mail -s "** $NOTIFICATIONTYPE$ Service Alert: $HOSTALIAS$/$SERVICEDESC$ is $SERVICESTATE$ **" $CONTACTEMAIL$
}
```

## Common Check Commands

```bash
# Check HTTP
check_command           check_http

# Check HTTPS
check_command           check_http!-S

# Check specific port
check_command           check_tcp!8080

# Check disk space
check_command           check_nrpe!check_disk

# Check load
check_command           check_nrpe!check_load

# Check memory
check_command           check_nrpe!check_mem

# Check process
check_command           check_nrpe!check_procs
```

## Troubleshooting

### Configuration Errors

```bash
# Verify configuration
sudo /usr/local/nagios/bin/nagios -v /usr/local/nagios/etc/nagios.cfg
```

### Web Interface Issues

```bash
# Check Apache status
sudo systemctl status apache2

# Check Apache error log
sudo tail -f /var/log/apache2/error.log
```

### Permission Issues

```bash
# Fix permissions
sudo chown -R nagios:nagios /usr/local/nagios
sudo chmod -R 775 /usr/local/nagios/var
```

### NRPE Connection Refused

```bash
# On remote host, check NRPE is running
sudo systemctl status nagios-nrpe-server

# Test from Nagios server
/usr/local/nagios/libexec/check_nrpe -H remote_host_ip
```

---

Nagios provides comprehensive infrastructure monitoring with a mature plugin ecosystem. For modern alternatives with better UIs and features, consider Prometheus with Grafana, Zabbix, or cloud-native solutions like OneUptime.
