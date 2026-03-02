# How to Set Up Traefik Dashboard on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Traefik, Dashboard, Reverse Proxy, Monitoring

Description: Configure the Traefik dashboard on Ubuntu with proper authentication, HTTPS access, and security hardening to safely expose routing and service status information.

---

The Traefik dashboard is a built-in web UI that shows the current routing configuration, middleware, services, and provider status in real time. It is invaluable for debugging routing issues and understanding how traffic flows through Traefik. The challenge is exposing it safely - the dashboard exposes information about your infrastructure, so it should never be accessible without authentication.

This guide covers enabling the Traefik dashboard, securing it with basic authentication and HTTPS, and optionally restricting it to specific IP addresses.

## Enabling the Dashboard

The dashboard is enabled through the `api` section of the static configuration. There are two modes:

- **Insecure mode:** Dashboard accessible on port 8080 without authentication - only for local development
- **Secure mode:** Dashboard served through Traefik's router with authentication - appropriate for any network-accessible deployment

### Insecure Mode (Local Development Only)

```bash
sudo nano /etc/traefik/traefik.yml
```

```yaml
api:
  dashboard: true
  insecure: true    # Exposes dashboard on :8080 - NOT for production

entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"
```

With this setting, the dashboard is at `http://localhost:8080/dashboard/`. The trailing slash is required.

### Secure Mode (Recommended)

For production, route the dashboard through a proper Traefik router with authentication:

```yaml
# traefik.yml - static config
api:
  dashboard: true
  # insecure: false is the default

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https

  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@example.com
      storage: /var/lib/traefik/acme.json
      tlsChallenge: {}

providers:
  file:
    directory: /etc/traefik/conf.d
    watch: true
```

## Creating Basic Auth Credentials

Generate a bcrypt hashed password for dashboard access:

```bash
# Install apache2-utils for htpasswd
sudo apt install apache2-utils -y

# Generate a hashed password - replace 'yoursecretpassword'
htpasswd -nB admin
# Enter the password when prompted
# Output: admin:$2y$12$abc123...

# The $$ escaping is needed in Traefik YAML files
# Double each $ sign for the configuration file
```

The output will look like:
```
admin:$2y$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

In YAML files, every `$` must be doubled to `$$` to prevent Traefik from treating them as variable references:

```bash
# Get the escaped version for YAML
htpasswd -nB admin | sed 's/\$/\$\$/g'
```

## Dynamic Configuration for the Dashboard Router

Create the dashboard route in the conf.d directory:

```bash
sudo nano /etc/traefik/conf.d/dashboard.yml
```

```yaml
http:
  routers:
    traefik-dashboard:
      # Match the domain you want to use for the dashboard
      rule: "Host(`traefik.example.com`) && (PathPrefix(`/api`) || PathPrefix(`/dashboard`))"
      entryPoints:
        - websecure
      service: api@internal    # Special internal service for the dashboard
      tls:
        certResolver: letsencrypt
      middlewares:
        - dashboard-auth
        - dashboard-ratelimit

  middlewares:
    # Basic authentication
    dashboard-auth:
      basicAuth:
        realm: "Traefik Dashboard"
        users:
          # Replace with your generated hash - note the doubled $$ signs
          - "admin:$$2y$$12$$examplehashxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

    # Rate limiting to slow brute force attempts
    dashboard-ratelimit:
      rateLimit:
        average: 10
        burst: 20
```

Apply the configuration:

```bash
# Validate
traefik --configFile=/etc/traefik/traefik.yml --dry-run

# Reload Traefik
sudo systemctl reload traefik

# Check logs
sudo journalctl -u traefik -n 50
```

## Restricting Dashboard Access by IP Address

For additional security, restrict dashboard access to specific IP ranges:

```yaml
# /etc/traefik/conf.d/dashboard.yml

