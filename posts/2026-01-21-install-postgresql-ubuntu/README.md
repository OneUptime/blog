# How to Install PostgreSQL on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Ubuntu, Database, Installation, Linux

Description: A comprehensive guide to installing and configuring PostgreSQL on Ubuntu, including initial setup, user creation, and basic configuration for development and production environments.

---

PostgreSQL is one of the most powerful and feature-rich open-source relational database systems available. This guide walks you through installing PostgreSQL on Ubuntu, configuring it for first use, and setting up your development or production environment.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04 LTS
- Root or sudo access
- Basic familiarity with the command line

## Installing PostgreSQL from Ubuntu Repository

The simplest way to install PostgreSQL is from Ubuntu's default repositories.

```bash
# Update package index
sudo apt update

# Install PostgreSQL and contrib package
sudo apt install postgresql postgresql-contrib -y
```

This installs the latest PostgreSQL version available in Ubuntu's repositories along with additional utilities and functionality.

## Installing a Specific PostgreSQL Version

For production environments, you may need a specific PostgreSQL version. The official PostgreSQL repository provides all supported versions.

### Add PostgreSQL APT Repository

```bash
# Install prerequisites
sudo apt install curl ca-certificates gnupg -y

# Add PostgreSQL signing key
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg

# Add repository
echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list

# Update package index
sudo apt update
```

### Install Specific Version

```bash
# Install PostgreSQL 16 (or any specific version)
sudo apt install postgresql-16 postgresql-contrib-16 -y

# Alternatively, install the latest version
sudo apt install postgresql postgresql-contrib -y
```

## Verifying the Installation

After installation, PostgreSQL starts automatically. Verify it's running:

```bash
# Check service status
sudo systemctl status postgresql

# Check PostgreSQL version
psql --version

# Check cluster status
pg_lsclusters
```

Expected output from `pg_lsclusters`:

```
Ver Cluster Port Status Owner    Data directory              Log file
16  main    5432 online postgres /var/lib/postgresql/16/main /var/log/postgresql/postgresql-16-main.log
```

## Initial Configuration

### Accessing PostgreSQL

PostgreSQL creates a system user called `postgres` during installation. Use this account for initial database administration.

```bash
# Switch to postgres user
sudo -i -u postgres

# Access PostgreSQL prompt
psql
```

You're now in the PostgreSQL interactive terminal. Exit with `\q` or `exit`.

### Creating a New Database User

```sql
-- Create a new user with password
CREATE USER myuser WITH PASSWORD 'secure_password';

-- Grant privileges
ALTER USER myuser CREATEDB;

-- Or create a superuser (use with caution)
CREATE USER admin WITH SUPERUSER PASSWORD 'admin_password';
```

### Creating a Database

```sql
-- Create a new database
CREATE DATABASE myapp;

-- Create database with specific owner
CREATE DATABASE myapp OWNER myuser;

-- Grant all privileges on database
GRANT ALL PRIVILEGES ON DATABASE myapp TO myuser;
```

### Setting Up Peer Authentication for Local Users

Create a PostgreSQL user matching your Linux username for convenient local access:

```bash
# As postgres user, create a role matching your Linux username
sudo -u postgres createuser --interactive

# Enter your username when prompted
# Answer yes to superuser if needed for development
```

Now you can access PostgreSQL directly:

```bash
# Connect to PostgreSQL (uses your Linux username)
psql -d postgres

# Connect to a specific database
psql -d myapp
```

## Configuring PostgreSQL

PostgreSQL's main configuration files are located in `/etc/postgresql/<version>/main/`.

### Key Configuration Files

| File | Purpose |
|------|---------|
| `postgresql.conf` | Main server configuration |
| `pg_hba.conf` | Client authentication |
| `pg_ident.conf` | User name mapping |

### Allowing Remote Connections

By default, PostgreSQL only accepts local connections. To allow remote access:

#### Edit postgresql.conf

```bash
sudo nano /etc/postgresql/16/main/postgresql.conf
```

Find and modify:

```conf
# Listen on all interfaces (or specific IP)
listen_addresses = '*'

# Or listen on specific interface
listen_addresses = '192.168.1.100'
```

#### Edit pg_hba.conf

