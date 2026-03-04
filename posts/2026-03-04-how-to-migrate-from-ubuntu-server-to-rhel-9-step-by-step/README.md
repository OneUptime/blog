# How to Migrate from Ubuntu Server to RHEL 9 Step by Step

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Migration, Ubuntu

Description: Step-by-step guide on migrate from ubuntu server to rhel 9 step by step with practical examples and commands.

---

Migrating from Ubuntu Server to RHEL 9 requires careful planning since the distributions are not binary compatible.

## Assessment Phase

Document your current Ubuntu environment:

```bash
# On Ubuntu
dpkg --get-selections > /tmp/ubuntu-packages.txt
systemctl list-unit-files --state=enabled > /tmp/ubuntu-services.txt
cat /etc/netplan/*.yaml > /tmp/ubuntu-network.txt
crontab -l > /tmp/ubuntu-crontab.txt
```

## Package Mapping

Map Ubuntu packages to RHEL equivalents:

| Ubuntu | RHEL 9 |
|--------|--------|
| apache2 | httpd |
| mysql-server | mysql or mariadb-server |
| postgresql | postgresql-server |
| python3 | python3 |
| ufw | firewalld |
| netplan | NetworkManager |

## Deploy RHEL 9

Install RHEL 9 on new hardware or a new VM:

```bash
# Register the system
sudo subscription-manager register --org=<org-id> --activationkey=<key>
```

## Migrate Configurations

### Web Server

```bash
# Convert Apache configs
# Ubuntu: /etc/apache2/sites-available/
# RHEL: /etc/httpd/conf.d/

# Key differences:
# - Module loading syntax
# - Default document root (/var/www/html)
# - Service name (httpd vs apache2)
```

### Networking

```bash
# Ubuntu uses netplan, RHEL uses NetworkManager
sudo nmcli con add type ethernet con-name eth0 ifname eth0 \
  ipv4.addresses 192.168.1.100/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "8.8.8.8" \
  ipv4.method manual
```

### Firewall

```bash
# Convert UFW rules to firewalld
# Ubuntu: sudo ufw allow 80/tcp
# RHEL: sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload
```

## Migrate Data

```bash
rsync -aAXv ubuntu-server:/var/www/html/ /var/www/html/
rsync -aAXv ubuntu-server:/var/lib/mysql/ /var/lib/mysql/
```

## Verify Services

```bash
sudo systemctl status httpd
sudo systemctl status mariadb
curl -I http://localhost
```

## Conclusion

Ubuntu to RHEL 9 migration is a manual process requiring package mapping, configuration conversion, and data migration. Plan thoroughly, test in a staging environment, and execute during a maintenance window.

