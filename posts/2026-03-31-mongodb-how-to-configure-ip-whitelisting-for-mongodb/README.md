# How to Configure IP Whitelisting for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Security, Network, IP Whitelist, Firewall

Description: Restrict MongoDB access to specific IP addresses using firewall rules and bindIp configuration to prevent unauthorized network connections.

---

## Defense in Depth with IP Whitelisting

IP whitelisting ensures only known, trusted hosts can establish TCP connections to MongoDB. Even if credentials are compromised, attackers cannot connect from unauthorized IPs. Combine IP whitelisting with authentication, TLS, and least-privilege roles for layered security.

## Method 1: bindIp in mongod.conf

The `bindIp` setting controls which network interfaces MongoDB listens on. Connections from other interfaces are refused before authentication.

```yaml
# /etc/mongod.conf
net:
  port: 27017
  bindIp: "127.0.0.1,10.0.1.10"
```

This binds MongoDB to only localhost and `10.0.1.10`. Connections to any other interface are refused at the TCP level since MongoDB is not listening there.

For multiple addresses:

```yaml
net:
  bindIp: "127.0.0.1,10.0.1.10,10.0.1.11,10.0.1.12"
```

To bind to all interfaces (not recommended for production):

```yaml
net:
  bindIp: "0.0.0.0"
```

Restart mongod after changes:

```bash
sudo systemctl restart mongod
```

## Method 2: iptables Firewall Rules (Linux)

For more granular control, use iptables to allow specific source IPs:

```bash
# Allow MongoDB port from application server only
iptables -A INPUT -p tcp --dport 27017 \
  -s 10.0.1.20 -j ACCEPT

# Allow from another app server
iptables -A INPUT -p tcp --dport 27017 \
  -s 10.0.1.21 -j ACCEPT

# Deny all other connections to MongoDB port
iptables -A INPUT -p tcp --dport 27017 -j DROP

# Persist rules
iptables-save > /etc/iptables/rules.v4
```

## Method 3: UFW (Ubuntu Firewall)

```bash
# Allow MongoDB only from application subnet
ufw allow from 10.0.1.0/24 to any port 27017

# Deny from everywhere else
ufw deny 27017
```

## MongoDB Atlas IP Access List

For MongoDB Atlas, configure the IP Access List in the Atlas UI or via the Atlas API:

```bash
# Atlas Admin API - add IP to access list
curl -X POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/accessList" \
  --user "publicKey:privateKey" \
  --digest \
  --header "Content-Type: application/json" \
  --data '[{"ipAddress": "203.0.113.10", "comment": "App server prod"}]'
```

## Verifying Connection Restrictions

Test that connections from unauthorized IPs fail:

```bash
# From an unauthorized host - should timeout or refuse
mongosh "mongodb://10.0.0.1:27017/?connectTimeoutMS=3000"
```

Check current connections by IP from mongod:

```javascript
db.adminCommand({ currentOp: 1 }).inprog.map(op => op.client)
```

## Summary

IP whitelisting for MongoDB combines `bindIp` configuration (which interfaces mongod listens on) with firewall rules (which source IPs can reach the port). Use `bindIp` to restrict the listening interface and iptables or UFW to whitelist specific application server IPs. Together they provide two layers of network access control before any authentication is attempted.
