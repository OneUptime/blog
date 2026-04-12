# How to Set Up MySQL High Availability with HAProxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, HAProxy, High Availability, Load Balancing, Failover

Description: Configure HAProxy as a TCP load balancer in front of MySQL to provide high availability by automatically removing failed backends from the rotation.

---

## Why Use HAProxy for MySQL HA

HAProxy operates at Layer 4 (TCP) and continuously health-checks MySQL backends. When a backend fails, HAProxy removes it from the pool and routes new connections to healthy servers. This gives you a single connection endpoint for applications while transparently handling backend failures. HAProxy is stateless and can itself be made redundant with Keepalived.

## Installing HAProxy

```bash
sudo apt-get update
sudo apt-get install -y haproxy
```

## Basic MySQL HAProxy Configuration

Edit `/etc/haproxy/haproxy.cfg`:

```text
global
  log /dev/log local0
  maxconn 4096
  user haproxy
  group haproxy
  daemon

defaults
  log     global
  mode    tcp
  option  tcplog
  timeout connect 5s
  timeout client  60s
  timeout server  60s

frontend mysql_frontend
  bind *:3306
  default_backend mysql_primary

backend mysql_primary
  balance first
  option tcp-check
  tcp-check connect
  tcp-check send-binary 0e00000185a6ff0100000001210000000000000000000000000000000000000000000000726f6f7400
  server primary  192.168.1.10:3306 check inter 2s rise 2 fall 3
  server replica1 192.168.1.11:3306 check inter 2s rise 2 fall 3 backup
```

The `balance first` algorithm always uses the first available server, so `replica1` only receives traffic if `primary` is down. Use `balance roundrobin` if you want to distribute reads.

## Adding a Read-Only Backend

For read-write splitting, add a separate frontend on port 3307 pointing to replicas:

```text
frontend mysql_reads
  bind *:3307
  default_backend mysql_replicas

backend mysql_replicas
  balance leastconn
  option tcp-check
  server replica1 192.168.1.11:3306 check inter 2s
  server replica2 192.168.1.12:3306 check inter 2s
```

Applications send writes to port 3306 and reads to port 3307.

## Health Check with xinetd Script

For a smarter health check that verifies MySQL role, use an HTTP-based check via a small script:

```bash
sudo apt-get install -y xinetd
```

Create `/etc/xinetd.d/mysqlchk`:

```text
service mysqlchk
{
  type = UNLISTED
  disable = no
  flags = REUSE
  socket_type = stream
  port = 9200
  wait = no
  user = nobody
  server = /usr/local/bin/mysqlchk
  log_on_failure += USERID
  only_from = 0.0.0.0/0
  per_source = UNLIMITED
}
```

Create `/usr/local/bin/mysqlchk`:

```bash
#!/bin/bash
MYSQL_USERNAME="haproxy_check"
MYSQL_PASSWORD="check_secret"
MYSQL_HOST="localhost"
if /usr/bin/mysqladmin -h $MYSQL_HOST -u $MYSQL_USERNAME -p$MYSQL_PASSWORD ping 2>/dev/null; then
  echo -e "HTTP/1.1 200 OK\r\n"
else
  echo -e "HTTP/1.1 503 Service Unavailable\r\n"
fi
```

```bash
sudo chmod +x /usr/local/bin/mysqlchk
```

Then use `option httpchk GET /` and `server primary ... check port 9200` in HAProxy.

## Enabling the Stats Page

```text
listen stats
  bind *:8080
  mode http
  stats enable
  stats uri /stats
  stats auth admin:secret
```

Visit `http://<haproxy-host>:8080/stats` to see backend health in real time.

## Summary

HAProxy provides a reliable TCP load-balancing layer for MySQL, health-checking backends and automatically routing around failures. Use `balance first` with a `backup` server for strict primary routing, add a read replica backend on a separate port for read scaling, and monitor backend health through the built-in stats page. Pair HAProxy with Keepalived to eliminate the load balancer itself as a single point of failure.
