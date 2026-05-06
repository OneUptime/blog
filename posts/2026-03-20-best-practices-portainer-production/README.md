# Best Practices for Running Portainer in Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Production, Best Practice, Security, High Availability, DevOps

Description: Run Portainer reliably in production with TLS termination, high availability, proper resource allocation, monitoring, and security hardening for enterprise-grade container management.

---

Running Portainer in production requires more than the basic quick-start. This guide covers TLS, high availability, resource sizing, monitoring, and security hardening for a production-grade Portainer deployment.

## Production Deployment Checklist

- [ ] TLS/HTTPS configured
- [ ] Strong admin password set
- [ ] LDAP/SSO authentication enabled
- [ ] Resource limits configured
- [ ] Monitoring and alerting set up
- [ ] Backup schedule configured
- [ ] Reverse proxy configured
- [ ] Firewall rules applied

## Step 1: TLS Configuration

Never run Portainer in production over HTTP. Use one of these approaches:

**Option A: Portainer with self-managed certificates:**

```bash
docker run -d \
  --name portainer \
  --restart always \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /opt/portainer/ssl:/certs \
  portainer/portainer-ee:lts \
  --sslcert /certs/portainer.crt \
  --sslkey /certs/portainer.key
```

**Option B: Nginx reverse proxy (recommended):**

```yaml
# portainer-production-stack.yml

services:
  portainer:
    image: portainer/portainer-ee:lts
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    # Do NOT expose ports - nginx handles TLS termination
    restart: always
    networks:
      - portainer-internal

  nginx:
    image: nginx:1.25-alpine
    volumes:
      - /opt/nginx/portainer.conf:/etc/nginx/conf.d/portainer.conf:ro
      - /opt/certs:/etc/nginx/certs:ro
    ports:
      - "443:443"
    restart: always
    networks:
      - portainer-internal

networks:
  portainer-internal:
    driver: bridge
```

```nginx
# /opt/nginx/portainer.conf
server {
    listen 443 ssl;
    server_name portainer.example.com;
    
    ssl_certificate /etc/nginx/certs/portainer.crt;
    ssl_certificate_key /etc/nginx/certs/portainer.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    location / {
        proxy_pass http://portainer:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Step 2: Resource Sizing

Portainer does not publish a fixed CPU/RAM sizing matrix. Size the deployment based on the number of managed environments, enabled features, and actual usage, and pay close attention to the performance of the persistent `/data` volume.

For production workloads, Portainer recommends using an LTS release and persistent storage with high throughput and low latency. If you use Git-based deployments, make sure the `/data` volume also has enough capacity for local repository clones.

Set resource limits:

```bash
docker run -d --name portainer \
  --memory="1g" \
  --cpus="1.0" \
  ...
```

## Step 3: Monitoring Portainer

Monitor Portainer's own health:

```yaml
  # Uptime Kuma or similar for Portainer availability monitoring
  uptime-kuma:
    image: louislam/uptime-kuma:1
    volumes:
      - uptime-kuma-data:/app/data
    ports:
      - "3001:3001"
    restart: always
```

Configure a monitor for `https://portainer.example.com/api/system/status` - this endpoint returns Portainer's operational status.

## Step 4: Security Hardening

```bash
# 1. Change the initial admin username and use a strong password
# 2. Configure LDAP, Active Directory, or OAuth if you need centralized authentication
# 3. If Portainer is behind a reverse proxy and you see "Origin invalid" errors,
#    start Portainer with --trusted-origins portainer.example.com
# 4. Disable analytics during initial setup if you do not want anonymous usage statistics

# Firewall: only allow HTTPS from trusted IPs to Portainer
ufw allow from 10.0.0.0/8 to any port 443 proto tcp
ufw deny 443/tcp
```

## Step 5: High Availability

For production environments where Portainer downtime is unacceptable:

1. Persist the Portainer `/data` volume and run the server on a specific management node
2. In Docker Swarm, constrain the Portainer service to the node where the data volume lives; in Kubernetes, use cluster-available storage or a `nodeSelector`
3. Configure backups, health monitoring, and auto-restart

Note: Portainer does not currently support running multiple Portainer Server instances against the same clusters, so do not place multiple server replicas behind a load balancer.

## Step 6: Regular Maintenance

- **Update Portainer** - stay on the latest patch release in your chosen stream; Portainer recommends LTS releases for production workloads
- **Prune unused resources** - review before pruning; `docker system prune` removes unused containers, networks, images, and build cache
- **Review access** - quarterly user and permission review
- **Test backups** - monthly restore test from backup

## Summary

Production Portainer deployments require TLS, proper sizing, monitoring, security hardening, persistent storage, and a backup/restore plan. Treat Portainer as a critical piece of infrastructure - its availability affects all the services it manages.
