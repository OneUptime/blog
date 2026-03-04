# How to Migrate from Ubuntu Server to RHEL Step by Step

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ubuntu, Migration, Linux, Server

Description: Plan and execute a migration from Ubuntu Server to RHEL by rebuilding services on RHEL with equivalent packages and configurations.

---

There is no in-place conversion tool from Ubuntu to RHEL because they use fundamentally different package formats (DEB vs RPM). Migration requires building a new RHEL server and migrating your workloads. Here is a structured approach.

## Phase 1: Inventory Your Ubuntu System

Document everything running on the Ubuntu server:

```bash
# On Ubuntu: List all installed packages
dpkg --get-selections | grep -v deinstall > /tmp/ubuntu-packages.txt

# List running services
systemctl list-units --type=service --state=running > /tmp/ubuntu-services.txt

# Document network configuration
ip addr show > /tmp/ubuntu-network.txt
cat /etc/netplan/*.yaml > /tmp/ubuntu-netplan.txt 2>/dev/null

# Export cron jobs
for user in $(cut -f1 -d: /etc/passwd); do
    crontab -l -u "$user" 2>/dev/null
done > /tmp/ubuntu-crontabs.txt

# List firewall rules
sudo ufw status verbose > /tmp/ubuntu-firewall.txt
```

## Phase 2: Map Ubuntu Packages to RHEL Equivalents

Common package name differences:

```bash
# Ubuntu -> RHEL package name mapping
# apache2 -> httpd
# libapache2-mod-php -> php
# mysql-server -> mysql-server (or mariadb-server)
# postgresql -> postgresql-server
# python3-pip -> python3-pip
# nginx -> nginx
# ufw -> firewalld (different tool, not a package rename)
```

## Phase 3: Build the RHEL Server

```bash
# On the new RHEL server: Register and enable repositories
sudo subscription-manager register
sudo subscription-manager attach --auto

# Install equivalent packages
sudo dnf install httpd php php-mysqlnd mariadb-server

# Enable services
sudo systemctl enable --now httpd mariadb
```

## Phase 4: Migrate Configuration Files

Configuration paths differ between Ubuntu and RHEL:

```bash
# Apache configuration
# Ubuntu: /etc/apache2/sites-available/
# RHEL: /etc/httpd/conf.d/

# Copy and adapt the Apache config
scp ubuntu-server:/etc/apache2/sites-available/mysite.conf /tmp/
# Edit to use RHEL paths and directives
sudo cp /tmp/mysite.conf /etc/httpd/conf.d/mysite.conf

# Test the configuration
sudo httpd -t
```

## Phase 5: Migrate Data

```bash
# Transfer application data
sudo rsync -avz ubuntu-server:/var/www/html/ /var/www/html/

# Migrate database dumps
ssh ubuntu-server "sudo mysqldump --all-databases" > /tmp/all-databases.sql
sudo mysql < /tmp/all-databases.sql

# Fix file ownership for RHEL (Apache runs as 'apache', not 'www-data')
sudo chown -R apache:apache /var/www/html/
```

## Phase 6: Adjust for RHEL Differences

```bash
# Replace UFW rules with firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# SELinux is enabled on RHEL (Ubuntu uses AppArmor)
# Set proper SELinux contexts for web content
sudo restorecon -Rv /var/www/html/

# If your app writes to non-standard directories, add SELinux booleans
sudo setsebool -P httpd_can_network_connect on
```

## Phase 7: Test and Cutover

Test the RHEL server thoroughly before switching DNS or load balancer targets. Run parallel for at least a week if possible, comparing outputs from both systems.
