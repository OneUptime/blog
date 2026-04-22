# How to Set Up SNMP Monitoring in Nagios for IPv4 Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nagios, SNMP, Network Monitoring, IPv4, Plugin, Alerting

Description: Learn how to configure Nagios to monitor IPv4 network devices via SNMP, including installing SNMP plugins, creating host definitions, and setting up service checks.

## Nagios SNMP Monitoring Architecture

Nagios uses the `check_snmp` plugin from Monitoring Plugins with Net-SNMP to poll SNMP OIDs on monitored devices. Each service check runs the plugin on a schedule and reports OK/WARNING/CRITICAL status based on configurable thresholds.

## Step 1: Install Nagios and SNMP Plugins

```bash
# Install Nagios Core and plugins (Ubuntu/Debian)

sudo apt-get install -y nagios4 monitoring-plugins

# Install Net-SNMP tools and optional MIB downloader
sudo apt-get install -y snmp snmp-mibs-downloader

# Download MIBs for better OID resolution
sudo download-mibs
```

## Step 2: Define a Network Device Host

Create a host configuration file for a Cisco router:

```text
# /etc/nagios4/conf.d/cisco-router.cfg

define host {
    host_name               core-router-01
    alias                   Core Router - Building 1
    address                 192.168.1.1
    max_check_attempts      3
    check_period            24x7
    notification_interval   30
    notification_period     24x7
    check_command           check-host-alive
    contact_groups          admins
}
```

## Step 3: Create SNMP Service Checks

Define service checks for common SNMP metrics:

```text
# Check system uptime via SNMP (sysUpTime.0)
define service {
    use                     generic-service
    host_name               core-router-01
    service_description     SNMP - System Uptime
    check_command           check_snmp!-P 2c -C public -o .1.3.6.1.2.1.1.3.0 -l "System Uptime"
    max_check_attempts      3
    check_interval          5
    retry_interval          1
    notification_interval   30
    check_period            24x7
    notification_period     24x7
}

# Check interface operational status (1=up, 2=down)
define service {
    use                     generic-service
    host_name               core-router-01
    service_description     SNMP - GigE0/0 Status
    check_command           check_snmp!-P 2c -C public -o .1.3.6.1.2.1.2.2.1.8.1 -s 1 -l "Interface Status"
    check_interval          2
    notification_period     24x7
}

# Check interface utilization (ifHCInOctets for GigE0/0 - index 1)
define service {
    use                     generic-service
    host_name               core-router-01
    service_description     SNMP - GigE0/0 RX Bandwidth
    check_command           check_snmp!-P 2c -C public -o .1.3.6.1.2.1.31.1.1.1.6.1 -w 100000000 -c 900000000 --rate --rate-multiplier 8 -l "RX Bandwidth" -u "bps"
    check_interval          5
    notification_period     24x7
}
```

## Step 4: Create SNMP Commands

Define a shortcut command for bandwidth monitoring. On Ubuntu/Debian, the default Nagios configuration already includes the base `check_snmp` command.

```text
# /etc/nagios4/conf.d/commands.cfg

# Shortcut for bandwidth monitoring
define command {
    command_name    check_snmp_bandwidth
    command_line    /usr/lib/nagios/plugins/check_snmp \
        -H $HOSTADDRESS$ \
        -P 2c \
        -C $ARG1$ \
        -o .1.3.6.1.2.1.31.1.1.1.6.$ARG2$,.1.3.6.1.2.1.31.1.1.1.10.$ARG2$ \
        -w $ARG3$,$ARG3$ \
        -c $ARG4$,$ARG4$ \
        --rate \
        --rate-multiplier 8
}
```

## Step 5: Use check_snmp with Rate Calculation

For bandwidth monitoring, use the `--rate` flag to calculate per-second rates:

```bash
# Test check_snmp with rate calculation
/usr/lib/nagios/plugins/check_snmp \
  -H 192.168.1.1 \
  -P 2c \
  -C public \
  -o .1.3.6.1.2.1.31.1.1.1.6.1,.1.3.6.1.2.1.31.1.1.1.10.1 \
  -w 100000000,100000000 \
  -c 900000000,900000000 \
  --rate \
  --rate-multiplier 8

# --rate calculates per-second rate from counter deltas
# --rate-multiplier 8 converts bytes/s to bits/s
```

## Step 6: Monitor BGP Peer Status via SNMP

```text
# Define BGP peer state check
# OID: .1.3.6.1.2.1.15.3.1.2.{neighbor-ip-as-dotted-decimal}
# bgpPeerState for neighbor 203.0.113.1:
define service {
    use                     generic-service
    host_name               core-router-01
    service_description     BGP Peer 203.0.113.1 State
    check_command           check_snmp!-P 2c -C public \
        -o .1.3.6.1.2.1.15.3.1.2.203.0.113.1 \
        -s 6 \
        -l "BGP Peer State"
    notification_period     24x7
}
```

## Step 7: Reload Nagios and Verify

```bash
# Validate configuration syntax
sudo nagios4 -v /etc/nagios4/nagios.cfg

# Reload if configuration is valid
sudo systemctl reload nagios4

# Check that services are being monitored
# In the Nagios web UI: http://server/nagios4

# Test a specific check from the command line
/usr/lib/nagios/plugins/check_snmp -H 192.168.1.1 -P 2c -C public -o .1.3.6.1.2.1.1.1.0
```

## Conclusion

Nagios SNMP monitoring uses the `check_snmp` plugin to poll OIDs and compare values against thresholds. Define hosts, pass the SNMP protocol version and community into service checks, create checks for system uptime, interface status, and bandwidth, and use `--rate` for counter-based metrics. Combine with SNMP trap reception (using a trap daemon that runs external commands) for event-driven alerting alongside scheduled polling.
