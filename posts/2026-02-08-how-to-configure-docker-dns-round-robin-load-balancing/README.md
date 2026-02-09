# How to Configure Docker DNS Round-Robin Load Balancing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, DNS, Load Balancing, Round Robin, Networking, Containers, Scaling

Description: Set up DNS-based round-robin load balancing across Docker containers using built-in service discovery features.

---

Docker's built-in DNS server on custom networks does more than resolve container names to IP addresses. When multiple containers share the same network alias, Docker returns all their IP addresses in DNS responses, rotating the order. This is DNS round-robin load balancing, and it works without any external tools, load balancers, or configuration changes.

This guide shows you how to set up DNS round-robin load balancing in Docker, understand its behavior, work around its limitations, and decide when it is the right choice for your workload.

## How Docker DNS Round-Robin Works

On custom bridge networks, Docker runs an embedded DNS server at 127.0.0.11 inside each container. When you assign a network alias to multiple containers, the DNS server returns all matching IP addresses. Clients pick one (usually the first), and Docker rotates the order on each query.

```bash
# Create a custom network (required - default bridge does not support this)
docker network create app-network
```

Start three backend containers with the same network alias:

```bash
# Start three web servers, all sharing the "backend" alias
docker run -d --name web1 --network app-network --network-alias backend nginx:alpine
docker run -d --name web2 --network app-network --network-alias backend nginx:alpine
docker run -d --name web3 --network app-network --network-alias backend nginx:alpine
```

Now resolve the alias from a client container:

```bash
# Run a client container on the same network
docker run --rm --network app-network alpine nslookup backend
```

Output shows multiple IP addresses:

```
Server:    127.0.0.11
Address:   127.0.0.11:53

Name:      backend
Address 1: 172.18.0.2
Address 2: 172.18.0.3
Address 3: 172.18.0.4
```

Query again and the order changes:

```bash
# Query multiple times to see rotation
for i in $(seq 1 5); do
  docker run --rm --network app-network alpine nslookup backend 2>/dev/null | grep "Address [0-9]"
  echo "---"
done
```

## Customizing Each Backend

To demonstrate load distribution, give each backend a distinct response:

```bash
# Remove the previous containers
docker rm -f web1 web2 web3

# Create containers with custom responses to identify which one responds
docker run -d --name web1 --network app-network --network-alias backend \
  nginx:alpine sh -c 'echo "Response from web1" > /usr/share/nginx/html/index.html && nginx -g "daemon off;"'

docker run -d --name web2 --network app-network --network-alias backend \
  nginx:alpine sh -c 'echo "Response from web2" > /usr/share/nginx/html/index.html && nginx -g "daemon off;"'

docker run -d --name web3 --network app-network --network-alias backend \
  nginx:alpine sh -c 'echo "Response from web3" > /usr/share/nginx/html/index.html && nginx -g "daemon off;"'
```

Test load distribution:

```bash
# Make 12 requests and see which backend responds
docker run --rm --network app-network curlimages/curl sh -c '
  for i in $(seq 1 12); do
    curl -s http://backend/
  done
'
```

You should see responses from all three backends. The distribution depends on DNS caching behavior in the HTTP client, which is an important limitation we will address later.

## Docker Compose with DNS Round-Robin

Docker Compose makes this even simpler with the `deploy.replicas` setting:

```yaml
# docker-compose.yml - DNS round-robin with scaled services
services:
  backend:
    image: nginx:alpine
    networks:
      - app-network
    deploy:
      replicas: 3

  client:
    image: curlimages/curl
    networks:
      - app-network
    depends_on:
      - backend
    entrypoint: ["sleep", "3600"]

networks:
  app-network:
    driver: bridge
```

Start and scale:

```bash
# Start with 3 backend replicas
docker compose up -d

# Scale up to 5 backends
docker compose up -d --scale backend=5

# Verify DNS returns all 5 addresses
docker exec $(docker compose ps -q client) nslookup backend
```

## DNS TTL and Caching Behavior

Docker's embedded DNS server uses a very short TTL (typically 600 seconds). But the real behavior depends on the client:

```bash
# Check the DNS response TTL
docker run --rm --network app-network alpine sh -c '
  apk add --no-cache bind-tools > /dev/null 2>&1
  dig backend @127.0.0.11
'
```

Some HTTP clients (like curl) resolve DNS once and reuse the connection. Others resolve per-request. This affects how evenly traffic distributes:

