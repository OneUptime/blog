# How to Set Up Nginx Proxy Manager on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NGINX, Reverse Proxy, Docker, Self-Hosted

Description: Install Nginx Proxy Manager on Ubuntu using Docker Compose to manage reverse proxies, SSL certificates, and access control through a web interface without editing Nginx config files manually.

---

Nginx Proxy Manager (NPM) is a web-based interface for managing Nginx reverse proxy entries and Let's Encrypt SSL certificates. Instead of editing Nginx configuration files by hand, you log into a dashboard, create proxy hosts, and NPM handles the Nginx configuration and certificate renewal behind the scenes. It's particularly useful when you're running multiple self-hosted services and want a unified place to manage how they're exposed.

## When to Use Nginx Proxy Manager

NPM is well-suited for home servers and small teams that run several Docker-based services (Nextcloud, Gitea, Immich, etc.) and want SSL without managing individual Nginx configs. For production systems with complex routing requirements, direct Nginx configuration gives more control, but for most self-hosting scenarios NPM reduces friction significantly.

## Prerequisites

```bash
# Install Docker and Docker Compose
sudo apt update
sudo apt install -y docker.io docker-compose-plugin

sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Log out and back in for group change to apply

# Verify
docker --version
docker compose version
```

## Docker Compose Setup

NPM needs three things: the application itself, a SQLite or MySQL/MariaDB database, and persistent configuration storage.

```bash
# Create directory for NPM
sudo mkdir -p /opt/nginx-proxy-manager/{data,letsencrypt}
sudo chown -R $USER:$USER /opt/nginx-proxy-manager
cd /opt/nginx-proxy-manager
```

Create `docker-compose.yml`:

```yaml
# Nginx Proxy Manager Docker Compose
version: "3.8"

services:
  npm:
    image: jc21/nginx-proxy-manager:latest
    container_name: nginx-proxy-manager
    restart: unless-stopped
    ports:
      # HTTP - must be publicly accessible for Let's Encrypt HTTP-01 challenge
      - "80:80"
      # HTTPS - forward to proxied services
      - "443:443"
      # NPM admin web interface (change or restrict to localhost for security)
      - "81:81"
    volumes:
      # NPM database and configuration
      - ./data:/data
      # Let's Encrypt certificate storage
      - ./letsencrypt:/etc/letsencrypt
    environment:
      # Disable IPv6 if not configured on your server (prevents startup errors)
      DISABLE_IPV6: "true"
```

For better reliability and performance with multiple proxy hosts, use MariaDB instead of SQLite:

```yaml
# docker-compose.yml with MariaDB
version: "3.8"

services:
  npm:
    image: jc21/nginx-proxy-manager:latest
    container_name: nginx-proxy-manager
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "127.0.0.1:81:81"  # Restrict admin to localhost
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
    environment:
      DB_MYSQL_HOST: "db"
      DB_MYSQL_PORT: 3306
      DB_MYSQL_USER: "npm"
      DB_MYSQL_PASSWORD: "strong-db-password"
      DB_MYSQL_NAME: "npm"
    depends_on:
      - db

  db:
    image: jc21/mariadb-aria:latest
    container_name: npm-db
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: "root-password"
      MYSQL_DATABASE: "npm"
      MYSQL_USER: "npm"
      MYSQL_PASSWORD: "strong-db-password"
    volumes:
      - ./mysql:/var/lib/mysql
```

```bash
# Start NPM
docker compose up -d

# Check startup logs
docker compose logs -f npm
```

## Initial Login

Visit `http://your-server-ip:81` to access the admin interface.

Default credentials:
- Email: `admin@example.com`
- Password: `changeme`

**Change these immediately** after first login. Go to Users > Edit the admin user.

## Creating Your First Proxy Host

A proxy host defines how NPM forwards traffic from a domain to an internal service.

### Example: Proxying Gitea Running on Port 3000

1. Click **Proxy Hosts** > **Add Proxy Host**
2. Fill in the **Details** tab:
   - Domain Names: `gitea.example.com`
   - Scheme: `http`
   - Forward Hostname/IP: `172.17.0.1` (Docker host IP) or the container name if on same Docker network
   - Forward Port: `3000`
   - Enable: Websockets Support (check if the application uses WebSockets)
   - Enable: Block Common Exploits

3. Click the **SSL** tab:
   - SSL Certificate: Request a new SSL Certificate
   - Force SSL: enabled
   - HTTP/2 Support: enabled
   - Enable: Let's Encrypt Agree

4. Click **Save**

NPM requests the certificate from Let's Encrypt and configures Nginx automatically. Within a minute, `https://gitea.example.com` should resolve to your Gitea instance.

## Docker Network Setup for Proxied Services

For NPM to route to other Docker containers, they need to be on the same Docker network.

```bash
# Create a shared Docker network for all proxied services
docker network create proxy-network

# Add NPM to this network
# In docker-compose.yml:
```

```yaml
# Updated docker-compose.yml with shared network
version: "3.8"

networks:
  proxy-network:
    external: true

services:
  npm:
    image: jc21/nginx-proxy-manager:latest
    container_name: nginx-proxy-manager
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "127.0.0.1:81:81"
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
    networks:
      - proxy-network
```