```bash
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

Add a line for remote connections:

```conf
# Allow connections from specific subnet
host    all             all             192.168.1.0/24          scram-sha-256

# Allow connections from any IP (not recommended for production)
host    all             all             0.0.0.0/0               scram-sha-256
```

#### Restart PostgreSQL

```bash
sudo systemctl restart postgresql
```

### Memory Configuration

Edit `postgresql.conf` to optimize memory settings based on your system:

```conf
# Shared memory (25% of total RAM for dedicated server)
shared_buffers = 4GB

# Memory for sorting and hashing (per operation)
work_mem = 64MB

# Memory for maintenance operations
maintenance_work_mem = 1GB

# Effective cache size (estimate of OS cache, 50-75% of RAM)
effective_cache_size = 12GB
```

### Connection Settings

```conf
# Maximum number of connections
max_connections = 200

# Connection timeout
tcp_keepalives_idle = 60
tcp_keepalives_interval = 10
tcp_keepalives_count = 10
```

## Useful PostgreSQL Commands

### Database Management

```bash
# List all databases
psql -c "\l"

# Create database from command line
createdb myapp

# Drop database
dropdb myapp

# Dump database to file
pg_dump myapp > myapp_backup.sql

# Restore from dump
psql myapp < myapp_backup.sql
```

### User Management

```bash
# Create user from command line
createuser --interactive myuser

# Set password
psql -c "ALTER USER myuser PASSWORD 'new_password';"

# List users
psql -c "\du"
```

### Connecting to Remote Database

```bash
psql -h hostname -p 5432 -U myuser -d myapp
```

## Setting Up Firewall

If you're using UFW (Uncomplicated Firewall):

```bash
# Allow PostgreSQL port
sudo ufw allow 5432/tcp

# Or allow from specific IP only
sudo ufw allow from 192.168.1.0/24 to any port 5432

# Check status
sudo ufw status
```

## Managing PostgreSQL Service

```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Stop PostgreSQL
sudo systemctl stop postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Reload configuration without restart
sudo systemctl reload postgresql

# Enable on boot
sudo systemctl enable postgresql

# Disable on boot
sudo systemctl disable postgresql
```

## Data Directory and Logs

```bash
# Default data directory
/var/lib/postgresql/<version>/main/

# Log files location
/var/log/postgresql/

# View recent logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

## Uninstalling PostgreSQL

If you need to completely remove PostgreSQL:

```bash
# Stop service
sudo systemctl stop postgresql

# Remove packages
sudo apt remove postgresql postgresql-contrib -y
sudo apt autoremove -y

# Remove data (CAUTION: destroys all data)
sudo rm -rf /var/lib/postgresql/
sudo rm -rf /etc/postgresql/
sudo rm -rf /var/log/postgresql/

# Remove postgres user
sudo deluser postgres
```

## Common Issues and Solutions

### Cannot Connect to Server

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check if it's listening on the correct port
sudo ss -tlnp | grep 5432

# Check pg_hba.conf for authentication rules
sudo cat /etc/postgresql/16/main/pg_hba.conf
```

### Permission Denied

```bash
# Ensure correct ownership of data directory
sudo chown -R postgres:postgres /var/lib/postgresql/

# Check file permissions
sudo ls -la /var/lib/postgresql/16/main/
```

### Port Already in Use

```bash
# Find process using port 5432
sudo lsof -i :5432

# If another PostgreSQL version is running
pg_lsclusters

# Stop specific cluster
sudo pg_ctlcluster 15 main stop
```

## Next Steps

Now that PostgreSQL is installed and configured, consider:

1. Setting up regular backups with `pg_dump` or `pgBackRest`
2. Configuring connection pooling with PgBouncer for production
3. Setting up monitoring with `pg_stat_statements`
4. Implementing SSL/TLS for encrypted connections
5. Creating proper user roles and permissions

## Conclusion

You now have a working PostgreSQL installation on Ubuntu. This setup provides a solid foundation for both development and production environments. For production deployments, ensure you configure proper authentication, enable SSL, set up automated backups, and tune the memory settings based on your workload and available resources.

PostgreSQL's extensive documentation and active community make it an excellent choice for applications of any scale. As you grow more comfortable with PostgreSQL, explore its advanced features like JSONB, full-text search, and the extensive ecosystem of extensions.
