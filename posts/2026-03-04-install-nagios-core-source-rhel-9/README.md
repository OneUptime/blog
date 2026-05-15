# How to Install Nagios Core from Source on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Nagios, Monitoring, Linux

Description: Install Nagios Core from source on RHEL 9 for comprehensive infrastructure monitoring.

---

## Overview

Install Nagios Core from source on RHEL 9 for comprehensive infrastructure monitoring. Effective monitoring is critical for maintaining system health, detecting issues early, and planning capacity.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- Network access to download Nagios Core and Nagios Plugins source releases

## Step 1 - Install Required Packages

Install the build tools and web server packages required for Nagios Core:

```bash
sudo dnf install -y gcc glibc glibc-common make perl httpd php wget gd gd-devel s-nail postfix openssl-devel httpd-tools
sudo dnf update -y
```

Nagios Core's source installation guide assumes SELinux is disabled or running in permissive mode. To set permissive mode for the current boot when SELinux is enforcing:

```bash
if [ "$(getenforce)" = "Enforcing" ]; then
  sudo setenforce 0
fi
```

## Step 2 - Download and Compile Nagios Core

Download the latest Nagios Core source release, extract it, and build it:

```bash
cd /tmp
wget --output-document="nagioscore.tar.gz" "$(wget -q -O - https://api.github.com/repos/NagiosEnterprises/nagioscore/releases/latest | grep '"browser_download_url":' | grep -o 'https://[^"]*')"
tar xzf nagioscore.tar.gz
cd /tmp/nagios-*
./configure
make all
```

## Step 3 - Install Nagios Core

Create the Nagios user and group, add Apache to the Nagios group, and install the binaries, service files, sample configuration, and Apache configuration:

```bash
sudo make install-groups-users
sudo usermod -a -G nagios apache
sudo make install
sudo make install-daemoninit
sudo make install-commandmode
sudo make install-config
sudo make install-webconf
```

Create the `nagiosadmin` web login. You will be prompted to set a password:

```bash
sudo htpasswd -c /usr/local/nagios/etc/htpasswd.users nagiosadmin
```

When adding more users later, omit `-c` so the existing password file is not replaced.

## Step 4 - Open Firewall Ports

Allow HTTP access to the Nagios Core web interface:

```bash
sudo firewall-cmd --zone=public --add-port=80/tcp
sudo firewall-cmd --zone=public --add-port=80/tcp --permanent
```

Start Apache and Nagios:

```bash
sudo systemctl enable --now httpd.service
sudo systemctl enable --now nagios.service
```

## Step 5 - Verify Nagios Core

Check the Nagios configuration before using the web interface:

```bash
sudo /usr/local/nagios/bin/nagios -v /usr/local/nagios/etc/nagios.cfg
sudo systemctl status nagios.service
```

Then open the Nagios web interface in a browser:

```text
http://your-server-ip/nagios
```

Log in as `nagiosadmin` with the password you created earlier.

## Step 6 - Install Nagios Plugins

Nagios Core needs plugins to run the default host and service checks. Enable the required repositories, install plugin build dependencies, and compile the plugins from source:

```bash
cd /tmp
sudo dnf -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-x86_64-rpms
sudo dnf install -y gcc glibc glibc-common make gettext automake autoconf wget openssl-devel net-snmp net-snmp-utils perl-Net-SNMP

wget --output-document="nagios-plugins.tar.gz" "$(wget -q -O - https://api.github.com/repos/nagios-plugins/nagios-plugins/releases/latest | grep '"browser_download_url":' | grep -o 'https://[^"]*')"
tar zxf nagios-plugins.tar.gz
cd /tmp/nagios-plugins-*
./configure
make
sudo make install
```

Restart Nagios after installing the plugins:

```bash
sudo systemctl restart nagios.service
```

## Summary

You now know how to install Nagios Core from source. Regular monitoring helps you detect performance degradation, plan capacity, and respond to incidents quickly on your RHEL 9 systems.
