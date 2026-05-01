# How to Deploy Nginx Proxy Manager as a Portainer Stack

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Nginx Proxy Manager, Docker, Reverse Proxy, HTTPS, SSL

Description: Learn how to deploy Nginx Proxy Manager using Portainer stacks to manage SSL certificates and reverse proxy rules through a web UI.

---

Nginx Proxy Manager (NPM) provides a web GUI for managing nginx reverse proxy configurations and Let's Encrypt SSL certificates. It's a popular self-hosted alternative to Traefik for simpler proxy management.

---

## Deploy Nginx Proxy Manager via Portainer Stack

In Portainer: **Stacks** → **Add stack** → paste:

```yaml
version: "3.8"

services:
  nginx-proxy-manager:
    image: jc21/nginx-proxy-manager:latest
    container_name: nginx-proxy-manager
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "81:81"   # Admin UI
    environment:
      DB_MYSQL_HOST: npm-db
      DB_MYSQL_PORT: 3306
      DB_MYSQL_USER: npm
      DB_MYSQL_PASSWORD: ${NPM_DB_PASSWORD}
      DB_MYSQL_NAME: npm
    volumes:
      - npm-data:/data
      - npm-certs:/etc/letsencrypt
    depends_on:
      - npm-db

  npm-db:
    image: jc21/mariadb-aria:latest
    container_name: npm-db
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: npm
      MYSQL_USER: npm
      MYSQL_PASSWORD: ${NPM_DB_PASSWORD}
    volumes:
      - npm-db:/var/lib/mysql

volumes:
  npm-data:
  npm-certs:
  npm-db:
```

Set the password environment variables in Portainer.

---

## Initial Login

1. Open `http://<host>:81`
2. On first run, create your admin account in the setup screen.
3. If you set `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`, Nginx Proxy Manager skips the setup screen and uses those credentials.

---

## Add a Proxy Host

1. Click **Hosts** → **Proxy Hosts** → **Add Proxy Host**.
2. Enter the **Domain Names** (e.g., `app.example.com`).
3. Set **Scheme** to `http`, **Forward Hostname/IP** to your container name (e.g., `myapp`), **Forward Port** to `8080`.
4. Enable **SSL** tab → select **Request a new Certificate** → toggle **Force SSL**.

---

## Add a Custom Certificate

1. Go to **Certificates** → **Add Certificate** → **Custom Certificate**.
2. Enter a name, then upload your certificate, private key, and intermediate certificate if required.
3. Nginx Proxy Manager stores the uploaded certificate so you can assign it to proxy hosts.

---

## Summary

Deploy Nginx Proxy Manager as a Portainer stack with a MySQL/MariaDB backend. Access the admin UI on port 81. Add proxy hosts by pointing to other containers on your Docker network by container name. Use the built-in Let's Encrypt integration to provision and auto-renew HTTPS certificates for each proxied domain.
