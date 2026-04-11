# How to Configure Redis Behind a Load Balancer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Load Balancer, High Availability, Networking, Architecture

Description: Learn how to place Redis behind a load balancer for read scaling, connection pooling, and high availability, including proper health checks and session persistence configuration.

---

## When to Use a Load Balancer with Redis

A load balancer in front of Redis is useful for:

- **Read scaling** - distribute read traffic across multiple Redis replicas
- **Connection multiplexing** - use a proxy like HAProxy or Envoy to pool connections
- **Health checking** - automatically remove failed Redis nodes from the pool
- **Transparent failover** - route clients to the healthy primary after a Sentinel failover

Redis is a stateful service with a primary/replica distinction. Load balancers must be aware of this: writes must go to the primary, reads can go to replicas.

## Architecture Patterns

### Pattern 1 - Separate Read and Write Endpoints

```text
Application
  |-- Write endpoint (LB) --> Redis Primary
  |-- Read endpoint (LB)  --> Redis Replica 1
                           --> Redis Replica 2
```

### Pattern 2 - Single Endpoint with Write-to-Primary Routing

Use a proxy that understands Redis protocol (like HAProxy with TCP mode or Envoy) and routes based on connection state.

### Pattern 3 - Sentinel-Aware Proxy (Recommended)

Use a Sentinel-aware proxy like Predixy, which integrates with Redis Sentinel to automatically route to the current primary.

## AWS Network Load Balancer Setup

If running Redis on EC2 or ECS, use an NLB for TCP passthrough:

1. Create a target group for Redis primaries (port 6379)
2. Register your Redis primary instances
3. Configure TCP health check on port 6379
4. Create an NLB listener on port 6379 forwarding to the target group

The NLB does not terminate the Redis protocol - it passes TCP through.

Health check script for AWS:

```bash
#!/bin/bash
# Health check for Redis - returns 0 if this is the primary
ROLE=$(redis-cli -h localhost -p 6379 -a "$REDIS_PASSWORD" INFO replication | grep role | cut -d: -f2 | tr -d '[:space:]')
if [ "$ROLE" = "master" ]; then
  exit 0
else
  exit 1
fi
```

Expose this script via an HTTP endpoint (for example, using the Python health check service shown below) and configure the NLB target group to use an HTTP health check against that endpoint.

## HAProxy Configuration for Redis

See the dedicated HAProxy guide, but the key concepts for load balancing:

```text
# /etc/haproxy/haproxy.cfg
frontend redis_frontend
    bind *:6379
    mode tcp
    default_backend redis_backend

backend redis_backend
    mode tcp
    balance leastconn
    option tcp-check
    tcp-check connect
    tcp-check send AUTH\ yourpassword\r\n
    tcp-check expect string +OK
    tcp-check send PING\r\n
    tcp-check expect string +PONG
    tcp-check send info\ replication\r\n
    tcp-check expect string role:master
    tcp-check send QUIT\r\n
    tcp-check expect string +OK

    server redis-primary-1 10.0.0.1:6379 check inter 3s
    server redis-primary-2 10.0.0.2:6379 check inter 3s backup
```

This ensures only the primary accepts connections, with the secondary as backup.

## NGINX TCP Proxy for Redis

NGINX can proxy Redis connections in stream mode:

```nginx
# /etc/nginx/nginx.conf
stream {
    upstream redis_primary {
        least_conn;
        server 10.0.0.1:6379;
        server 10.0.0.2:6379 backup;
    }

    upstream redis_replicas {
        server 10.0.0.3:6379;
        server 10.0.0.4:6379;
    }

    server {
        listen 6379;
        proxy_pass redis_primary;
        proxy_connect_timeout 1s;
        proxy_timeout 300s;
    }

    server {
        listen 6380;
        proxy_pass redis_replicas;
        proxy_connect_timeout 1s;
        proxy_timeout 300s;
    }
}
```

## Using Predixy (Sentinel-Aware Proxy)

Predixy is a Redis proxy that integrates with Sentinel for automatic primary/replica routing:

```bash
# Install
wget https://github.com/joyieldInc/predixy/releases/download/1.0.5/predixy-1.0.5-amd64-linux.tar.gz
tar xzf predixy-1.0.5-amd64-linux.tar.gz
```

Create `predixy.conf`:

```text
Bind 0.0.0.0:7617

Authority {
    Auth "yourpassword" {
        Mode write
    }
}

SentinelServerPool {
    Databases 16
    Hash crc16
    HashTag "{}"
    Distribution modula
    MasterReadPriority 60
    StaticSlaveReadPriority 50
    DynamicSlaveReadPriority 50
    RefreshInterval 1
    ServerTimeout 1
    ServerFailure 10
    ServerRetry 3
    KeepAlive 120
    Sentinels {
        + 10.0.0.1:26379
        + 10.0.0.2:26379
        + 10.0.0.3:26379
    }
    Group mymaster {
    }
}
```

Applications connect to Predixy on port 7617. Predixy discovers the primary via Sentinel and routes reads to replicas automatically.

## Health Checks for Redis Load Balancers

A proper health check must verify:
1. Redis is reachable
2. The node is the primary (for write endpoints)

Python health check service:

```python
from flask import Flask, jsonify
import redis

app = Flask(__name__)
r = redis.Redis(host='localhost', port=6379, password='yourpassword')

@app.route('/health/primary')
def check_primary():
    try:
        info = r.info('replication')
        if info['role'] == 'master':
            return jsonify({'status': 'healthy', 'role': 'master'}), 200
        return jsonify({'status': 'unhealthy', 'role': info['role']}), 503
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 503

if __name__ == '__main__':
    app.run(port=8080)
```

Point your load balancer health check to `http://redis-host:8080/health/primary`.

## Sticky Sessions for Pub/Sub

If your application uses Redis Pub/Sub, load balancer session persistence is critical - a subscriber must stay connected to the same Redis instance. Since Redis uses TCP (not HTTP), use source IP affinity for persistence:

```text
# HAProxy sticky by source IP
backend redis_pubsub
    balance source
    server redis-1 10.0.0.1:6379
    server redis-2 10.0.0.2:6379
```

## Summary

Placing Redis behind a load balancer enables read scaling, connection multiplexing, and transparent failover. For write traffic, use a health check that verifies `role:master` to ensure only the primary receives writes. For read scaling, use a separate endpoint load balancing across replicas. Predixy is a Redis-native proxy that integrates with Sentinel for automatic primary discovery, making it ideal for Sentinel-based Redis deployments behind a load balancer.
