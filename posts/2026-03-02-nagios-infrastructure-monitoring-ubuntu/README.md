# How to Set Up Nagios for Infrastructure Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Monitoring, Nagios, Infrastructure, Alerting

Description: Step-by-step guide to installing and configuring Nagios Core on Ubuntu for comprehensive infrastructure monitoring with host and service checks.

---

Nagios has been a cornerstone of infrastructure monitoring for over two decades. While newer tools like Prometheus have gained popularity, Nagios remains widely deployed and understood. Its plugin-based architecture, established check ecosystem, and familiar alert model make it a solid choice, particularly for organizations with existing Nagios expertise or integrations.

## Installing Nagios Core

Ubuntu's repositories include Nagios, but the version is often outdated. Installing from source gives you the current version:

```bash
# Install build dependencies
sudo apt update
sudo apt install -y build-essential apache2 php libapache2-mod-php \
  libgd-dev libssl-dev libmcrypt-dev openssl wget unzip

# Create nagios user and group
sudo useradd -m -s /bin/bash nagios
sudo groupadd nagcmd
sudo usermod -aG nagcmd nagios
sudo usermod -aG nagcmd www-data

# Download Nagios Core (check https://www.nagios.org/downloads/ for latest)
NAGIOS_VERSION="4.4.14"
cd /tmp
wget "https://assets.nagios.com/downloads/nagioscore/releases/nagios-${NAGIOS_VERSION}.tar.gz"
tar xzf "nagios-${NAGIOS_VERSION}.tar.gz"
cd "nagios-${NAGIOS_VERSION}"

# Configure, compile, and install
./configure --with-command-group=nagcmd
make all
sudo make install
sudo make install-init
sudo make install-commandmode
sudo make install-config
sudo make install-webconf

# Enable Apache modules
sudo a2enmod rewrite cgi
sudo systemctl restart apache2

# Set Nagios admin password for web UI
sudo htpasswd -c /usr/local/nagios/etc/htpasswd.users nagiosadmin

# Enable and start Nagios
sudo systemctl enable --now nagios

# Check status
sudo systemctl status nagios
```

The Nagios web interface will be available at `http://your-server/nagios`.

## Installing Nagios Plugins

Nagios relies on plugins to perform checks. Install the standard plugins:

```bash
# Install plugin dependencies
sudo apt install -y libmysqlclient-dev libpq-dev

# Download and install Nagios Plugins
PLUGINS_VERSION="2.4.6"
cd /tmp
wget "https://nagios-plugins.org/download/nagios-plugins-${PLUGINS_VERSION}.tar.gz"
tar xzf "nagios-plugins-${PLUGINS_VERSION}.tar.gz"
cd "nagios-plugins-${PLUGINS_VERSION}"

./configure --with-nagios-user=nagios --with-nagios-group=nagios
make
sudo make install

# Verify plugins are installed
ls /usr/local/nagios/libexec/ | head -20
```

## Directory Structure

Understanding where Nagios stores its files:

```
/usr/local/nagios/
├── bin/                  # Nagios binary
├── etc/                  # Configuration files
│   ├── nagios.cfg        # Main configuration
│   ├── cgi.cfg           # Web interface settings
│   ├── htpasswd.users    # Web UI passwords
│   ├── resource.cfg      # Macro definitions
│   └── objects/          # Object definitions
│       ├── contacts.cfg
│       ├── timeperiods.cfg
│       ├── templates.cfg
│       ├── commands.cfg
│       ├── localhost.cfg  # Default localhost monitoring
│       └── windows.cfg    # Windows hosts (example)
├── var/                  # Runtime data
│   ├── nagios.log        # Main log file
│   ├── status.dat        # Current status data
│   └── rw/               # External command pipe
├── libexec/              # Plugin binaries
└── share/                # Web interface files
```

## Configuring Host and Service Checks

### Main Configuration

Edit `/usr/local/nagios/etc/nagios.cfg` to include your custom configuration files:

```bash
# Add a line to include your servers directory
echo "cfg_dir=/usr/local/nagios/etc/servers" | \
  sudo tee -a /usr/local/nagios/etc/nagios.cfg

# Create the servers directory
sudo mkdir -p /usr/local/nagios/etc/servers
sudo chown nagios:nagios /usr/local/nagios/etc/servers
```

### Defining Contacts

```bash
sudo tee /usr/local/nagios/etc/objects/contacts.cfg << 'EOF'
define contact {
    contact_name                    nagiosadmin
    use                             generic-contact
    alias                           Nagios Admin
    email                           admin@example.com
    service_notification_period     24x7
    host_notification_period        24x7
    service_notification_options    w,u,c,r,f,s
    host_notification_options       d,u,r,f,s
    service_notification_commands   notify-service-by-email
    host_notification_commands      notify-host-by-email
}

define contactgroup {
    contactgroup_name   admins
    alias               Nagios Administrators
    members             nagiosadmin
}
EOF
```

