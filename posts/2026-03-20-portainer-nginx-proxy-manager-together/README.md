# Running Portainer and Nginx Proxy Manager Together

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Nginx Proxy Manager, Docker, Reverse Proxy, Self-Hosted

Description: Learn how to run Portainer CE and Nginx Proxy Manager together using Docker Compose to manage containers and handle reverse proxy with SSL termination.

## Why Use Them Together?

- **Portainer** - Web-based Docker management UI
- **Nginx Proxy Manager (NPM)** - Easy reverse proxy with Let's Encrypt SSL support

Together they provide a complete self-hosted stack: manage your containers with Portainer, and expose them securely to the internet via NPM with automatic HTTPS.

## Docker Compose Setup

Create a shared Docker network and compose file:

```yaml
networks:
  proxy-network:
    name: proxy-network
    driver: bridge

volumes:
  portainer_data:
  npm_data:
  npm_letsencrypt:
  npm_db:

services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    networks:
      - proxy-network

  nginx-proxy-manager:
    image: jc21/nginx-proxy-manager:latest
    container_name: nginx-proxy-manager
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "81:81"   # NPM admin UI
    environment:
      DB_MYSQL_HOST: "npm-db"
      DB_MYSQL_PORT: 3306
      DB_MYSQL_USER: "npm"
      DB_MYSQL_PASSWORD: "your-npm-password"
      DB_MYSQL_NAME: "npm"
    volumes:
      - npm_data:/data
      - npm_letsencrypt:/etc/letsencrypt
    depends_on:
      - npm-db
    networks:
      - proxy-network

  npm-db:
    image: mariadb:10.11
    container_name: npm-db
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: your-root-password
      MYSQL_DATABASE: npm
      MYSQL_USER: npm
      MYSQL_PASSWORD: your-npm-password
    volumes:
      - npm_db:/var/lib/mysql
    networks:
      - proxy-network
```

## Deploying with Portainer

1. Open Portainer → **Stacks → Add Stack**
2. Paste the compose YAML above
3. Click **Deploy the stack**

## Configuring Nginx Proxy Manager

1. Access NPM admin at `http://<server-ip>:81`
2. Default credentials: `admin@example.com` / `changeme` - change immediately
3. Add a **Proxy Host**:
   - Domain: `portainer.example.com`
   - Scheme: `http`
   - Forward hostname: `portainer`
   - Forward port: `9000`
   - Enable **SSL** → Request Let's Encrypt certificate

## Accessing Portainer via NPM

Once the proxy host is configured, Portainer is accessible at:

```text
https://portainer.example.com
```

NPM handles TLS termination and renewal automatically.

## Proxying Other Services

Add more proxy hosts in NPM for other services running in your Docker environment. Since all services are on `proxy-network`, NPM can reach them by service name.

```text
my-app.example.com → http://my-app:3000
grafana.example.com → http://grafana:3000
```

## Security Considerations

1. **Do not publish Portainer's UI ports directly** - let NPM handle external HTTPS
2. **Use firewall rules** to restrict access to the NPM admin UI on port 81
3. **Use a strong Portainer admin password**
4. **Set NPM to HTTPS only** and enable HSTS on production proxy hosts

## Troubleshooting

**NPM cannot reach Portainer:** Ensure both are on the same Docker network:
```bash
docker network inspect proxy-network
```

**Let's Encrypt fails:** Ensure port 80 is open and your domain points to the server's public IP.

**Portainer console closes unexpectedly behind NPM:** Add `proxy_read_timeout 3600;` in the proxy host's Advanced field.

## Conclusion

Portainer and Nginx Proxy Manager are a powerful combination for self-hosted infrastructure. Portainer handles Docker management while NPM provides a user-friendly way to configure reverse proxies and SSL certificates - all manageable through web UIs without editing config files.
