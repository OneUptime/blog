# How to Monitor Remote Hosts with Nagios NRPE on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Nagios, NRPE, Remote Monitoring, Agent, Plugins

Description: Install and configure Nagios NRPE on RHEL to execute monitoring plugins on remote hosts, enabling Nagios to check local resources like CPU, disk, and memory from a central server.

---

NRPE (Nagios Remote Plugin Executor) is an agent that runs on remote RHEL hosts and executes Nagios plugins locally. The Nagios server contacts NRPE on each host, which runs the requested check and returns the results. This approach is more flexible than SNMP for custom checks.

## Install NRPE on the Remote RHEL Host

```bash
# Enable EPEL repository
sudo dnf install -y epel-release

# Install NRPE and Nagios plugins
sudo dnf install -y nrpe nagios-plugins-all
```

## Configure NRPE on the Remote Host

```bash
# Edit the NRPE configuration
sudo vi /etc/nagios/nrpe.cfg

# Key settings to change:
# Allow the Nagios server to connect
# allowed_hosts=127.0.0.1,::1,192.168.1.10

# Verify the plugin path
# command[check_users]=/usr/lib64/nagios/plugins/check_users -w 5 -c 10
# command[check_load]=/usr/lib64/nagios/plugins/check_load -r -w .15,.10,.05 -c .30,.25,.20
# command[check_disk]=/usr/lib64/nagios/plugins/check_disk -w 20% -c 10% -p /
# command[check_zombie_procs]=/usr/lib64/nagios/plugins/check_procs -w 5 -c 10 -s Z
# command[check_total_procs]=/usr/lib64/nagios/plugins/check_procs -w 150 -c 200
```

Add custom check commands:

```bash
# Add custom NRPE commands
sudo tee -a /etc/nagios/nrpe.cfg << 'EOF'

# Check memory usage
command[check_mem]=/usr/lib64/nagios/plugins/check_swap -w 20% -c 10%

# Check specific service is running
command[check_httpd]=/usr/lib64/nagios/plugins/check_procs -c 1: -w 3: -C httpd

# Check disk on /var partition
command[check_var_disk]=/usr/lib64/nagios/plugins/check_disk -w 20% -c 10% -p /var
EOF
```

## Start NRPE on the Remote Host

```bash
# Enable and start NRPE
sudo systemctl enable --now nrpe

# Open the firewall for NRPE (port 5666)
sudo firewall-cmd --permanent --add-port=5666/tcp
sudo firewall-cmd --reload
```

## Install the NRPE Plugin on the Nagios Server

```bash
# On the Nagios server, install the check_nrpe plugin
sudo dnf install -y epel-release
sudo dnf install -y nagios-plugins-nrpe

# Or if built from source, the plugin is at:
# /usr/local/nagios/libexec/check_nrpe
```

## Test NRPE Connectivity

```bash
# From the Nagios server, test connecting to the remote host
/usr/lib64/nagios/plugins/check_nrpe -H 192.168.1.50

# Run a specific check
/usr/lib64/nagios/plugins/check_nrpe -H 192.168.1.50 -c check_load
/usr/lib64/nagios/plugins/check_nrpe -H 192.168.1.50 -c check_disk
```

## Define NRPE Commands in Nagios

```bash
# Add the check_nrpe command definition on the Nagios server
# In /usr/local/nagios/etc/objects/commands.cfg
sudo tee -a /usr/local/nagios/etc/objects/commands.cfg << 'EOF'

define command {
    command_name    check_nrpe
    command_line    /usr/lib64/nagios/plugins/check_nrpe -H $HOSTADDRESS$ -c $ARG1$
}
EOF
```

## Define Host and Services

```bash
sudo tee /usr/local/nagios/etc/objects/rhel-nrpe.cfg << 'EOF'
define host {
    use                 linux-server
    host_name           rhel-app01
    alias               RHEL App Server 01
    address             192.168.1.50
}

define service {
    use                 generic-service
    host_name           rhel-app01
    service_description CPU Load
    check_command       check_nrpe!check_load
}

define service {
    use                 generic-service
    host_name           rhel-app01
    service_description Disk Usage
    check_command       check_nrpe!check_disk
}

define service {
    use                 generic-service
    host_name           rhel-app01
    service_description Users
    check_command       check_nrpe!check_users
}

define service {
    use                 generic-service
    host_name           rhel-app01
    service_description Apache
    check_command       check_nrpe!check_httpd
}
EOF

# Include the config and reload
echo 'cfg_file=/usr/local/nagios/etc/objects/rhel-nrpe.cfg' | \
    sudo tee -a /usr/local/nagios/etc/nagios.cfg

sudo /usr/local/nagios/bin/nagios -v /usr/local/nagios/etc/nagios.cfg
sudo systemctl reload nagios
```

NRPE gives you the flexibility to run any Nagios plugin locally on the remote host, making it easy to monitor things that are not exposed over the network.
