# How to Monitor Remote Hosts with Nagios NRPE on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Nagios, NRPE, Remote Monitoring

Description: Use Nagios NRPE on RHEL 9 to monitor remote hosts and execute remote checks.

---

## Overview

Use Nagios NRPE on RHEL 9 to monitor remote hosts and execute remote checks. Effective monitoring is critical for maintaining system health, detecting issues early, and planning capacity.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- Network access from the Nagios monitoring server to the remote host

## Step 1 - Install Required Packages

Install the monitoring tools relevant to this guide:

```bash
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm
sudo dnf install -y nrpe nagios-plugins-nrpe nagios-plugins-load
```

Select only the Nagios plugins you need for your specific checks.

## Step 2 - Enable and Start Services

```bash
sudo systemctl enable --now nrpe.service
```

## Step 3 - Configure the Monitoring Tool

Edit the NRPE configuration file on the remote host:

```bash
sudo vi /etc/nagios/nrpe.cfg
```

Allow your Nagios monitoring server and define the remote checks you want NRPE to run:

```text
allowed_hosts=127.0.0.1,<nagios-server-ip>
command[check_load]=/usr/lib64/nagios/plugins/check_load -w 15,10,5 -c 30,25,20
```

Apply your changes and restart the service:

```bash
sudo systemctl restart nrpe.service
```

## Step 4 - Open Firewall Ports

```bash
sudo firewall-cmd --permanent --add-port=5666/tcp
sudo firewall-cmd --reload
```

## Step 5 - Verify Data Collection

Confirm that NRPE is responding locally on the remote host:

```bash
/usr/lib64/nagios/plugins/check_nrpe -H 127.0.0.1
/usr/lib64/nagios/plugins/check_nrpe -H 127.0.0.1 -c check_load
```

From the Nagios monitoring server, replace `remote-host-ip` with the remote host address and run the same check.

```bash
/usr/lib64/nagios/plugins/check_nrpe -H remote-host-ip -c check_load
```

## Step 6 - Set Up Alerting (Optional)

Configure alerts based on thresholds so you are notified before issues become critical. Add Nagios host and service definitions that call `check_nrpe` with the remote command name you configured, then verify and reload your Nagios configuration.

## Summary

You now know how to monitor remote hosts with Nagios NRPE. Regular monitoring helps you detect performance degradation, plan capacity, and respond to incidents quickly on your RHEL 9 systems.
