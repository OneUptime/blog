# How to Configure HAProxy Layer 4 TCP Load Balancing on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, TCP, Layer 4, Load Balancing, IPv4, Networking

Description: Configure HAProxy in TCP mode for Layer 4 load balancing, distributing TCP connections across IPv4 backend servers for databases, game servers, and other non-HTTP protocols.

## Introduction

Layer 4 load balancing operates at the TCP transport layer, forwarding connections based on source/destination IP and port without inspecting application content. HAProxy's `tcp` mode has lower overhead than `http` mode and works with any TCP-based protocol.

## Basic TCP Load Balancer

```haproxy
# /etc/haproxy/haproxy.cfg

global
    log /dev/log local0
    maxconn 50000
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    tcp              # TCP mode: Layer 4 forwarding
    option  tcplog          # TCP connection logging
    timeout connect  5s
    timeout client   1m     # Long timeout for persistent connections
    timeout server   1m

# Frontend: accept TCP connections

frontend mysql_frontend
    bind 203.0.113.10:3306   # Listen for MySQL connections

    default_backend mysql_servers

# Backend: MySQL cluster
backend mysql_servers
    balance roundrobin

    # TCP health check: attempts a TCP connection
    option tcp-check

    server db1 192.168.1.10:3306 check
    server db2 192.168.1.11:3306 check
    server db3 192.168.1.12:3306 check
```

## TCP with Custom Health Check

For protocols where a simple request/response health check is more useful than a bare TCP connect:

```haproxy
backend redis_servers
    mode tcp
    balance roundrobin

    # Redis health check: send PING, expect +PONG
    option tcp-check
    tcp-check connect
    tcp-check send PING\r\n
    tcp-check expect string +PONG

    server redis1 192.168.1.10:6379 check
    server redis2 192.168.1.11:6379 check
    server redis3 192.168.1.12:6379 check backup
```

## Multiple TCP Frontends

Load balance different protocols on different ports:

```haproxy
# PostgreSQL load balancer
frontend pgsql_frontend
    bind 203.0.113.10:5432
    mode tcp
    default_backend pgsql_servers

backend pgsql_servers
    mode tcp
    balance leastconn        # Least connections for databases

    server pg1 192.168.2.10:5432 check
    server pg2 192.168.2.11:5432 check

# MQTT broker load balancer
frontend mqtt_frontend
    bind 203.0.113.10:1883
    mode tcp
    default_backend mqtt_servers

backend mqtt_servers
    mode tcp
    balance source          # Same client IP hashes to the same broker

    server mqtt1 192.168.3.10:1883 check
    server mqtt2 192.168.3.11:1883 check
```

## Connection Limits and Timeouts

```haproxy
defaults
    mode    tcp
    timeout connect    5s
    timeout client     10m    # Idle client timeout
    timeout server     10m    # Idle server timeout
    timeout queue      30s    # Queue timeout while waiting for a server slot

frontend database_frontend
    bind 203.0.113.10:3306
    maxconn 100              # Max client connections this frontend accepts
    default_backend database_servers

backend database_servers
    balance leastconn

    # Limit connections to protect the database
    server db1 192.168.1.10:3306 check maxconn 50   # Per-server limit
    server db2 192.168.1.11:3306 check maxconn 50
```

## Logging TCP Connections

```haproxy
defaults
    mode    tcp
    option  tcplog

    # TCP log format: client IP, server, connection duration, bytes
    log-format "%ci:%cp [%t] %ft %b/%s %Tw/%Tc/%Tt %B %ts %ac/%fc/%bc/%sc/%rc %sq/%bq"
```

## Verifying TCP Load Balancing

```bash
# Connect directly via TCP
telnet 203.0.113.10 3306

# Test MySQL connection
mysql -h 203.0.113.10 -P 3306 -u testuser -p

# Monitor active connections (requires a configured HAProxy stats/admin socket)
echo "show info" | sudo socat stdio /run/haproxy/admin.sock | grep CurrConns

# Watch backend server states (requires a configured HAProxy stats/admin socket)
watch -n2 "echo 'show servers state' | sudo socat stdio /run/haproxy/admin.sock"
```

## Conclusion

HAProxy TCP mode provides high-performance Layer 4 load balancing for any TCP protocol. Set `mode tcp` in `defaults`, or explicitly on the `frontend`/`backend` sections you want in TCP mode, use `option tcp-check` for basic health monitoring, and configure appropriate timeouts for your protocol's connection duration. Layer 4 bypasses HTTP inspection overhead, making it ideal for database, message broker, and game server load balancing.