```bash
# Recreate NPM on the shared network
docker compose down
docker compose up -d

# Add other services to the same network in their docker-compose.yml files:
# networks:
#   proxy-network:
#     external: true
# services:
#   gitea:
#     networks:
#       - proxy-network
```

When services are on the same Docker network, use the container name as the forward hostname in NPM proxy host configuration (e.g., forward to `gitea:3000`).

## SSL Certificate Management

### Automatic Let's Encrypt Certificates

NPM handles certificate requests and renewals automatically. For the HTTP-01 challenge to work:
- Port 80 must be accessible from the internet
- Your domain must resolve to the server's IP

### Wildcard Certificates (DNS-01 Challenge)

For wildcard certs (`*.example.com`), you need DNS-01 challenge. NPM supports several DNS providers:

1. In NPM > SSL Certificates > Add SSL Certificate > Let's Encrypt
2. Enable: Use a DNS Challenge
3. Choose your DNS provider (Cloudflare, Route53, etc.)
4. Enter your DNS API credentials
5. The domain pattern `*.example.com` covers all subdomains

This is useful when you don't want to expose port 80, or when using internal/private domains.

### Uploading Custom Certificates

For certificates from a commercial CA or internal CA:

1. SSL Certificates > Add SSL Certificate > Custom
2. Upload certificate file, private key, and intermediate certificate chain
3. Reference this certificate in proxy hosts that need it

## Access Control Lists

Restrict access to specific services by IP or with basic authentication:

### IP Whitelist

1. Go to **Access Lists** > **Add Access List**
2. Name: "Internal Only"
3. In **Access** tab, add allowed IPs (e.g., your office IP range `192.168.1.0/24`)
4. Leave "Satisfy Any" disabled to require both auth and IP match if combining methods

Apply to a proxy host:
1. Edit the proxy host
2. Details tab > Access List: select "Internal Only"

### Basic Authentication

1. Access Lists > Add Access List
2. In **Authorization** tab, add username/password pairs
3. Apply to proxy host

This adds HTTP basic authentication in front of any proxied service - useful for services that have no built-in authentication.

## Advanced Nginx Configuration

For settings not exposed in the NPM UI, use the Advanced tab on proxy hosts:

```nginx
# Example: Add custom headers to proxied requests
# Paste this in the Advanced tab of a proxy host:
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Real-IP $remote_addr;

# Increase timeout for slow applications
proxy_read_timeout 600s;
proxy_connect_timeout 600s;

# Enable GZIP compression
gzip on;
gzip_types text/plain application/json application/javascript text/css;
```

## Monitoring and Logs

```bash
# View NPM logs
docker compose logs -f npm

# View Nginx access and error logs inside the container
docker compose exec npm tail -f /var/log/nginx/error.log

# Check certificate expiry dates
docker compose exec npm curl -s localhost:81/api/tokens \
  -H "Content-Type: application/json" \
  -d '{"identity":"admin@example.com","secret":"yourpassword"}'
# Then use the token to query /api/certificates
```

## Backup

```bash
# Backup NPM data (includes all proxy host configs, certificates, and database)
tar -czf npm-backup-$(date +%Y%m%d).tar.gz /opt/nginx-proxy-manager/data/ /opt/nginx-proxy-manager/letsencrypt/

# Restore from backup
cd /opt/nginx-proxy-manager
tar -xzf npm-backup-YYYYMMDD.tar.gz

# Restart NPM after restore
docker compose restart npm
```

## Updating Nginx Proxy Manager

```bash
cd /opt/nginx-proxy-manager

# Pull the latest NPM image
docker compose pull

# Recreate the container with the new image
docker compose up -d

# Check the updated version in the admin panel footer
```

## Troubleshooting

**"502 Bad Gateway" after creating proxy host:**

This usually means NPM can't reach the upstream service.

```bash
# Test connectivity from inside the NPM container
docker compose exec npm curl -v http://container-name:port/

# Verify both containers are on the same network
docker network inspect proxy-network

# Check the upstream service is actually listening
docker compose exec upstream-service ss -tlpn | grep port
```

**Let's Encrypt certificate request fails:**

```bash
# Check NPM logs for the ACME challenge error
docker compose logs npm | grep -i "letsencrypt\|acme\|challenge"

# Verify port 80 is accessible from the internet (required for HTTP-01 challenge)
curl -I http://yourdomain.com

# Ensure the domain resolves to your server's IP
dig yourdomain.com
```

**Admin interface (port 81) not accessible:**

```bash
# Check if port 81 is bound
docker compose ps
sudo ss -tlpn | grep 81

# Check for firewall rules
sudo ufw status | grep 81
```

## Summary

Nginx Proxy Manager takes the friction out of managing reverse proxies and SSL certificates for self-hosted services. The web dashboard handles certificate requests, renewals, and Nginx configuration without requiring Nginx expertise. For a home server or small team running multiple services, NPM centralizes proxy management in one place and makes adding new services as simple as filling out a form.
