# How to Restrict Redis Network Access with iptables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, iptables, Firewall, Network

Description: Use iptables rules to restrict Redis port access to specific IP addresses and subnets, preventing unauthorized network connections to your Redis instance.

---

Redis has no built-in IP allowlist feature beyond the `bind` directive. For granular network-level access control, iptables provides the most direct mechanism to whitelist specific clients and block everyone else from reaching your Redis port.

## The Core Rule Set

Allow traffic from trusted IPs only and drop everything else on port 6379:

```bash
# Allow loopback (local connections)
sudo iptables -A INPUT -i lo -p tcp --dport 6379 -j ACCEPT

# Allow from application server 1
sudo iptables -A INPUT -s 10.0.1.10/32 -p tcp --dport 6379 -j ACCEPT

# Allow from application server 2
sudo iptables -A INPUT -s 10.0.1.11/32 -p tcp --dport 6379 -j ACCEPT

# Allow from monitoring server
sudo iptables -A INPUT -s 10.0.2.5/32 -p tcp --dport 6379 -j ACCEPT

# Allow from entire app subnet (broader rule)
# sudo iptables -A INPUT -s 10.0.1.0/24 -p tcp --dport 6379 -j ACCEPT

# Drop all other connections to Redis port
sudo iptables -A INPUT -p tcp --dport 6379 -j DROP
```

## Allow Replica Connections

If you run replicas, allow them to connect to the primary. These rules must be placed before the DROP rule. If the DROP rule is already in place, remove it first, add the new rules, then re-add it:

```bash
# Remove the existing DROP rule
sudo iptables -D INPUT -p tcp --dport 6379 -j DROP

# Allow replica 1
sudo iptables -A INPUT -s 10.0.3.1/32 -p tcp --dport 6379 -j ACCEPT

# Allow replica 2
sudo iptables -A INPUT -s 10.0.3.2/32 -p tcp --dport 6379 -j ACCEPT

# Re-add the DROP rule at the end
sudo iptables -A INPUT -p tcp --dport 6379 -j DROP
```

## Verifying Rules

```bash
sudo iptables -L INPUT -n -v | grep 6379
```

Expected output:

```text
   0     0 ACCEPT     tcp  --  *      *       10.0.1.10            0.0.0.0/0            tcp dpt:6379
   0     0 ACCEPT     tcp  --  *      *       10.0.1.11            0.0.0.0/0            tcp dpt:6379
   0     0 DROP       tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:6379
```

## Making Rules Persistent

On Ubuntu/Debian using `iptables-persistent`:

```bash
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

On Red Hat/CentOS:

```bash
sudo service iptables save
# or
sudo iptables-save > /etc/sysconfig/iptables
```

## Testing Blocked Access

From an unauthorized host:

```bash
redis-cli -h <redis-server-ip> PING
# Should timeout or be refused
```

From an authorized host:

```bash
redis-cli -h <redis-server-ip> PING
# PONG
```

## Logging Dropped Connections

Add a logging rule immediately before the DROP rule so only blocked connections are logged:

```bash
# Remove the existing DROP rule
sudo iptables -D INPUT -p tcp --dport 6379 -j DROP

# Add the LOG rule
sudo iptables -A INPUT -p tcp --dport 6379 -j LOG --log-prefix "REDIS-BLOCKED: " --log-level 4

# Re-add the DROP rule after the LOG rule
sudo iptables -A INPUT -p tcp --dport 6379 -j DROP
```

View blocked attempts:

```bash
sudo dmesg | grep REDIS-BLOCKED
# or
sudo journalctl -k | grep REDIS-BLOCKED
```

## Combining with Redis bind Directive

Use both `bind` in redis.conf and iptables for defense-in-depth:

```text
# redis.conf: only listen on the private interface
bind 127.0.0.1 10.0.1.20
```

This prevents Redis from even accepting connections on other interfaces, while iptables provides a second layer of protection.

## Summary

iptables rules are the most reliable way to restrict which hosts can connect to Redis at the network level. Combine explicit ACCEPT rules for trusted IPs with a final DROP rule for all other connections on port 6379. Use `iptables-persistent` to survive reboots, and combine with Redis's `bind` directive for layered security.
