# How to Migrate from Debian to RHEL 9 with Minimal Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Security, Migration, Debian

Description: Step-by-step guide on migrate from debian to rhel 9 with minimal downtime with practical examples and commands.

---

Migrating from Debian to RHEL 9 involves package mapping and configuration conversion. This guide minimizes downtime during the transition.

## Pre-Migration Assessment

```bash
# On Debian, document current state
dpkg --list > /tmp/debian-packages.txt
systemctl list-unit-files --state=enabled > /tmp/debian-services.txt
ip addr show > /tmp/debian-network.txt
```

## Deploy RHEL 9 in Parallel

Set up RHEL 9 alongside the existing Debian system:

```bash
sudo subscription-manager register
sudo dnf update -y
```

## Install Equivalent Packages

```bash
# Map Debian packages to RHEL
sudo dnf install -y httpd mariadb-server php php-mysqlnd \
  postfix rsyslog cronie
```

## Migrate Configurations

```bash
# Sync application data
rsync -aAXv debian-server:/etc/apache2/ /tmp/apache2-config/
# Convert to RHEL httpd format manually

# Migrate crontabs
crontab -u www-data /tmp/debian-crontab
```

## Configure Networking

```bash
sudo nmcli con mod eth0 ipv4.addresses "$(grep address /tmp/debian-network.txt)"
sudo nmcli con mod eth0 ipv4.gateway "$(grep gateway /tmp/debian-network.txt)"
sudo nmcli con up eth0
```

## DNS Cutover

Update DNS records to point to the new RHEL 9 server:

```bash
# Reduce TTL before migration
# Switch DNS records
# Monitor for errors
```

## Verify

```bash
sudo systemctl status httpd mariadb
curl -I http://new-rhel-server
```

## Conclusion

Debian to RHEL 9 migration is best done as a parallel deployment with data synchronization. This approach minimizes downtime and allows easy rollback by simply reverting DNS changes.

