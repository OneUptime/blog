# How to Restrict Network Access to MySQL with bind-address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Network, Configuration, Administration

Description: Learn how to use the bind-address configuration option in MySQL to restrict which network interfaces the server listens on and control remote access.

---

## What Is bind-address?

The `bind-address` option tells MySQL which IP address (network interface) to listen on for incoming TCP/IP connections. By default, MySQL listens on all available interfaces (`*`), which means any machine on the network can attempt to connect over IPv4 or IPv6.

Restricting `bind-address` adds a network-level layer of security by preventing connections from reaching MySQL entirely.

## Checking the Current bind-address

```sql
SHOW VARIABLES LIKE 'bind_address';
```

```text
+---------------+-------+
| Variable_name | Value |
+---------------+-------+
| bind_address  | *     |
+---------------+-------+
```

## Common bind-address Values

| Value | Effect |
|---|---|
| `127.0.0.1` | Accept connections only from localhost |
| `::1` | IPv6 localhost only |
| `0.0.0.0` | Accept connections on all IPv4 interfaces |
| `::` | Accept connections on all IPv4 and IPv6 interfaces |
| `192.168.1.10` | Accept connections only on the specified IP |
| `*` | All interfaces (default) |

## Restricting to Localhost Only

To prevent all remote connections and allow only local connections:

```text
[mysqld]
bind-address = 127.0.0.1
```

Restart MySQL:

```bash
sudo systemctl restart mysql
```

After this change, connecting from any remote host will fail with a connection refused error.

## Binding to a Specific Interface

For a server with multiple network interfaces (e.g., a private IP for the app tier and a public IP for the web tier), bind only to the private interface:

```text
[mysqld]
bind-address = 10.0.1.5
```

## Binding to Multiple Addresses (MySQL 8.0.13+)

MySQL 8.0.13 introduced support for a comma-separated list:

```text
[mysqld]
bind-address = 127.0.0.1,10.0.1.5
```

This listens on both localhost and the specified private IP.

## Verifying What MySQL Is Listening On

Use `netstat` or `ss` to verify:

```bash
sudo ss -tlnp | grep mysql
```

```text
LISTEN  0  151  127.0.0.1:3306  0.0.0.0:*  users:(("mysqld",pid=1234,fd=21))
```

Or with `netstat`:

```bash
sudo netstat -tlnp | grep 3306
```

## Combining bind-address with Firewall Rules

`bind-address` works at the MySQL application layer. For defense in depth, also restrict at the firewall level:

```bash
# Allow MySQL only from the app server IP
sudo ufw allow from 10.0.1.10 to any port 3306

# Or using iptables
sudo iptables -A INPUT -p tcp --dport 3306 -s 10.0.1.10 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3306 -j DROP
```

## Using mysqlx_bind_address for X Protocol

MySQL 8.0 also supports the X Protocol (port 33060). Restrict it similarly:

```text
[mysqld]
mysqlx_bind_address = 127.0.0.1
```

## Troubleshooting Connection Issues After Changing bind-address

If a remote application loses connectivity after restricting `bind-address`:

1. Check that the new IP is reachable from the application server.
2. Ensure the MySQL user account allows the application's host: `SHOW GRANTS FOR 'app_user'@'10.0.1.10'`.
3. Verify with `telnet` or `nc`: `nc -zv 10.0.1.5 3306`.

## Summary

`bind-address` in MySQL's configuration file controls which network interfaces MySQL accepts TCP connections on. Set it to `127.0.0.1` to allow only local connections, a private IP for app-tier access, or a comma-separated list for multiple interfaces (MySQL 8.0.13+). Always combine `bind-address` with OS-level firewall rules for defense-in-depth network security.
