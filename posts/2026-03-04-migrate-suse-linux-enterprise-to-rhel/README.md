# How to Migrate from SUSE Linux Enterprise to RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SUSE, Migration, Enterprise, Linux

Description: Plan and execute a migration from SUSE Linux Enterprise Server to RHEL using a parallel deployment approach.

---

There is no supported in-place conversion path from SLES to RHEL in Red Hat's Convert2RHEL tooling. Both distributions use RPM packages, but they use different package managers, repositories, package sets, and system configuration tools. Migration requires building a new RHEL server and moving workloads over.

## Step 1: Document the SLES System

```bash
# On SLES: List all installed packages

rpm -qa --queryformat '%{NAME}\n' | sort > /tmp/sles-packages.txt

# Document running services
systemctl list-units --type=service --state=running > /tmp/sles-services.txt

# Export network configuration
ip addr show > /tmp/sles-network.txt
cat /etc/sysconfig/network/ifcfg-* > /tmp/sles-ifcfg.txt

# Document firewall rules
sudo iptables-save > /tmp/sles-iptables.txt
# Or if using firewalld on SLES
sudo firewall-cmd --list-all > /tmp/sles-firewall.txt 2>/dev/null

# Export crontabs
sudo crontab -l > /tmp/sles-root-cron.txt
```

## Step 2: Map SLES Packages to RHEL

Most RPM package names are the same, but some differ:

```bash
# Common differences:
# SLES: apache2 -> RHEL: httpd
# Older SLES: SuSEfirewall2 -> RHEL: firewalld
# SLES: yast2-* -> RHEL: no equivalent (use nmcli, cockpit)
# SLES: patterns-* -> RHEL: @group-names

# On RHEL: Search for equivalent packages
sudo dnf search httpd
sudo dnf search postgresql
```

## Step 3: Build the RHEL Server

```bash
# Register and set up RHEL
sudo subscription-manager register --auto-attach

# Install base packages matching your SLES workload
sudo dnf install httpd postgresql-server php php-pgsql

# Initialize and start services
sudo postgresql-setup --initdb
sudo systemctl enable --now httpd postgresql
```

## Step 4: Migrate Configuration

```bash
# Apache: SLES uses /etc/apache2/, RHEL uses /etc/httpd/
# Copy and adapt virtual host configurations
scp sles-server:/etc/apache2/vhosts.d/mysite.conf /tmp/
# Edit paths: /etc/apache2/ -> /etc/httpd/
sudo cp /tmp/mysite.conf /etc/httpd/conf.d/mysite.conf
sudo httpd -t

# Sysctl settings: Both use /etc/sysctl.d/
mkdir -p /tmp/sles-sysctl
scp sles-server:/etc/sysctl.d/*.conf /tmp/sles-sysctl/
sudo cp /tmp/sles-sysctl/*.conf /etc/sysctl.d/
sudo sysctl --system
```

## Step 5: Handle SLES-Specific Tools

Replace YaST workflows with RHEL equivalents:

```bash
# YaST network -> nmcli
sudo nmcli con show
sudo nmcli con mod "<connection_name>" ipv4.addresses "192.168.1.10/24"
sudo nmcli con mod "<connection_name>" ipv4.gateway "192.168.1.1"
sudo nmcli con mod "<connection_name>" ipv4.dns "8.8.8.8"
sudo nmcli con mod "<connection_name>" ipv4.method manual
sudo nmcli con up "<connection_name>"

# YaST firewall -> firewall-cmd
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Step 6: Migrate Data and Cutover

```bash
# Sync data from SLES to RHEL
sudo rsync -avz sles-server:/srv/www/htdocs/ /var/www/html/
sudo chown -R apache:apache /var/www/html/

# Set SELinux contexts (SLES may not have used SELinux)
sudo restorecon -Rv /var/www/html/

# Migrate database
ssh sles-server "sudo -u postgres pg_dumpall" | sudo -u postgres psql

# Switch DNS or load balancer to the RHEL server
```

Test thoroughly before decommissioning the SLES server. Keep it available for at least two weeks as a fallback.
