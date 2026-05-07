# How to Set Up Load Balancing with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Load Balancing, Nginx, HAProxy, Container, Scaling

Description: Learn how to distribute traffic across multiple Podman containers using Nginx and HAProxy as load balancers, with health checks and different balancing algorithms.

---

> Load balancing distributes incoming traffic across multiple container instances, improving reliability and performance. With Podman, you can scale services horizontally and use battle-tested load balancers like Nginx and HAProxy to manage traffic distribution.

When a single container instance cannot handle all incoming traffic, or when you need redundancy to avoid downtime, load balancing becomes essential. By running multiple instances of a service and placing a load balancer in front of them, you distribute the workload and ensure that the failure of one instance does not take down the entire service.

This guide demonstrates how to set up load balancing for Podman containers using both Nginx and HAProxy, covering different algorithms, health checks, and session persistence.

---

## Prerequisites

- Podman 4.0 or later
- A Linux system with systemd
- Basic understanding of container networking

```bash
podman --version
```

## Creating the Network

All containers need to be on the same Podman network for DNS-based discovery:

```bash
podman network create lb-net
```

## Launching Multiple Backend Instances

Start three instances of a backend service. To differentiate them, we will use a simple custom response:

```bash
for i in 1 2 3; do
  podman run -d \
    --name backend-$i \
    --network lb-net \
    --hostname backend-$i \
    docker.io/library/nginx:alpine
done
```

Customize each instance to identify itself:

```bash
for i in 1 2 3; do
  podman exec backend-$i sh -c "echo 'Response from backend-$i' > /usr/share/nginx/html/index.html"
done
```

## Load Balancing with Nginx

### Round Robin (Default)

Create the Nginx configuration:

```bash
mkdir -p ~/nginx-lb/conf.d

cat > ~/nginx-lb/conf.d/default.conf << 'EOF'
upstream backend_pool {
    server backend-1:80;
    server backend-2:80;
    server backend-3:80;
}

server {
    listen 80;

    location / {
        proxy_pass http://backend_pool;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /health {
        access_log off;
        return 200 "load balancer healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
```

Launch the load balancer:

```bash
podman run -d \
  --name nginx-lb \
  --network lb-net \
  -p 8080:80 \
  -v ~/nginx-lb/conf.d:/etc/nginx/conf.d:ro,Z \
  docker.io/library/nginx:alpine
```

Test load distribution:

```bash
for i in $(seq 1 6); do
  curl -s http://localhost:8080
done
```

You should see responses cycling through all three backends.

### Weighted Round Robin

Assign different weights to backends based on their capacity:

```nginx
upstream backend_pool {
    server backend-1:80 weight=5;
    server backend-2:80 weight=3;
    server backend-3:80 weight=2;
}
```

Backend-1 receives 50% of traffic, backend-2 receives 30%, and backend-3 receives 20%.

### Least Connections

Route traffic to the backend with the fewest active connections:

```nginx
upstream backend_pool {
    least_conn;
    server backend-1:80;
    server backend-2:80;
    server backend-3:80;
}
```

### IP Hash (Session Persistence)

Ensure a client always reaches the same backend:

```nginx
upstream backend_pool {
    ip_hash;
    server backend-1:80;
    server backend-2:80;
    server backend-3:80;
}
```

This is useful for applications that store session data locally rather than in a shared store.

### Health Checks with Nginx

Nginx open source supports passive health checks. If a backend fails, Nginx marks it as unavailable:

```nginx
upstream backend_pool {
    server backend-1:80 max_fails=3 fail_timeout=30s;
    server backend-2:80 max_fails=3 fail_timeout=30s;
    server backend-3:80 max_fails=3 fail_timeout=30s;
}
```

After three consecutive failures, the backend is removed from rotation for 30 seconds.

## Load Balancing with HAProxy

HAProxy is a dedicated load balancer with more advanced features than Nginx for traffic distribution.

### Create the HAProxy Configuration

```bash
mkdir -p ~/haproxy

cat > ~/haproxy/haproxy.cfg << 'EOF'
global
    log stdout format raw local0 info
    maxconn 4096

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5s
    timeout client  30s
    timeout server  30s
    retries 3

frontend http_front
    bind *:80
    default_backend backend_servers

    stats enable
    stats uri /stats
    stats refresh 10s

backend backend_servers
    balance roundrobin
    option httpchk GET /
    http-check expect status 200

    server backend1 backend-1:80 check inter 5s fall 3 rise 2
    server backend2 backend-2:80 check inter 5s fall 3 rise 2
    server backend3 backend-3:80 check inter 5s fall 3 rise 2
EOF
```

Key configuration details:

