# How to Store TLS Certificates as Podman Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Secret, TLS, Certificate, Security

Description: Learn how to securely store and deliver TLS certificates and private keys to Podman containers using secrets.

---

> TLS private keys must be protected from exposure. Podman secrets provide a secure delivery mechanism that avoids baking certificates into image layers or exposing them via bind mounts.

TLS certificates and private keys are essential for secure communications but require careful handling. Private keys should never be stored in container images or exposed through insecure volume mounts. Podman secrets ensure that TLS material is delivered securely and is only mounted into containers that are granted access to it.

---

## Storing Certificate and Key as Secrets

```bash
# Store the TLS certificate

podman secret create tls_cert /path/to/server.crt

# Store the TLS private key
podman secret create tls_key /path/to/server.key

# Optionally store the CA certificate
podman secret create ca_cert /path/to/ca.crt

# Verify all secrets were created
podman secret ls
```

## Using TLS Secrets with Nginx

```bash
# Create secrets from certificate files
podman secret create nginx_cert ./certs/server.crt
podman secret create nginx_key ./certs/server.key

# Run nginx with TLS secrets
podman run -d \
  --name nginx-tls \
  --secret nginx_cert,target=/etc/nginx/ssl/server.crt,mode=0444 \
  --secret nginx_key,target=/etc/nginx/ssl/server.key,mode=0400 \
  -p 443:443 \
  -v ./nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:latest
```

Example nginx configuration:

```nginx
# nginx-ssl.conf
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate     /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;

    location / {
        proxy_pass http://app:8080;
    }
}
```

## Using TLS Secrets with Apache

```bash
# Create secrets for Apache
podman secret create apache_cert ./certs/server.crt
podman secret create apache_key ./certs/server.key

# Run Apache with TLS secrets
podman run -d \
  --name apache-tls \
  --secret apache_cert,target=/etc/ssl/certs/server.crt,mode=0444 \
  --secret apache_key,target=/etc/ssl/private/server.key,mode=0400 \
  -p 443:443 \
  -v ./httpd-ssl.conf:/usr/local/apache2/conf/extra/httpd-ssl.conf:ro \
  httpd:latest \
  httpd-foreground \
    -C "LoadModule ssl_module modules/mod_ssl.so" \
    -C "Listen 443" \
    -c "Include conf/extra/httpd-ssl.conf"
```

Use an `httpd-ssl.conf` that references the mounted secret paths:

```apache
<VirtualHost *:443>
    SSLEngine on
    SSLCertificateFile "/etc/ssl/certs/server.crt"
    SSLCertificateKeyFile "/etc/ssl/private/server.key"
</VirtualHost>
```

## Full Certificate Chain

```bash
# Store the full certificate chain and key
podman secret create fullchain ./certs/fullchain.pem
podman secret create privkey ./certs/privkey.pem
podman secret create dhparam ./certs/dhparam.pem

# Use all three in an nginx container
podman run -d \
  --name secure-nginx \
  --secret fullchain,target=/etc/nginx/ssl/fullchain.pem,mode=0444 \
  --secret privkey,target=/etc/nginx/ssl/privkey.pem,mode=0400 \
  --secret dhparam,target=/etc/nginx/ssl/dhparam.pem,mode=0444 \
  -p 443:443 \
  -v ./nginx-fullchain.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:latest
```

## Setting Proper Permissions

```bash
# Certificate files: readable by the web server process
# Private keys: read-only by the owner

podman run -d \
  --name secure-server \
  --secret tls_cert,target=/etc/ssl/cert.pem,mode=0444 \
  --secret tls_key,target=/etc/ssl/key.pem,mode=0400,uid=0,gid=0 \
  --secret ca_cert,target=/etc/ssl/ca.pem,mode=0444 \
  my-server:latest

# Certificate: world-readable (0444) - contains only public data
# Private key: owner read-only (0400) - highly sensitive
```

## Rotating TLS Certificates

```bash
# When certificates are renewed, rotate the secrets and recreate the container
podman stop nginx-tls
podman rm nginx-tls

# Replace the secrets with renewed certificates
podman secret create --replace nginx_cert ./certs/renewed-server.crt
podman secret create --replace nginx_key ./certs/renewed-server.key

# Recreate the container so it receives the updated secret data
podman run -d \
  --name nginx-tls \
  --secret nginx_cert,target=/etc/nginx/ssl/server.crt,mode=0444 \
  --secret nginx_key,target=/etc/nginx/ssl/server.key,mode=0400 \
  -p 443:443 \
  -v ./nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:latest
```

## Summary

Store TLS certificates and private keys as Podman secrets to keep them out of image layers and insecure volume mounts. Use the `target` option to place certificates at the paths your web server expects, and set restrictive `mode` permissions, especially on private keys (0400). Regular rotation of TLS secrets when certificates are renewed keeps the container using current TLS material after it is recreated or rolled forward.
