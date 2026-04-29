# How to Set Up Load Balancing Across Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Load Balancing, Nginx, Traefik, High Availability, Stack

Description: Configure load balancing across multiple container replicas in Portainer using Docker Swarm's built-in load balancer or Traefik as a reverse proxy for HTTP traffic distribution.

---

Load balancing distributes incoming requests across multiple container instances, improving throughput and availability. Docker has built-in load balancing for Swarm services, and tools like Traefik provide more advanced HTTP-level load balancing.

## Method 1: Docker Swarm Built-in Load Balancing

Docker Swarm automatically load-balances traffic across service replicas using a Virtual IP (VIP):

```yaml
# swarm-load-balanced-stack.yml

version: "3.8"
services:
  webapp:
    image: myapp:1.2.3
    deploy:
      replicas: 3      # 3 instances - traffic distributed round-robin
      update_config:
        parallelism: 1    # Update one at a time
        delay: 10s
      rollback_config:
        parallelism: 1
    ports:
      - "8080:8080"    # Published port is load-balanced across all replicas
    networks:
      - app-net

networks:
  app-net:
    driver: overlay
```

Docker Swarm assigns a VIP to the `webapp` service. All traffic to port 8080 is distributed across all 3 replicas.

## Method 2: Traefik as Reverse Proxy and Load Balancer

Traefik provides HTTP-level load balancing with path-based routing and SSL termination:

```yaml
# traefik-load-balancer-stack.yml
version: "3.8"
services:
  traefik:
    image: traefik:v3.0
    command:
      - --providers.swarm.endpoint=unix:///var/run/docker.sock
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --api.insecure=true
      - --certificatesresolvers.letsencrypt.acme.httpchallenge=true
      - --certificatesresolvers.letsencrypt.acme.email=admin@example.com
      - --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json
      - --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"    # Traefik dashboard (development only)
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-certs:/letsencrypt
    deploy:
      placement:
        constraints:
          - node.role == manager
    networks:
      - traefik-net

  webapp:
    image: myapp:1.2.3
    deploy:
      replicas: 4
      labels:
        # Traefik routing rules via container labels
        - traefik.enable=true
        - traefik.http.routers.webapp.rule=Host(`app.example.com`)
        - traefik.http.routers.webapp.entrypoints=websecure
        - traefik.http.routers.webapp.tls.certresolver=letsencrypt
        - traefik.http.services.webapp.loadbalancer.server.port=8080
    networks:
      - traefik-net

volumes:
  traefik-certs:

networks:
  traefik-net:
    driver: overlay
```

## Method 3: Nginx Load Balancer

For simple HTTP load balancing without Swarm:

```yaml
version: "3.8"
services:
  nginx:
    image: nginx:1.25
    volumes:
      - /opt/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "80:80"
    depends_on:
      - app-1
      - app-2
      - app-3

  app-1:
    image: myapp:1.2.3
  app-2:
    image: myapp:1.2.3
  app-3:
    image: myapp:1.2.3
```

```nginx
# /opt/nginx/nginx.conf
upstream app_servers {
    least_conn;    # Route to server with fewest active connections
    server app-1:8080;
    server app-2:8080;
    server app-3:8080;
}

server {
    listen 80;
    location / {
        proxy_pass http://app_servers;
    }
}
```

## Health-Aware Load Balancing

Configure Traefik or Nginx to stop sending traffic to unhealthy containers:

```yaml
# Traefik health check configuration
labels:
  - traefik.http.services.webapp.loadbalancer.healthcheck.path=/health
  - traefik.http.services.webapp.loadbalancer.healthcheck.interval=10s
  - traefik.http.services.webapp.loadbalancer.healthcheck.timeout=5s
```

## Summary

Load balancing in Portainer is achievable through Docker Swarm's built-in VIP balancing, Traefik for advanced HTTP routing, or Nginx for simple upstream balancing. Use Swarm replicas for stateless services, Traefik when you need SSL termination and path-based routing, and Nginx when fine-grained upstream control is needed.