- `balance roundrobin` sets the balancing algorithm
- `option httpchk` enables active HTTP health checks
- `check inter 5s` checks each backend every 5 seconds
- `fall 3` marks a backend as down after 3 consecutive failures
- `rise 2` marks a backend as up after 2 consecutive successes

### Launch HAProxy

```bash
podman run -d \
  --name haproxy-lb \
  --network lb-net \
  -p 8081:80 \
  -v ~/haproxy/haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro,Z \
  docker.io/library/haproxy:alpine
```

### HAProxy Load Balancing Algorithms

**Least Connections:**

```text
balance leastconn
```

**Source IP Hash:**

```text
balance source
```

**URI Hash:**

```text
balance uri
```

**Random:**

```text
balance random
```

### HAProxy Stats Dashboard

Access the HAProxy stats page at `http://localhost:8081/stats`. This shows real-time information about each backend, including connection counts, response times, and health status.

## Scaling Backends Dynamically

### Adding a New Backend

Start a new container and update the load balancer configuration:

```bash
podman run -d \
  --name backend-4 \
  --network lb-net \
  docker.io/library/nginx:alpine

podman exec backend-4 sh -c "echo 'Response from backend-4' > /usr/share/nginx/html/index.html"
```

For Nginx, add the new server to the upstream block and reload:

```bash
# Add "server backend-4:80;" to the upstream block

podman exec nginx-lb nginx -s reload
```

For HAProxy, add the server line and reload:

```bash
podman kill --signal HUP haproxy-lb
```

### Removing a Backend

To gracefully drain a backend before removing it, mark it as down in the configuration:

For Nginx:

```nginx
upstream backend_pool {
    server backend-1:80;
    server backend-2:80;
    server backend-3:80 down;
}
```

For HAProxy:

```text
server backend3 backend-3:80 check disabled
```

After reloading, wait for active connections to complete, then stop the container:

```bash
podman stop backend-3
podman rm backend-3
```

## Connection Draining and Graceful Shutdown

Configure the load balancer to handle backend shutdowns gracefully:

```nginx
upstream backend_pool {
    server backend-1:80;
    server backend-2:80;
    server backend-3:80;

    keepalive 32;
}

server {
    listen 80;

    location / {
        proxy_pass http://backend_pool;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

The `keepalive` directive maintains persistent connections to backends, reducing connection overhead.

## Monitoring Load Balancer Health

Create a simple monitoring script:

```bash
cat > ~/lb-monitor.sh << 'SCRIPT'
#!/bin/bash
echo "=== Backend Status ==="
for i in 1 2 3; do
  if podman exec nginx-lb wget -q -O /dev/null http://backend-$i:80/ 2>/dev/null; then
    echo "backend-$i: UP"
  else
    echo "backend-$i: DOWN"
  fi
done

echo ""
echo "=== Load Balancer Response ==="
curl -s -o /dev/null -w "HTTP %{http_code} - Response time: %{time_total}s\n" http://localhost:8080
SCRIPT
chmod +x ~/lb-monitor.sh
```

## Running as Systemd Services with Quadlet

Podman Quadlet is the recommended way to run containers under systemd. Create Quadlet unit files in `~/.config/containers/systemd/` for rootless setups:

```bash
mkdir -p ~/.config/containers/systemd/
```

Create a Quadlet file for the load balancer:

```ini
# ~/.config/containers/systemd/nginx-lb.container
[Container]
ContainerName=nginx-lb
Image=docker.io/library/nginx:alpine
Network=lb-net
PublishPort=8080:80
Volume=%h/nginx-lb/conf.d:/etc/nginx/conf.d:ro,Z

[Service]
Restart=always

[Install]
WantedBy=default.target
```

Create Quadlet files for each backend:

```bash
for i in 1 2 3; do
cat > ~/.config/containers/systemd/backend-$i.container << EOF
[Container]
ContainerName=backend-$i
Image=docker.io/library/nginx:alpine
Network=lb-net
Hostname=backend-$i

[Service]
Restart=always

[Install]
WantedBy=default.target
EOF
done
```

Reload systemd and enable the services:

```bash
systemctl --user daemon-reload
systemctl --user start nginx-lb.service
for i in 1 2 3; do
  systemctl --user start backend-$i.service
done
loginctl enable-linger $USER
```

## Conclusion

Load balancing with Podman is straightforward using established tools like Nginx and HAProxy. Nginx works well for simple setups and when you are already using it as a reverse proxy. HAProxy excels when you need advanced health checking, detailed statistics, and a wider range of balancing algorithms. Both integrate cleanly with Podman's networking model, and both can be managed as systemd services for production reliability. The key is to choose the right algorithm for your workload: round robin for uniform services, least connections for variable-length requests, and IP hash when session affinity matters.
