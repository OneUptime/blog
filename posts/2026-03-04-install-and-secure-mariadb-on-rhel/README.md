# How to Install and Secure MariaDB on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MariaDB, Database, Security, Installation, Hardening

Description: Install MariaDB on RHEL, run the security hardening script, configure remote access, and set up basic databases and users for production use.

---

MariaDB is the default MySQL-compatible database on RHEL. It is a community-developed fork of MySQL and is included in the base RHEL repositories. This guide covers installation, security hardening, and initial configuration.

## Install MariaDB

```bash
# Install MariaDB server and client
sudo dnf install -y mariadb-server mariadb

# Start and enable MariaDB
sudo systemctl enable --now mariadb

# Check the version
mysql --version
```

## Secure the Installation

```bash
# Run the security script
sudo mysql_secure_installation

# The script will prompt you to:
# 1. Set the root password (set a strong one)
# 2. Remove anonymous users (answer Yes)
# 3. Disallow root login remotely (answer Yes)
# 4. Remove test database (answer Yes)
# 5. Reload privilege tables (answer Yes)
```

## Connect and Create Databases

```bash
# Connect as root
mysql -u root -p

# Create a database
CREATE DATABASE webapp;

# Create a user with a password
CREATE USER 'webuser'@'localhost' IDENTIFIED BY 'securePass123';

# Grant privileges to the user on the database
GRANT ALL PRIVILEGES ON webapp.* TO 'webuser'@'localhost';

# Allow the user to connect from a specific subnet
CREATE USER 'webuser'@'192.168.1.%' IDENTIFIED BY 'securePass123';
GRANT ALL PRIVILEGES ON webapp.* TO 'webuser'@'192.168.1.%';

# Apply the changes
FLUSH PRIVILEGES;

# Exit
EXIT;
```

## Configure Network Access

```bash
# Edit MariaDB configuration
sudo vi /etc/my.cnf.d/mariadb-server.cnf

# Under [mysqld] section, change the bind address:
# bind-address = 0.0.0.0

# Restart MariaDB
sudo systemctl restart mariadb
```

## Open the Firewall

```bash
sudo firewall-cmd --permanent --add-service=mysql
sudo firewall-cmd --reload
```

## Additional Security Hardening

```bash
# Edit /etc/my.cnf.d/mariadb-server.cnf
sudo tee /etc/my.cnf.d/security.cnf << 'EOF'
[mysqld]
# Disable loading local files from client
local-infile=0

# Disable symbolic links
symbolic-links=0

# Log all queries for auditing (disable in high-traffic production)
# general_log=1
# general_log_file=/var/log/mariadb/general.log

# Enable the slow query log
slow_query_log=1
slow_query_log_file=/var/log/mariadb/slow-query.log
long_query_time=2

# Set a maximum connection limit
max_connections=100
EOF

sudo systemctl restart mariadb
```

## Verify Security Settings

```bash
# Connect and check settings
mysql -u root -p -e "
SHOW VARIABLES LIKE 'local_infile';
SHOW VARIABLES LIKE 'symbolic_links';
SHOW VARIABLES LIKE 'max_connections';
SHOW VARIABLES LIKE 'slow_query_log';
"

# List all users and their hosts
mysql -u root -p -e "SELECT user, host FROM mysql.user;"

# Check for accounts without passwords
mysql -u root -p -e "SELECT user, host FROM mysql.user WHERE password = '';"
```

## Test Remote Connectivity

```bash
# From a remote machine
mysql -h 192.168.1.50 -u webuser -p webapp

# Verify you can only access the granted database
SHOW DATABASES;
```

A properly secured MariaDB installation removes default test data, disables anonymous access, and restricts network access to only the hosts and users that need it.