http:
  routers:
    traefik-dashboard:
      rule: "Host(`traefik.example.com`) && (PathPrefix(`/api`) || PathPrefix(`/dashboard`))"
      entryPoints:
        - websecure
      service: api@internal
      tls:
        certResolver: letsencrypt
      middlewares:
        - dashboard-ip-allowlist
        - dashboard-auth

  middlewares:
    # Allow only specific IPs (office + VPN)
    dashboard-ip-allowlist:
      ipAllowList:
        sourceRange:
          - "10.0.0.0/8"         # Internal network
          - "192.168.0.0/16"     # Local network
          - "203.0.113.0/24"     # Office public IP range

    dashboard-auth:
      basicAuth:
        users:
          - "admin:$$2y$$12$$examplehash..."
```

## Using Digest Authentication

For stronger authentication than Basic, use digest auth which does not send the password in base64 encoding:

```bash
# Install the htdigest utility
sudo apt install apache2-utils -y

# Generate a digest password
htdigest -c /etc/traefik/htdigest "Traefik Dashboard" admin
# Enter password when prompted
```

```yaml
middlewares:
  dashboard-digestauth:
    digestAuth:
      users:
        # Paste content from htdigest file
        - "admin:Traefik Dashboard:abc123digesthash"
      realm: "Traefik Dashboard"
      removeHeader: true
```

## Forwarding Auth to an External Auth Server

For integration with OAuth or SSO, use the `forwardAuth` middleware:

```yaml
middlewares:
  oauth-auth:
    forwardAuth:
      address: "http://localhost:4181"    # oauth2-proxy or similar
      trustForwardHeader: true
      authResponseHeaders:
        - "X-Auth-User"
        - "X-Auth-Email"
```

## Accessing the Dashboard

With the secure configuration in place, navigate to:

```
https://traefik.example.com/dashboard/
```

The dashboard shows several sections:

- **Overview:** Summary of routers, services, and middleware counts
- **HTTP Routers:** All defined HTTP routers with their rules, entry points, and status
- **HTTP Services:** Backend services with their health status
- **HTTP Middlewares:** All active middleware definitions
- **Providers:** Status of configuration providers (file, Docker, etc.)

## Monitoring Dashboard via API

Traefik's API provides JSON endpoints for integration with monitoring tools:

```bash
# Get list of routers
curl -u admin:yourpassword https://traefik.example.com/api/http/routers | python3 -m json.tool

# Get list of services
curl -u admin:yourpassword https://traefik.example.com/api/http/services | python3 -m json.tool

# Get health and version info
curl -u admin:yourpassword https://traefik.example.com/api/version

# Get raw configuration
curl -u admin:yourpassword https://traefik.example.com/api/rawdata | python3 -m json.tool
```

## Prometheus Metrics Integration

Traefik can expose Prometheus metrics alongside the dashboard:

```yaml
# traefik.yml - add metrics configuration
metrics:
  prometheus:
    buckets:
      - 0.1
      - 0.3
      - 1.2
      - 5.0
    addEntryPointsLabels: true
    addServicesLabels: true
    entryPoint: metrics

entryPoints:
  metrics:
    address: ":8082"    # Prometheus scrape endpoint
```

Then in dynamic config, secure the metrics endpoint:

```yaml
http:
  routers:
    metrics:
      rule: "Host(`traefik.example.com`) && PathPrefix(`/metrics`)"
      entryPoints:
        - metrics
      service: prometheus@internal
      middlewares:
        - metrics-ip-allowlist

  middlewares:
    metrics-ip-allowlist:
      ipAllowList:
        sourceRange:
          - "10.0.0.0/8"    # Prometheus server IP
```

## Troubleshooting Dashboard Issues

**Dashboard shows 404:** The path must end with a trailing slash: `/dashboard/` not `/dashboard`. The router rule must include both `/api` and `/dashboard` path prefixes.

**Authentication not working:** Double-check that `$` characters in password hashes are doubled (`$$`) in YAML. Single `$` signs are interpreted as variable references and cause parsing failures.

**Dashboard not updating:** The dashboard polls the API periodically. If routes appear stale, check that the file provider has `watch: true` in the static configuration.

**Certificate errors on dashboard:** Confirm that DNS resolves the dashboard domain to the server IP and that ports 80 and 443 are publicly accessible for the ACME challenge.

The Traefik dashboard is one of the more useful built-in tools for understanding a running Traefik instance. Keeping it secured but accessible to administrators makes debugging routing issues significantly faster.
