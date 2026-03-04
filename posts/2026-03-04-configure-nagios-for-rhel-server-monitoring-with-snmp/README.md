# How to Configure Nagios for RHEL Server Monitoring with SNMP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Nagios, SNMP, Monitoring, Server Monitoring, Net-SNMP

Description: Configure Nagios to monitor RHEL servers using SNMP, checking CPU load, memory usage, disk space, and network interfaces without installing agents.

---

SNMP-based monitoring lets Nagios check RHEL servers without installing the NRPE agent on each host. If your servers already run the SNMP daemon, you can query them directly from Nagios.

## Prerequisites

Ensure SNMP is configured on the target RHEL servers (see the SNMP monitoring guide). On the Nagios server, install the SNMP plugins.

```bash
# Install SNMP utilities and Nagios SNMP plugins on the Nagios server
sudo dnf install -y net-snmp-utils perl-Net-SNMP

# Download and install additional SNMP plugins for Nagios
cd /tmp
wget https://github.com/nagios-plugins/nagios-plugins/releases/download/release-2.4.8/nagios-plugins-2.4.8.tar.gz
tar xzf nagios-plugins-2.4.8.tar.gz
cd nagios-plugins-2.4.8
./configure
make
sudo make install
```

## Define SNMP Command Templates

```bash
# Add SNMP check commands to Nagios
# Edit /usr/local/nagios/etc/objects/commands.cfg

sudo tee -a /usr/local/nagios/etc/objects/commands.cfg << 'EOF'

# SNMP check command for CPU load
define command {
    command_name    check_snmp_load
    command_line    $USER1$/check_snmp -H $HOSTADDRESS$ -C $ARG1$ -o .1.3.6.1.4.1.2021.10.1.3.1 -w $ARG2$ -c $ARG3$
}

# SNMP check for memory usage
define command {
    command_name    check_snmp_mem
    command_line    $USER1$/check_snmp -H $HOSTADDRESS$ -C $ARG1$ -o .1.3.6.1.4.1.2021.4.6.0,.1.3.6.1.4.1.2021.4.5.0 -l "Available RAM,Total RAM"
}

# SNMP check for disk usage
define command {
    command_name    check_snmp_disk
    command_line    $USER1$/check_snmp -H $HOSTADDRESS$ -C $ARG1$ -o .1.3.6.1.4.1.2021.9.1.9.1 -w $ARG2$ -c $ARG3$ -l "Disk % Used"
}

# SNMP check for interface status
define command {
    command_name    check_snmp_int
    command_line    $USER1$/check_snmp -H $HOSTADDRESS$ -C $ARG1$ -o .1.3.6.1.2.1.2.2.1.8.$ARG2$ -r 1 -l "Interface Status"
}

# SNMP check for system uptime
define command {
    command_name    check_snmp_uptime
    command_line    $USER1$/check_snmp -H $HOSTADDRESS$ -C $ARG1$ -o .1.3.6.1.2.1.1.3.0 -l "Uptime"
}
EOF
```

## Define the RHEL Host

```bash
# Create a host definition file
sudo tee /usr/local/nagios/etc/objects/rhel-servers.cfg << 'EOF'
# Host definition for a RHEL server
define host {
    use                 linux-server
    host_name           rhel-web01
    alias               RHEL Web Server 01
    address             192.168.1.50
    max_check_attempts  5
    check_period        24x7
    notification_interval  30
    notification_period    24x7
}

# Service: CPU Load via SNMP
define service {
    use                 generic-service
    host_name           rhel-web01
    service_description CPU Load (SNMP)
    check_command       check_snmp_load!myCommunity!4!8
}

# Service: Memory via SNMP
define service {
    use                 generic-service
    host_name           rhel-web01
    service_description Memory Usage (SNMP)
    check_command       check_snmp_mem!myCommunity
}

# Service: Disk Usage via SNMP
define service {
    use                 generic-service
    host_name           rhel-web01
    service_description Disk Usage (SNMP)
    check_command       check_snmp_disk!myCommunity!80!90
}

# Service: Uptime via SNMP
define service {
    use                 generic-service
    host_name           rhel-web01
    service_description System Uptime (SNMP)
    check_command       check_snmp_uptime!myCommunity
}
EOF
```

## Include the Configuration File

```bash
# Add the include to nagios.cfg
echo 'cfg_file=/usr/local/nagios/etc/objects/rhel-servers.cfg' | \
    sudo tee -a /usr/local/nagios/etc/nagios.cfg

# Verify configuration
sudo /usr/local/nagios/bin/nagios -v /usr/local/nagios/etc/nagios.cfg

# Reload Nagios
sudo systemctl reload nagios
```

## Test SNMP Checks Manually

```bash
# Test CPU load check
/usr/local/nagios/libexec/check_snmp -H 192.168.1.50 -C myCommunity \
    -o .1.3.6.1.4.1.2021.10.1.3.1 -w 4 -c 8

# Test disk check
/usr/local/nagios/libexec/check_snmp -H 192.168.1.50 -C myCommunity \
    -o .1.3.6.1.4.1.2021.9.1.9.1 -w 80 -c 90
```

SNMP monitoring is a good approach when you cannot or do not want to install agents on every server. The tradeoff is less flexibility compared to NRPE.
