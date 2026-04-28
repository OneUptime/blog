# How to Configure Nagios for IPv6 Host Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nagios, IPv6, Monitoring, ICMP, Service Checks, Network

Description: A guide to configuring Nagios Core and Nagios XI to monitor IPv6 hosts and services, including ICMP checks, TCP port checks, and HTTP monitoring.

Nagios supports IPv6 monitoring through plugins that handle IPv6 addresses natively. The `check_ping`, `check_tcp`, and `check_http` plugins all support IPv6 when invoked with the `-6` flag or an IPv6 target address.

## Step 1: Verify Nagios Plugin IPv6 Support

```bash
# Check that check_ping supports IPv6

/usr/lib/nagios/plugins/check_ping --help | grep -i ipv6

# Test a direct IPv6 ping check
/usr/lib/nagios/plugins/check_ping -H 2001:db8::10 -w 100,20% -c 500,60%
```

## Step 2: Define an IPv6 Host in Nagios

```cfg
# /etc/nagios/conf.d/ipv6-hosts.cfg - Define IPv6 hosts

# Host template for IPv6-only monitoring
define host {
    name                            ipv6-host-template
    use                             generic-host
    check_command                   check-host-alive-ipv6
    register                        0
}

# Production web server (IPv6)
define host {
    use                             ipv6-host-template
    host_name                       web-01-ipv6
    alias                           Web Server 01 (IPv6)
    # IPv6 address of the host
    address                         2001:db8::10
    hostgroups                      ipv6-web-servers
    contact_groups                  admins
}

define host {
    use                             ipv6-host-template
    host_name                       web-02-ipv6
    alias                           Web Server 02 (IPv6)
    address                         2001:db8::11
    hostgroups                      ipv6-web-servers
}
```

## Step 3: Define IPv6 Check Commands

```cfg
# /etc/nagios/conf.d/commands-ipv6.cfg - IPv6-capable check commands

# ICMP ping over IPv6 (check_ping auto-detects IPv6 literals in $HOSTADDRESS$)
define command {
    command_name    check-host-alive-ipv6
    command_line    $USER1$/check_ping -H $HOSTADDRESS$ -w 3000.0,80% -c 5000.0,100% -p 1 -t 20
}

# TCP port check over IPv6
define command {
    command_name    check-tcp-ipv6
    command_line    $USER1$/check_tcp -H $HOSTADDRESS$ -p $ARG1$
}

# HTTP check over IPv6 (uses curl internally or accepts IPv6 addresses)
define command {
    command_name    check-http-ipv6
    command_line    $USER1$/check_http -H $ARG1$ -I $HOSTADDRESS$ -p $ARG2$ -u $ARG3$
}

# SSH check over IPv6
define command {
    command_name    check-ssh-ipv6
    command_line    $USER1$/check_ssh -H $HOSTADDRESS$
}
```

## Step 4: Define Services for IPv6 Hosts

```cfg
# /etc/nagios/conf.d/ipv6-services.cfg - Services for IPv6 hosts

# HTTP check on IPv6 web servers
define service {
    use                     generic-service
    hostgroup_name          ipv6-web-servers
    service_description     HTTP IPv6
    check_command           check-http-ipv6!example.com!80!/
    check_interval          5
    retry_interval          1
    max_check_attempts      3
}

# HTTPS check
define service {
    use                     generic-service
    hostgroup_name          ipv6-web-servers
    service_description     HTTPS IPv6
    check_command           check-http-ipv6!example.com!443!/
    check_interval          5
}

# SSH check
define service {
    use                     generic-service
    host_name               web-01-ipv6
    service_description     SSH IPv6
    check_command           check-ssh-ipv6
}
```

## Step 5: Define IPv6 Host Groups and Contacts

```cfg
# /etc/nagios/conf.d/hostgroups.cfg
define hostgroup {
    hostgroup_name  ipv6-web-servers
    alias           IPv6 Web Servers
    members         web-01-ipv6,web-02-ipv6
}
```

## Step 6: Validate and Reload Nagios

```bash
# Validate the configuration
sudo nagios -v /etc/nagios/nagios.cfg

# If no errors, reload
sudo systemctl reload nagios

# Check the Nagios status page for new IPv6 hosts
curl http://localhost/nagios/cgi-bin/status.cgi?host=web-01-ipv6
```

## Step 7: Test IPv6 Plugin Checks Manually

```bash
# Manual ICMP check
/usr/lib/nagios/plugins/check_ping -H 2001:db8::10 -w 100,20% -c 500,60%

# Manual HTTP check to IPv6 host
/usr/lib/nagios/plugins/check_http -H example.com -I 2001:db8::10 -p 80 -u /

# Manual TCP port check
/usr/lib/nagios/plugins/check_tcp -H 2001:db8::10 -p 443
```

Nagios monitors IPv6 hosts using the same plugin framework as IPv4, with the host's `address` field containing the IPv6 address - no separate configuration is needed beyond defining the hosts and ensuring the plugins support IPv6 target addresses.