```bash
# curl with --resolve forces a specific IP, bypassing DNS
# Without it, curl may reuse the same connection (and IP)

# Force fresh DNS resolution per request using a loop
docker run --rm --network app-network curlimages/curl sh -c '
  for i in $(seq 1 30); do
    curl -s --connect-timeout 2 http://backend/ 2>/dev/null
  done
' | sort | uniq -c
```

## Handling Container Failures

When a container dies, Docker's DNS server stops returning its IP. This provides basic health-aware routing:

```bash
# Stop one backend
docker stop web2

# DNS now returns only 2 addresses
docker run --rm --network app-network alpine nslookup backend

# Start it again
docker start web2

# DNS returns 3 addresses again
docker run --rm --network app-network alpine nslookup backend
```

The DNS update happens within a few seconds of the container stopping. Clients that cache DNS may continue trying the dead container's IP until their cache expires.

## Combining DNS Round-Robin with Health Checks

Add health checks to ensure DNS only returns healthy backends:

```yaml
# docker-compose.yml - Round-robin with health checks
services:
  backend:
    image: nginx:alpine
    networks:
      - app-network
    deploy:
      replicas: 3
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost/"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 5s

networks:
  app-network:
    driver: bridge
```

Docker marks unhealthy containers, but its DNS server still returns their addresses. For true health-aware DNS, you need a proxy layer.

## Adding a Proxy for Better Load Balancing

DNS round-robin has limitations. For production workloads, add a lightweight proxy that uses Docker DNS for service discovery:

```yaml
# docker-compose.yml - Nginx reverse proxy with DNS-discovered backends
services:
  proxy:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx-lb.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - app-network
    depends_on:
      - backend

  backend:
    image: nginx:alpine
    networks:
      - app-network
    deploy:
      replicas: 3

networks:
  app-network:
    driver: bridge
```

Configure Nginx to resolve the Docker DNS alias:

```nginx
# nginx-lb.conf - Nginx load balancer using Docker DNS
upstream backend_pool {
    # Use the Docker DNS resolver
    # 'resolve' parameter requires nginx-plus or dynamic upstream modules
    server backend:80;
}

server {
    listen 80;

    location / {
        proxy_pass http://backend_pool;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

For dynamic resolution (picking up new replicas without restart), use the resolver directive:

```nginx
# nginx-lb-dynamic.conf - Dynamic DNS resolution for Docker service discovery
resolver 127.0.0.11 valid=10s;

server {
    listen 80;

    location / {
        set $backend "http://backend:80";
        proxy_pass $backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

The `resolver 127.0.0.11 valid=10s` line tells Nginx to use Docker's embedded DNS and re-resolve every 10 seconds.

## Monitoring Load Distribution

Track which backend handles each request:

```bash
# Add a custom header to identify the backend
docker run -d --name web-id-1 --network app-network --network-alias backend \
  nginx:alpine sh -c '
    echo "server { listen 80; add_header X-Backend web-id-1; location / { return 200 \"web1\n\"; }}" \
    > /etc/nginx/conf.d/default.conf && nginx -g "daemon off;"'

# Check distribution using headers
docker run --rm --network app-network curlimages/curl sh -c '
  for i in $(seq 1 20); do
    curl -sI http://backend/ | grep X-Backend
  done
' | sort | uniq -c
```

## Limitations of DNS Round-Robin

Be aware of these constraints:

1. **No connection-aware balancing** - DNS does not know which backend has fewer connections
2. **Client caching** - Applications may cache DNS results and send all traffic to one backend
3. **No weighted distribution** - Every backend gets equal representation in DNS
4. **Slow failover** - Clients may try a dead backend until DNS cache expires
5. **No session affinity** - Each DNS query may return a different order

For these reasons, DNS round-robin works best for stateless services where imperfect distribution is acceptable. For production load balancing, pair it with a reverse proxy.

## Cleanup

```bash
# Remove all test containers and networks
docker rm -f web1 web2 web3 web-id-1
docker network rm app-network
```

## Conclusion

Docker DNS round-robin is the simplest form of load balancing available in Docker. It requires zero configuration beyond creating a custom network and assigning aliases to containers. It works for development, testing, and simple production setups where stateless services need basic request distribution. For more sophisticated needs, use DNS round-robin as the service discovery mechanism and put a proper load balancer (Nginx, HAProxy, or Traefik) in front. The two approaches complement each other well.