### Monitoring a Remote Linux Server

```bash
sudo tee /usr/local/nagios/etc/servers/webserver01.cfg << 'EOF'
# Define the host
define host {
    use                     linux-server
    host_name               webserver01
    alias                   Web Server 01
    address                 192.168.1.20
    max_check_attempts      5
    check_period            24x7
    notification_interval   30
    notification_period     24x7
}

# Check HTTP
define service {
    use                     generic-service
    host_name               webserver01
    service_description     HTTP
    check_command           check_http
    check_interval          5
    retry_interval          1
    max_check_attempts      4
    notification_interval   30
}

# Check HTTPS
define service {
    use                     generic-service
    host_name               webserver01
    service_description     HTTPS
    check_command           check_https
    check_interval          5
    retry_interval          1
    max_check_attempts      4
}

# Check SSH
define service {
    use                     generic-service
    host_name               webserver01
    service_description     SSH
    check_command           check_ssh
}

# Check disk space via NRPE (requires NRPE agent on remote)
define service {
    use                     generic-service
    host_name               webserver01
    service_description     Root Disk
    check_command           check_nrpe!check_disk
}
EOF
```

## Installing NRPE for Remote Checks

NRPE (Nagios Remote Plugin Executor) allows Nagios to run plugins on remote hosts:

```bash
# On the remote host to be monitored
sudo apt install -y nagios-nrpe-server nagios-plugins

# Configure NRPE
sudo tee /etc/nagios/nrpe.cfg << 'EOF'
# Allow connections from Nagios server
allowed_hosts=127.0.0.1,192.168.1.10

# Security
dont_blame_nrpe=0
allow_bash_command_substitution=0
debug=0
command_timeout=60
connection_timeout=300

# Define check commands
command[check_users]=/usr/lib/nagios/plugins/check_users -w 5 -c 10
command[check_load]=/usr/lib/nagios/plugins/check_load -r -w 0.15,0.10,0.05 -c 0.30,0.25,0.20
command[check_disk]=/usr/lib/nagios/plugins/check_disk -w 20% -c 10% -p /
command[check_zombie_procs]=/usr/lib/nagios/plugins/check_procs -w 5 -c 10 -s Z
command[check_total_procs]=/usr/lib/nagios/plugins/check_procs -w 150 -c 200
command[check_mem]=/usr/lib/nagios/plugins/check_free_mem.sh -w 20 -c 10
EOF

# Enable and start NRPE
sudo systemctl enable --now nagios-nrpe-server

# On the Nagios server, test NRPE connectivity
/usr/local/nagios/libexec/check_nrpe -H 192.168.1.20 -c check_disk
```

## Configuring Email Notifications

```bash
# Install mail utilities
sudo apt install -y mailutils postfix

# Test email sending from Nagios
echo "Test notification" | mail -s "Nagios Test" admin@example.com

# View the notification commands in commands.cfg
sudo grep -A5 "notify.*email" /usr/local/nagios/etc/objects/commands.cfg
```

## Validating Configuration

Always validate before reloading:

```bash
# Check configuration syntax
sudo /usr/local/nagios/bin/nagios -v /usr/local/nagios/etc/nagios.cfg

# Output shows any errors
# Look for "Total Warnings: 0" and "Total Errors: 0"

# Reload Nagios after making changes
sudo systemctl reload nagios

# Or restart if reload is not sufficient
sudo systemctl restart nagios
```

## Monitoring Nagios Status

```bash
# Check Nagios log for errors and alerts
sudo tail -f /usr/local/nagios/var/nagios.log

# Check service status counts
sudo /usr/local/nagios/bin/nagiostats | grep -E "Host|Service"

# Monitor the web UI for visual status
# http://your-server/nagios

# Check for any stale checks (checks not running)
sudo grep "STALE" /usr/local/nagios/var/nagios.log | tail -20
```

## Performance Tuning

For monitoring many hosts:

```bash
# Edit nagios.cfg for performance
sudo tee -a /usr/local/nagios/etc/nagios.cfg << 'EOF'

# Parallel check execution
max_concurrent_checks=50

# Check result processing
check_result_reaper_frequency=5
max_check_result_reaper_time=30

# External command processing
check_external_commands=1
command_check_interval=-1

# Performance data
process_performance_data=1
EOF

sudo systemctl restart nagios
```

Nagios is verbose in configuration but that verbosity is also clarity - you always know exactly what is being checked, how often, and what happens when it fails. For teams managing heterogeneous infrastructure with existing Nagios expertise and plugin libraries, it remains a dependable monitoring foundation.
