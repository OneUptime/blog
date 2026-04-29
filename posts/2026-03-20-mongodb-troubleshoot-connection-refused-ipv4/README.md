# How to Troubleshoot MongoDB 'Connection Refused' on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, IPv4, Troubleshooting, Connection Refused, Debug, Database

Description: Diagnose and fix MongoDB connection refused errors on IPv4, including bindIp misconfiguration, authentication failures, firewall blocks, and TLS issues.

## Introduction

MongoDB "Connection refused" errors on IPv4 usually mean the server isn't listening on the expected address, the firewall is blocking the port, or authentication is failing. This guide covers systematic diagnosis from network to application level.

## Error Categories

| Error | Likely Cause |
|---|---|
| `Connection refused` | MongoDB not listening on that IP or firewall blocking |
| `Connection timed out` | Firewall dropping packets (no response) |
| `command ... requires authentication` | Auth enabled but no credentials provided |
| `Authentication failed` | Wrong username or password |
| `not authorized on db to execute command` | Insufficient user privileges |

## Step-by-Step Diagnosis

```bash
# Step 1: Is mongod running?

sudo systemctl status mongod
sudo systemctl start mongod   # If not running

# Check startup errors
sudo journalctl -u mongod --since "10 minutes ago" | tail -30

# Step 2: What is MongoDB listening on?
sudo ss -tlnp | grep mongod
# If only 127.0.0.1:27017: bindIp needs update

# Step 3: Can you reach the port?
nc -zv 10.0.0.5 27017
# "Connection refused" = not listening or firewall
# "succeeded" = port is open

# Step 4: Check MongoDB log for errors
sudo tail -50 /var/log/mongodb/mongod.log
```

## Fix: bindIp Set to Localhost Only

```bash
# Check current bindIp
sudo grep bindIp /etc/mongod.conf
# If: bindIp: 127.0.0.1  - only localhost

# Fix:
sudo nano /etc/mongod.conf
# Change to:
# net:
#   bindIp: 127.0.0.1,10.0.0.5

sudo systemctl restart mongod
sudo ss -tlnp | grep mongod   # Verify new binding
```

## Fix: Firewall Blocking Port 27017

```bash
# Check UFW
sudo ufw status | grep 27017

# Check iptables
sudo iptables -L INPUT -n | grep 27017

# Add rule:
sudo ufw allow from 10.0.0.10 to any port 27017
sudo ufw reload

# iptables:
sudo iptables -A INPUT -p tcp --dport 27017 -s 10.0.0.10/32 -j ACCEPT

# Temporarily disable firewall to isolate:
sudo ufw disable
nc -zv 10.0.0.5 27017   # Test again
sudo ufw enable
```

## Fix: Authentication Issues

```bash
# Error: "command ... requires authentication"
# Means auth is enabled but no credentials provided

# Connect with credentials:
mongosh "mongodb://username:password@10.0.0.5:27017/dbname"

# Or check what auth is set:
sudo grep -A5 "security:" /etc/mongod.conf
# If authorization: enabled - must provide credentials

# Error: "Authentication failed"
# Check user exists:
mongosh "mongodb://admin:adminpass@127.0.0.1:27017/admin"
db.system.users.find({user: "appuser"})

# Reset password:
db.updateUser("appuser", { pwd: "newpassword" })
```

## Check MongoDB Log in Detail

```bash
# Enable verbose logging temporarily
mongosh "mongodb://admin:pass@127.0.0.1:27017/admin"
db.adminCommand({ setParameter: 1, logComponentVerbosity: { verbosity: 3 } })

# Watch logs
sudo tail -f /var/log/mongodb/mongod.log | grep -E "connection|auth|NETWORK"

# Test specific connection and capture verbose output
mongosh "mongodb://10.0.0.5:27017" --verbose 2>&1 | head -20
```

## Conclusion

MongoDB connection failures on IPv4 follow a clear diagnostic path: check if mongod is running, verify `bindIp` includes the target IP, test port reachability with `nc`, check firewall rules, and inspect the MongoDB log. Authentication failures are separate from connection failures-if you reach the port but get auth errors, the networking is fine and the issue is credentials or user configuration.
