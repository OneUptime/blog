# How to Configure Nagios for RHEL 9 Server Monitoring with SNMP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Nagios, SNMP, Monitoring

Description: Configure Nagios with SNMP on RHEL 9 for monitoring server resources.

---

## Overview

Configure Nagios with SNMP on RHEL 9 for monitoring server resources. Effective monitoring is critical for maintaining system health, detecting issues early, and planning capacity.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- A Nagios Core or Nagios XI server with the `check_snmp` plugin installed
- Network access from the Nagios server to UDP port 161 on the RHEL 9 host

## Step 1 - Install Required Packages

Install the monitoring tools relevant to this guide:

```bash
sudo dnf install -y net-snmp net-snmp-utils
```

Install the Nagios SNMP plugin on the Nagios server if it is not already available.

## Step 2 - Enable and Start Services

```bash
sudo systemctl enable --now snmpd.service
```

## Step 3 - Configure the Monitoring Tool

Configure SNMP on the RHEL 9 host. For SNMPv3, create a read-only user and restart the agent:

```bash
sudo systemctl stop snmpd.service
sudo net-snmp-create-v3-user -ro -A 'replace-with-auth-password' -a SHA -X 'replace-with-privacy-password' -x AES nagios
sudo systemctl start snmpd.service
```

The SNMP agent uses `/etc/snmp/snmpd.conf` for its main configuration and stores SNMPv3 user credentials in the persistent Net-SNMP configuration.

On the Nagios server, define a command that uses the SNMP plugin:

```nagios
define command {
    command_name    check_snmp_v3
    command_line    $USER1$/check_snmp -H $HOSTADDRESS$ -P 3 -L authPriv -U $ARG1$ -a SHA -A $ARG2$ -x AES -X $ARG3$ -o $ARG4$
}
```

Then add a service check for the RHEL 9 host:

```nagios
define service {
    use                    generic-service
    host_name              rhel9-server
    service_description    SNMP Uptime
    check_command          check_snmp_v3!nagios!replace-with-auth-password!replace-with-privacy-password!sysUpTime.0
}
```

## Step 4 - Open Firewall Ports

```bash
sudo firewall-cmd --permanent --add-service=snmp     # SNMP
sudo firewall-cmd --reload
```

## Step 5 - Verify Data Collection

Confirm that metrics are being collected:

```bash
# From the RHEL 9 host
snmpwalk -v3 -l authPriv -u nagios -a SHA -A 'replace-with-auth-password' -x AES -X 'replace-with-privacy-password' localhost sysUpTime.0

# From the Nagios server
/usr/local/nagios/libexec/check_snmp -H rhel9-server.example.com -P 3 -L authPriv -U nagios -a SHA -A 'replace-with-auth-password' -x AES -X 'replace-with-privacy-password' -o sysUpTime.0
```

## Step 6 - Set Up Alerting (Optional)

Configure Nagios notifications and add thresholds to service checks where the selected OID returns a numeric value. You can also use Red Hat Insights recommendations depending on your stack.

## Summary

You now know how to configure nagios for rhel 9 server monitoring with snmp. Regular monitoring helps you detect performance degradation, plan capacity, and respond to incidents quickly on your RHEL 9 systems.
