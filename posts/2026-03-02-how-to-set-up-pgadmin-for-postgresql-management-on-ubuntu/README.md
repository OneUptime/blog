# How to Set Up pgAdmin for PostgreSQL Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, PostgreSQL, pgAdmin, Databases

Description: Install and configure pgAdmin 4 on Ubuntu to manage PostgreSQL databases through a web-based graphical interface with secure access controls.

---

pgAdmin is the standard graphical management tool for PostgreSQL. Whether you need to browse schemas, run queries, monitor active connections, or manage roles and privileges, pgAdmin covers most day-to-day DBA tasks through a browser interface. This guide walks through setting up pgAdmin 4 in server mode on Ubuntu, which gives you a web UI accessible from any browser.

## Choosing Your Deployment Mode

pgAdmin 4 can run in two modes:

- **Desktop mode**: Launches as a local application, useful for development workstations
- **Server mode**: Runs as a web server, accessible via browser from remote machines

For production use or team environments, server mode is the right choice. That is what this guide covers.

## Installing pgAdmin 4

The pgAdmin project maintains its own apt repository, which provides more recent versions than what ships in Ubuntu's default repos.

```bash
# Install required dependencies
sudo apt install -y curl gnupg2

# Add the pgAdmin apt repository signing key
curl -fsS https://www.pgadmin.org/static/packages_pgadmin_org.pub | \
  sudo gpg --dearmor -o /usr/share/keyrings/packages-pgadmin-org.gpg

# Add the repository
sudo sh -c 'echo "deb [signed-by=/usr/share/keyrings/packages-pgadmin-org.gpg] \
  https://ftp.postgresql.org/pub/pgadmin/pgadmin4/apt/$(lsb_release -cs) pgadmin4 main" \
  > /etc/apt/sources.list.d/pgadmin4.list'

# Update and install pgAdmin 4 for web server mode
sudo apt update
sudo apt install -y pgadmin4-web
```

## Running the Setup Script

After installation, run the web setup script to configure Apache and create the initial admin account:

```bash
sudo /usr/pgadmin4/bin/setup-web.sh
```

The script will prompt you for:

1. An email address (used as your login username)
2. A password for the pgAdmin admin account

It then configures Apache with a `pgadmin4` virtual host and enables the necessary modules. When it finishes, you should see a message confirming Apache was restarted.

### Verifying Apache Configuration

```bash
# Check that Apache is running with the pgAdmin config
sudo apache2ctl configtest
sudo systemctl status apache2

# Check the pgAdmin configuration file
cat /etc/apache2/conf-available/pgadmin4.conf
```

## Accessing pgAdmin

Open a browser and navigate to:

```
http://your-server-ip/pgadmin4
```

Log in with the email and password you set during setup. After login, you land on the pgAdmin dashboard.

### Adding a Firewall Rule

If UFW is enabled, allow HTTP traffic:

```bash
# Allow HTTP access
sudo ufw allow 80/tcp

# For HTTPS (recommended for production)
sudo ufw allow 443/tcp

sudo ufw reload
```

## Connecting to a PostgreSQL Server

Once logged in, you need to add your PostgreSQL instance as a registered server.

1. Right-click "Servers" in the left panel and select "Register > Server"
2. On the "General" tab, give the connection a name (e.g., "Production DB")
3. On the "Connection" tab, fill in:
   - **Host**: `localhost` or the PostgreSQL server IP
   - **Port**: `5432` (default)
   - **Maintenance database**: `postgres`
   - **Username**: your PostgreSQL superuser or application user
   - **Password**: the user's password
4. Click "Save"

pgAdmin will connect and display the server in the left panel tree.

### Creating a PostgreSQL User for pgAdmin

It is good practice to connect with a dedicated role rather than the superuser:

```sql
-- Connect to PostgreSQL as the postgres superuser
-- Create a management user with limited privileges
CREATE ROLE pgadmin_user WITH LOGIN PASSWORD 'secure_password_here';

-- Grant access to specific databases as needed
GRANT CONNECT ON DATABASE your_database TO pgadmin_user;
GRANT USAGE ON SCHEMA public TO pgadmin_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pgadmin_user;

-- For full DBA capabilities (use with care)
-- GRANT pg_monitor TO pgadmin_user;
```

## Configuring HTTPS with a Self-Signed Certificate

Running pgAdmin over plain HTTP in a non-local environment is not recommended. Set up TLS using a self-signed certificate or Let's Encrypt.

```bash
# Generate a self-signed certificate for testing
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/pgadmin-selfsigned.key \
  -out /etc/ssl/certs/pgadmin-selfsigned.crt \
  -subj "/CN=your-server-ip"

# Enable the SSL and headers modules
sudo a2enmod ssl headers
```

Create or update the pgAdmin Apache config to use HTTPS:

```bash
sudo nano /etc/apache2/conf-available/pgadmin4.conf
```

Add or modify the virtual host block:

```apache
<VirtualHost *:443>
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/pgadmin-selfsigned.crt
    SSLCertificateKeyFile /etc/ssl/private/pgadmin-selfsigned.key

    WSGIDaemonProcess pgadmin processes=1 threads=25
    WSGIScriptAlias /pgadmin4 /usr/pgadmin4/web/pgAdmin4.wsgi

    <Directory /usr/pgadmin4/web>
        WSGIProcessGroup pgadmin
        WSGIApplicationGroup %{GLOBAL}
        Require all granted
    </Directory>
</VirtualHost>
```

```bash
sudo systemctl restart apache2
```

## Useful pgAdmin Features

### Query Tool

The query tool is accessible by right-clicking a database and selecting "Query Tool". It supports:

- Syntax highlighting for SQL
- Query execution with results in a grid
- EXPLAIN and EXPLAIN ANALYZE for query plans
- Saving queries to files

### Schema Browser

The tree panel on the left gives you full visibility into your database structure: tables, views, functions, sequences, indexes, and constraints. Expanding any object shows its properties and allows you to generate DDL scripts.

### Monitoring Active Queries

To see currently running queries:

```sql
-- This query can be run in the pgAdmin query tool
SELECT pid, now() - pg_stat_activity.query_start AS duration,
       query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  AND state != 'idle';
```

pgAdmin also has a built-in "Dashboard" tab per server that shows connections, transactions per second, and tuples fetched/returned in real time.

### Backup and Restore

Right-click any database and select "Backup" to create a pg_dump file. pgAdmin handles the pg_dump parameters through a GUI dialog. For restore, use "Restore" the same way.

## Updating pgAdmin

```bash
# Update pgAdmin to the latest version
sudo apt update
sudo apt upgrade -y pgadmin4-web

# Re-run the web setup if Apache configuration was modified by the upgrade
sudo /usr/pgadmin4/bin/setup-web.sh
```

## Troubleshooting

If pgAdmin returns a 500 error after login, check the application log:

```bash
# Check Apache error log for pgAdmin issues
sudo tail -50 /var/log/apache2/error.log

# Check pgAdmin's own log
sudo ls /var/log/pgadmin/
sudo tail -50 /var/log/pgadmin/pgadmin4.log
```

A common cause of errors is incorrect file permissions on the pgAdmin data directory:

```bash
sudo chown -R www-data:www-data /var/lib/pgadmin/
sudo chmod -R 700 /var/lib/pgadmin/
```

pgAdmin is a mature, well-documented tool that covers most PostgreSQL management needs without requiring command-line access. For teams less familiar with psql, it provides a reasonable middle ground between usability and capability.
