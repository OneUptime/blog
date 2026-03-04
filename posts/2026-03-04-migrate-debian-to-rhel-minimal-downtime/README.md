# How to Migrate from Debian to RHEL with Minimal Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Debian, Migration, Linux, Server

Description: Migrate from Debian servers to RHEL with minimal downtime using a parallel deployment strategy and data synchronization.

---

Like Ubuntu, Debian cannot be converted to RHEL in place. The migration requires a parallel RHEL server. The key to minimal downtime is running both systems side by side and switching over quickly.

## Step 1: Audit the Debian System

```bash
# On Debian: Export the installed package list
dpkg -l | awk '/^ii/{print $2}' > /tmp/debian-packages.txt

# Document running services and open ports
systemctl list-units --type=service --state=running > /tmp/debian-services.txt
sudo ss -tulnp > /tmp/debian-ports.txt

# Export configuration files
sudo tar czf /tmp/debian-etc-backup.tar.gz /etc/

# Record kernel parameters
sysctl -a > /tmp/debian-sysctl.txt 2>/dev/null
```

## Step 2: Build RHEL in Parallel

Provision a new RHEL server with matching specs on the same network:

```bash
# Register and configure RHEL
sudo subscription-manager register --auto-attach

# Install equivalent services
# Debian 'apache2' = RHEL 'httpd'
# Debian 'postgresql' = RHEL 'postgresql-server'
sudo dnf install httpd postgresql-server
```

## Step 3: Replicate Data Continuously

Set up continuous data synchronization while both servers run:

```bash
# Use rsync with a cron job to keep data in sync
# Run every 5 minutes to minimize data loss at cutover
sudo tee /etc/cron.d/data-sync << 'EOF'
*/5 * * * * root rsync -avz --delete debian-server:/var/www/html/ /var/www/html/ >> /var/log/migration-sync.log 2>&1
*/5 * * * * root rsync -avz --delete debian-server:/var/lib/app-data/ /var/lib/app-data/ >> /var/log/migration-sync.log 2>&1
EOF
```

For databases, use streaming replication if available:

```bash
# PostgreSQL: Set up streaming replication from Debian to RHEL
# On the Debian server, configure pg_hba.conf to allow replication
# On the RHEL server, use pg_basebackup to initialize
sudo -u postgres pg_basebackup \
  -h debian-server -D /var/lib/pgsql/data -U replicator -P -R
```

## Step 4: Translate Configuration

Key path and configuration differences:

```bash
# Network configuration
# Debian: /etc/network/interfaces
# RHEL: /etc/NetworkManager/system-connections/ or nmcli

# Set up the same IP on RHEL using nmcli
sudo nmcli con mod "System eth0" ipv4.addresses 192.168.1.10/24
sudo nmcli con mod "System eth0" ipv4.gateway 192.168.1.1
sudo nmcli con mod "System eth0" ipv4.method manual

# Firewall: Debian uses iptables directly, RHEL uses firewalld
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=5432/tcp
sudo firewall-cmd --reload
```

## Step 5: Cutover Procedure

Execute the cutover during a short maintenance window:

```bash
# 1. Stop the application on Debian
ssh debian-server "sudo systemctl stop httpd"

# 2. Run a final data sync
sudo rsync -avz --delete debian-server:/var/www/html/ /var/www/html/

# 3. Promote PostgreSQL replica (if using replication)
sudo -u postgres pg_ctl promote -D /var/lib/pgsql/data

# 4. Update DNS or switch the load balancer to point to the RHEL server
# 5. Start services on RHEL
sudo systemctl start httpd postgresql

# 6. Verify the application is working
curl -I http://localhost/
```

This approach limits downtime to just the final sync and DNS propagation, typically a few minutes.
