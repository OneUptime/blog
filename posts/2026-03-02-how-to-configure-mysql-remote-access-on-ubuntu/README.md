# How to Configure MySQL Remote Access on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, MySQL, Database, Networking, Security

Description: Configure MySQL on Ubuntu to accept remote connections securely, including binding to the correct interface, creating remote users, and firewall configuration.

---

By default, MySQL on Ubuntu listens only on localhost (127.0.0.1), which means only applications on the same server can connect. Enabling remote access is necessary when your application server and database server are separate machines, or when you need to connect from a database management tool on your workstation. This requires changes to both MySQL configuration and the server firewall.

## Understanding the Default Security Model

MySQL's default bind address of 127.0.0.1 is a deliberate security choice. Opening MySQL to the network exposes it to brute-force attacks and potential exploits. Before enabling remote access, consider alternatives:

- **SSH tunneling** - Connect MySQL through an encrypted SSH tunnel. No firewall rule needed.
- **VPN** - Place the database server on a private network accessible via VPN.
- **Direct remote access** - Only if the above options are not feasible, with IP allowlisting.

This guide covers direct remote access with proper security controls.

## Step 1: Change the MySQL Bind Address

Edit the MySQL configuration to listen on the network interface:

```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Find the `bind-address` line:

```ini
# Option 1: Listen on all interfaces (simplest but least restrictive)
bind-address = 0.0.0.0

# Option 2: Listen on a specific IP only (recommended if you have multiple NICs)
# Replace with your server's actual IP address
bind-address = 192.168.1.100

# Option 3: Listen on both IPv4 and IPv6
bind-address = ::
```

For production, use Option 2 and specify your server's private IP address. This prevents MySQL from listening on interfaces it does not need to.

Restart MySQL to apply the change:

```bash
sudo systemctl restart mysql

# Verify MySQL is now listening on the network
ss -tlnp | grep mysql
# Should show 0.0.0.0:3306 or your specific IP:3306
```

## Step 2: Create a Remote User

Unlike localhost users, remote users must be explicitly created with a specific host or IP address. You cannot just modify an existing `@localhost` user:

```bash
sudo mysql -u root -p
```

```sql
-- Create a user that can connect from a specific IP only (most secure)
CREATE USER 'myapp_user'@'192.168.1.50'
    IDENTIFIED BY 'strong-password-here';

-- Grant permissions to the application database
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp_db.*
    TO 'myapp_user'@'192.168.1.50';

FLUSH PRIVILEGES;
```

If you need to allow access from multiple specific IPs:

```sql
-- Create the user for each allowed IP
CREATE USER 'myapp_user'@'192.168.1.50'
    IDENTIFIED BY 'same-strong-password';
CREATE USER 'myapp_user'@'192.168.1.51'
    IDENTIFIED BY 'same-strong-password';

GRANT SELECT, INSERT, UPDATE, DELETE ON myapp_db.*
    TO 'myapp_user'@'192.168.1.50';
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp_db.*
    TO 'myapp_user'@'192.168.1.51';
```

If you need to allow access from any IP in a subnet (less secure, use with caution):

```sql
-- Allow from any host in the 192.168.1.x subnet
CREATE USER 'myapp_user'@'192.168.1.%'
    IDENTIFIED BY 'strong-password-here';
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp_db.*
    TO 'myapp_user'@'192.168.1.%';
```

Avoid the wildcard `%` host unless you have firewall rules restricting which IPs can reach port 3306.

## Step 3: Configure the Firewall

Allow MySQL connections from specific IPs using UFW:

```bash
# Allow MySQL from a specific application server IP only
sudo ufw allow from 192.168.1.50 to any port 3306

# Allow from multiple IPs
sudo ufw allow from 192.168.1.50 to any port 3306
sudo ufw allow from 192.168.1.51 to any port 3306

# Allow from a subnet (use cautiously)
sudo ufw allow from 192.168.1.0/24 to any port 3306

# Reload UFW
sudo ufw reload

# Verify the rules
sudo ufw status verbose | grep 3306
```

Never do this unless you are using MySQL's own access controls exclusively:

```bash
# Do NOT do this - exposes MySQL to the entire internet
sudo ufw allow 3306
```

## Step 4: Test the Remote Connection

From the remote machine (application server or workstation):

```bash
# Test connectivity first (checks if port is open)
telnet 192.168.1.100 3306
# Or
nc -zv 192.168.1.100 3306

# Connect with MySQL client
mysql -h 192.168.1.100 -u myapp_user -p myapp_db

# Connect with explicit port
mysql -h 192.168.1.100 -P 3306 -u myapp_user -p myapp_db
```

If the connection fails, check:

```bash
# On the MySQL server - is MySQL listening?
ss -tlnp | grep 3306

# Is the firewall allowing the connection?
sudo ufw status | grep 3306

# Check MySQL error log for connection attempts
sudo tail /var/log/mysql/error.log

# Test that the user has the right host association
sudo mysql -e "SELECT user, host FROM mysql.user WHERE user='myapp_user';"
```

## Securing Remote Connections with SSL

MySQL remote connections should use SSL/TLS to encrypt data in transit. MySQL 8 generates SSL certificates automatically:

```bash
# Check if SSL is already configured
sudo mysql -e "SHOW VARIABLES LIKE 'ssl%';"
# ssl_ca, ssl_cert, ssl_key should have values
# have_ssl should be YES
```

Require SSL for the remote user:

```sql
-- Force SSL for a specific user
ALTER USER 'myapp_user'@'192.168.1.50'
    REQUIRE SSL;

-- More specific SSL requirements
ALTER USER 'myapp_user'@'192.168.1.50'
    REQUIRE X509;  -- Require a valid client certificate

FLUSH PRIVILEGES;
```

Connect with SSL from the client:

```bash
# Connect using SSL (certificates auto-detected)
mysql -h 192.168.1.100 -u myapp_user -p --ssl-mode=REQUIRED

# Verify SSL is in use after connecting
mysql> SHOW STATUS LIKE 'Ssl_cipher';
```

## Using SSH Tunneling Instead of Direct Remote Access

SSH tunneling is more secure than opening MySQL to the network. No firewall changes are needed:

```bash
# On your local machine: tunnel local port 3307 to MySQL on the remote server
# Traffic is encrypted through SSH, MySQL stays bound to 127.0.0.1
ssh -L 3307:127.0.0.1:3306 user@mysql-server.example.com -N

# In another terminal, connect to the tunnel
mysql -h 127.0.0.1 -P 3307 -u myapp_user -p myapp_db
```

For persistent tunnels, use autossh:

```bash
sudo apt install autossh -y

# Persistent tunnel that reconnects if dropped
autossh -M 0 -f -N -L 3307:127.0.0.1:3306 user@mysql-server.example.com \
    -o "ServerAliveInterval=30" \
    -o "ServerAliveCountMax=3"
```

## Checking Remote Access Configuration

After setup, run these checks periodically:

```bash
# List all MySQL users and their hosts
sudo mysql -e "SELECT user, host, plugin FROM mysql.user ORDER BY user, host;"

# Check what each user can access
sudo mysql -e "SHOW GRANTS FOR 'myapp_user'@'192.168.1.50';"

# See current active connections
sudo mysql -e "SHOW PROCESSLIST;"

# Count connections by host
sudo mysql -e "SELECT host, COUNT(*) FROM information_schema.processlist GROUP BY host;"
```

Remote MySQL access is a calculated risk. Keep the exposure minimal by using specific IP allowlists, requiring SSL, and using SSH tunneling where possible. Review user grants and firewall rules whenever team members or server IPs change.
