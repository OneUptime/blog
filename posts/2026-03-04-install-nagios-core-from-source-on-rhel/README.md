# How to Install Nagios Core from Source on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Nagios, Monitoring, Installation, Apache, Source Build

Description: Compile and install Nagios Core from source on RHEL with the Nagios Plugins, configure Apache for the web interface, and verify the installation.

---

Nagios Core is one of the most established open-source monitoring tools. While not available in the standard RHEL repositories, it can be compiled from source. This guide covers the full installation process.

## Install Dependencies

```bash
# Install build tools and required libraries

# Enable EPEL and CodeReady Builder for plugin dependencies on RHEL 9
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-x86_64-rpms

sudo dnf install -y gcc glibc glibc-common make gettext automake autoconf \
    wget httpd php gd gd-devel perl openssl-devel unzip s-nail postfix \
    net-snmp net-snmp-utils perl-Net-SNMP
```

## Create the Nagios User and Group

```bash
# Create the nagios user and group
sudo useradd nagios
sudo groupadd nagcmd

# Add nagios and apache users to the nagcmd group
sudo usermod -aG nagcmd nagios
sudo usermod -aG nagcmd apache
```

## Download and Compile Nagios Core

```bash
cd /tmp

# Download Nagios Core source
wget https://github.com/NagiosEnterprises/nagioscore/releases/download/nagios-4.5.12/nagios-4.5.12.tar.gz
tar xzf nagios-4.5.12.tar.gz
cd nagios-4.5.12

# Configure the build
./configure --with-command-group=nagcmd

# Compile
make all

# Install Nagios, daemon files, configs, and web interface
sudo make install
sudo make install-daemoninit
sudo make install-commandmode
sudo make install-config
sudo make install-webconf
```

## Install Nagios Plugins

```bash
cd /tmp

# Download plugins
wget https://github.com/nagios-plugins/nagios-plugins/releases/download/release-2.5/nagios-plugins-2.5.tar.gz
tar xzf nagios-plugins-2.5.tar.gz
cd nagios-plugins-2.5

# Compile and install plugins
./configure --with-nagios-user=nagios --with-nagios-group=nagios
make
sudo make install
```

## Configure the Web Interface

```bash
# Create the nagiosadmin user for web access
sudo htpasswd -c /usr/local/nagios/etc/htpasswd.users nagiosadmin

# Enable and start Apache
sudo systemctl enable --now httpd

# Verify the Nagios Apache config was installed
cat /etc/httpd/conf.d/nagios.conf
```

## Configure SELinux

```bash
# Allow Apache to run Nagios CGI scripts
sudo setsebool -P httpd_enable_cgi on

# If SELinux blocks access, set the correct contexts
sudo chcon -R -t httpd_sys_content_t /usr/local/nagios/share/
sudo chcon -R -t httpd_sys_script_exec_t /usr/local/nagios/sbin/
sudo chcon -R -t httpd_sys_rw_content_t /usr/local/nagios/var/
```

## Verify Configuration and Start

```bash
# Verify the Nagios configuration is valid
sudo /usr/local/nagios/bin/nagios -v /usr/local/nagios/etc/nagios.cfg

# Enable and start Nagios
sudo systemctl enable --now nagios

# Open firewall for HTTP
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

## Access the Web Interface

Open `http://your-server/nagios` in a browser and log in with the `nagiosadmin` credentials you created.

## Verify Monitoring Works

```bash
# Check that Nagios is running
systemctl status nagios

# Check the Nagios log
tail -20 /usr/local/nagios/var/nagios.log

# List installed plugins
ls /usr/local/nagios/libexec/

# Test a plugin manually
/usr/local/nagios/libexec/check_load -w 5,4,3 -c 10,8,6
```

Nagios Core provides a solid foundation for infrastructure monitoring. After installation, you can add host and service definitions to monitor your RHEL servers, network devices, and applications.
