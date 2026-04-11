# How to Monitor MySQL Router Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MySQL Router, Monitoring, Connection, Performance

Description: Monitor MySQL Router active connections, routing status, and performance using the Router REST API, log files, and system-level tools.

---

## MySQL Router Monitoring Options

MySQL Router provides several interfaces for monitoring:

1. REST API (available in MySQL Router 8.0.17+)
2. Log files
3. System-level port monitoring
4. Metadata cache queries

## Enable the REST API

Edit `/etc/mysqlrouter/mysqlrouter.conf` to enable the REST API:

```ini
[http_server]
port = 8443
ssl = 1
ssl_cert = /etc/mysqlrouter/router-cert.pem
ssl_key = /etc/mysqlrouter/router-key.pem

[rest_router]
require_realm = default_auth

[rest_api]

[rest_routing]
require_realm = default_auth

[http_auth_realm:default_auth]
backend = default_auth
method = basic
name = default_realm

[http_auth_backend:default_auth]
backend = file
filename = /etc/mysqlrouter/users
```

Create a user for the REST API:

```bash
mysqlrouter_passwd set /etc/mysqlrouter/users monitor
```

## Query the REST API

```bash
# Get router status
curl -u monitor:secret -k https://router-host:8443/api/20190715/router/status

# Get routing status
curl -u monitor:secret -k https://router-host:8443/api/20190715/routes/

# Get connection stats per route
curl -u monitor:secret -k \
  https://router-host:8443/api/20190715/routes/myCluster_rw/status
```

Sample response:

```json
{
    "activeConnections": 12,
    "totalConnections": 847,
    "blockedHosts": 0
}
```

## Check Active Connections per Route

```bash
# All routes
curl -s -u monitor:secret -k \
  https://router-host:8443/api/20190715/routes/ | python3 -m json.tool
```

## Monitor via Log File

MySQL Router logs connection events to its log file:

```bash
# Default log location
tail -f /var/log/mysqlrouter/mysqlrouter.log

# Filter connection events
grep "connection" /var/log/mysqlrouter/mysqlrouter.log | tail -20
```

Increase log level for debugging:

```ini
[logger]
level = DEBUG
```

## Check Port Usage with ss

```bash
# Show connections to all router ports
ss -tnp | grep mysqlrouter

# Count active connections per port
ss -tn | grep ':6446' | wc -l
ss -tn | grep ':6447' | wc -l
```

## Monitor Router from MySQL Shell

```javascript
shell.connect('admin@node1:3306')
var cluster = dba.getCluster()

// Check router registrations
cluster.listRouters()
```

```text
{
    "clusterName": "myCluster",
    "routers": {
        "router-host::system": {
            "hostname": "router-host",
            "lastCheckIn": "2026-03-31 10:00:00",
            "roPort": "6447",
            "rwPort": "6446",
            "version": "8.0.35"
        }
    }
}
```

## Create a Prometheus Scrape Script

MySQL Router REST API can be scraped for Prometheus-style monitoring:

```bash
#!/bin/bash
# Export connection metrics
ACTIVE=$(curl -s -u monitor:secret -k \
  https://router-host:8443/api/20190715/routes/myCluster_rw/status \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['activeConnections'])")

echo "mysql_router_active_connections{route=\"rw\"} $ACTIVE"
```

## Summary

Monitor MySQL Router connections using the built-in REST API at port 8443, which provides per-route active connection counts, total connections, and blocked hosts. Use `mysqlrouter_passwd` to create API users. For quick checks, `ss -tn | grep :6446` shows active TCP connections. Use `cluster.listRouters()` in MySQL Shell to verify router registration and last check-in time.
