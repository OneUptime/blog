# Portainer Behind Nginx, Traefik, or Cloudflare: Fixing Login, WebSocket, and HTTPS Problems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Nginx, Traefik, Cloudflare, Reverse Proxy, WebSockets, HTTPS, Troubleshooting

Description: Configure and troubleshoot Portainer behind Nginx, Traefik, or Cloudflare by preserving its public origin, WebSocket upgrades, TLS chain, paths, ports, and timeouts.

---

A Portainer reverse proxy must carry more than a static web page. The same public origin serves the UI, API calls, and upgraded connections used by interactive features such as container consoles. A configuration can therefore render the login screen while authentication fails, or allow normal navigation while consoles disconnect.

The reliable approach is to trace one request through every hop:

```text
browser -> Cloudflare (optional) -> Nginx or Traefik -> Portainer
```

At every boundary, verify the hostname, scheme, path, upstream protocol, WebSocket behavior, certificate trust, and timeout.

## Start with a Clean Routing Model

Prefer a dedicated hostname such as:

```text
https://portainer.example.com/
```

over a subpath such as:

```text
https://example.com/portainer/
```

A hostname avoids path rewriting and is easier to compare with Portainer's official Nginx and Traefik examples. If a subpath is a firm requirement, configure Portainer's `--base-url` and make the proxy strip exactly that prefix.

Decide where TLS terminates:

- **At the reverse proxy:** the client uses HTTPS, and the proxy can use HTTP port `9000` to Portainer only across a private network.
- **At both proxy and Portainer:** the proxy connects to Portainer HTTPS port `9443` and must validate or deliberately trust the upstream certificate.

Do not send plaintext HTTP to `9443`, and do not send HTTPS to an HTTP listener. Portainer's “Client sent an HTTP request to an HTTPS server” error is a protocol/port mismatch, not an authentication failure.

## A Working Nginx Configuration

The following server block terminates public TLS and proxies to Portainer's HTTP listener on an internal network:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

upstream portainer_backend {
    server portainer:9000;
    keepalive 16;
}

server {
    listen 80;
    server_name portainer.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name portainer.example.com;

    ssl_certificate     /etc/nginx/tls/fullchain.pem;
    ssl_certificate_key /etc/nginx/tls/privkey.pem;

    location / {
        proxy_pass http://portainer_backend;
        proxy_http_version 1.1;

        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-Host  $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP         $remote_addr;

        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

The `Host` and forwarded scheme preserve the public origin. HTTP/1.1 plus the `Upgrade` and `Connection` headers allows WebSocket handshakes. The longer read timeout prevents an otherwise healthy console from being closed by Nginx during a long session; Portainer's troubleshooting documentation specifically recommends increasing `proxy_read_timeout` when proxied consoles close.

Keep the Portainer backend private. In Compose, Nginx and Portainer can share an internal network without publishing Portainer's UI ports directly on every host interface:

```yaml
services:
  proxy:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./portainer.conf:/etc/nginx/conf.d/default.conf:ro
      - ./tls:/etc/nginx/tls:ro
    networks:
      - frontend

  portainer:
    image: portainer/portainer-ce:lts
    command:
      - --trusted-origins=portainer.example.com
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    networks:
      - frontend

networks:
  frontend:

volumes:
  portainer_data:
```

Use the current installation recipe and image stream for your edition. The excerpt only illustrates proxy connectivity and the public origin.

## Fix “Origin Invalid” and Login Failures

Portainer provides `--trusted-origins` and the `TRUSTED_ORIGINS` environment variable for deployments behind a reverse proxy that receive **Origin invalid** errors. The accepted value is release-specific. The `lts` image stream used in this article is Portainer 2.39 LTS at the time of writing; it expects a bare hostname and rejects a value containing a scheme:

```text
portainer.example.com
```

Portainer 2.41 and later require a full origin, including the scheme and optional port, but no path or trailing slash:

```text
https://portainer.example.com
```

Follow the syntax documented for the installed release. For multiple intentional entry points, use Portainer's comma-separated form rather than accepting arbitrary origins.

Also verify:

- Nginx or Traefik forwards the original `Host`.
- `X-Forwarded-Proto` says `https` for the public HTTPS request.
- The browser is not opening Portainer by an IP address or alternate hostname absent from the trusted list.
- Cloudflare and the origin proxy agree on HTTPS behavior.
- A reverse-proxy authentication layer is not intercepting `/api/auth` differently from `/`.

After a Portainer update, stale browser authentication state can also produce failed logins. Portainer's troubleshooting guidance recommends clearing browser cache or testing in a private window when old session data conflicts with server-side authentication changes. Do this after the proxy request has been verified; clearing cache will not repair a bad upstream route.

## Put Portainer on a Subpath Correctly

Portainer's `--base-url` tells it that users access it below a prefix. The documentation also states that the reverse proxy must strip that prefix before forwarding.

Start Portainer with:

```text
--base-url=/portainer
```

Then use consistent Nginx locations:

```nginx
location = /portainer {
    return 301 /portainer/;
}

location /portainer/ {
    proxy_pass http://portainer_backend/;
    proxy_http_version 1.1;

    proxy_set_header Host              $host;
    proxy_set_header X-Forwarded-Host  $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;

    proxy_set_header Upgrade    $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_read_timeout 3600s;
}
```

The trailing slash in `proxy_pass http://portainer_backend/;` is significant here: it replaces the matched `/portainer/` prefix with `/` upstream. Symptoms of inconsistent prefix handling include a blank UI, assets returning 404, requests to `/api` instead of `/portainer/api`, and redirects that repeatedly add or remove the prefix.

Use either a hostname or a carefully tested subpath throughout bookmarks, OAuth redirect URLs, API clients, and proxy rules. Mixing both creates two public origins and two path models.

## A Minimal Traefik Route

Traefik handles WebSocket upgrades for normal HTTP routers, so a Portainer hostname generally needs a router, TLS configuration, and an explicit backend port:

```yaml
services:
  portainer:
    image: portainer/portainer-ce:lts
    command:
      - --trusted-origins=portainer.example.com
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    networks:
      - proxy
    labels:
      - traefik.enable=true
      - traefik.http.routers.portainer.rule=Host(`portainer.example.com`)
      - traefik.http.routers.portainer.entrypoints=websecure
      - traefik.http.routers.portainer.tls=true
      - traefik.http.routers.portainer.service=portainer
      - traefik.http.services.portainer.loadbalancer.server.port=9000

networks:
  proxy:
    external: true

volumes:
  portainer_data:
```

Attach Traefik to the same `proxy` network. If the container belongs to multiple networks and Traefik selects the wrong one, specify the intended network using the Traefik Docker provider's network label for your deployment.

Common Traefik mistakes are:

- omitting `loadbalancer.server.port=9000`, especially when the image exposes more than one port;
- putting labels in the wrong location for Docker Standalone versus Swarm;
- routing the hostname to Portainer's Edge tunnel port instead of the UI/API port;
- attaching the router and service to different networks; and
- terminating TLS at Traefik while advertising the wrong public scheme to Portainer.

Portainer's official Traefik guide includes separate examples for Docker Standalone and Swarm. Match the example to the actual orchestrator rather than translating label placement by intuition.

## Add Cloudflare Without Creating a Second TLS Problem

When the DNS record is proxied through Cloudflare, use this model:

```text
browser HTTPS :443
    -> Cloudflare HTTPS
    -> origin reverse proxy HTTPS :443
    -> Portainer HTTP :9000 on a private network
```

Cloudflare recommends **Full (strict)** when the origin presents an unexpired certificate issued by a public CA or Cloudflare Origin CA and matching the hostname. This encrypts both legs and verifies the origin certificate.

Avoid Flexible mode for this design. If the origin redirects HTTP to HTTPS while Cloudflare uses HTTP to the origin, the two layers can create a redirect loop. In Full (strict), Cloudflare error `526` points to origin certificate validation; fix the hostname, chain, expiry, or origin trust rather than weakening every request permanently.

### Port 9443 Is Not a Standard Cloudflare Proxy Port

Cloudflare's supported proxied HTTPS ports include `443` and `8443`, but not `9443`. Therefore, this public URL is not a sound orange-cloud design:

```text
https://portainer.example.com:9443/
```

Expose the origin reverse proxy on `443` and let it connect privately to Portainer `9000` or correctly configured `9443`. Alternatively, use a Cloudflare product designed for the required transport rather than assuming every TCP port is covered by the normal HTTP proxy.

### Cloudflare Supports WebSockets, but the Origin Still Must

Cloudflare documents proxied WebSocket support without additional per-application configuration when WebSockets are enabled. The initial HTTP upgrade still passes through the origin proxy, so the Nginx or Traefik configuration must preserve it. Cloudflare can also close idle or long-lived connections under its connection behavior; Portainer and proxy timeouts should be tested with a real console session.

Do not cache the Portainer administrative hostname with broad “cache everything” rules. Authentication and API responses are dynamic, and a debugging test should bypass custom caching, Workers, redirects, and WAF rules until the base route works.

## Keep UI/API and Agent Traffic Distinct

Portainer's documented ports have different jobs:

- `9443`: Portainer UI and API over HTTPS;
- `9000`: legacy/plain HTTP UI and API when enabled, commonly used only on a private proxy network;
- `8000`: optional tunnel server used by Edge Agents; and
- `9001`: Portainer Server communication to a standard Agent.

Publishing the UI through a reverse proxy does not automatically proxy every agent transport. In particular, Cloudflare's normal HTTP proxy does not list TCP port `8000` among its standard proxied HTTP/HTTPS ports. If Edge Agents are in use, follow Portainer's Edge Agent architecture and reverse-proxy guidance and test the tunnel independently from browser login.

Do not expose `9001` publicly merely to make the UI work. It belongs on the network path between Portainer Server and the standard Agent.

## Diagnose by Symptom

### UI Loads, but Login Returns 403 or “Origin Invalid”

Check the configured hostname or origin in `--trusted-origins`, forwarded `Host`, forwarded scheme, and Portainer server logs. Determine whether the 403 body comes from Portainer, Cloudflare Access/WAF, or the origin proxy.

### Browser Redirects Forever

Inspect each `Location` response:

```bash
curl --silent --show-error --head \
  https://portainer.example.com/
```

Make one layer responsible for HTTP-to-HTTPS redirection. With Cloudflare, use an end-to-end TLS mode compatible with the origin rather than making Cloudflare use HTTP against an origin that always redirects to HTTPS.

### Nginx Returns 502 or Traefik Returns Bad Gateway

Test from a temporary container attached to the proxy's Docker network. The upstream name must resolve, the containers must share a network, and the selected upstream scheme and port must agree. Replace `proxy` with the actual Docker network name when necessary:

```bash
docker run --rm \
  --network proxy \
  curlimages/curl:latest \
  --fail --show-error http://portainer:9000/api/system/status
```

If Portainer's HTTP listener is disabled, use `https://portainer:9443` and configure certificate verification correctly rather than switching schemes without updating trust.

### Console Opens, Then Closes

Confirm that the browser's network tools show a successful WebSocket upgrade (`101 Switching Protocols`). Check `proxy_http_version 1.1`, `Upgrade`, `Connection`, `proxy_read_timeout`, upstream idle timeouts, and Cloudflare connection behavior.

### UI Works but API Automation Gets HTML

The API client may be reaching a proxy login page, a path redirect, or the UI fallback rather than `/api`. Print status, content type, and redirect target:

```bash
curl --silent --show-error \
  --dump-header - \
  --output /dev/null \
  https://portainer.example.com/api/system/status
```

Use the final HTTPS URL directly and ensure any identity-aware proxy has an intentional machine-authentication policy for API clients.

### Cloudflare Shows 525 or 526

These errors concern the Cloudflare-to-origin TLS connection. Test the origin certificate and SNI directly, verify that the origin listens on the expected supported port, and install a valid public or Cloudflare Origin CA certificate for Full (strict).

## A Layer-by-Layer Test Order

1. From the reverse-proxy network, call Portainer directly on the configured upstream scheme and port.
2. Call the origin proxy by its local or origin address with the intended `Host` and TLS SNI.
3. Call the public hostname without custom Cloudflare cache, Worker, Access, or WAF behavior.
4. Test login in a private browser window and inspect `/api/auth`.
5. Open a container console and verify the WebSocket upgrade and session duration.
6. Test an authenticated API request using the exact public base URL.
7. Test standard Agent and Edge Agent connectivity separately.

Change one layer at a time. This turns “Portainer behind Cloudflare is broken” into a specific failing hop with a specific protocol.

## Official Documentation

- [Portainer: Using Portainer with reverse proxies](https://docs.portainer.io/advanced/reverse-proxy)
- [Portainer: Deploy behind Nginx](https://docs.portainer.io/advanced/reverse-proxy/nginx)
- [Portainer: Deploy behind Traefik](https://docs.portainer.io/advanced/reverse-proxy/traefik)
- [Portainer: CLI options for base URL and trusted origins](https://docs.portainer.io/advanced/cli)
- [Portainer 2.41 release notes: trusted-origin syntax change](https://github.com/portainer/portainer/releases/tag/2.41.0)
- [Portainer: Console closes behind a reverse proxy](https://docs.portainer.io/faqs/troubleshooting/logs-errors-and-debugging/why-is-my-console-closing-after-a-certain-time)
- [Portainer: Requirements and network ports](https://docs.portainer.io/start/requirements-and-prerequisites)
- [Portainer: Edge Agent architecture](https://docs.portainer.io/advanced/edge-agent)
- [Cloudflare: WebSocket support](https://developers.cloudflare.com/network/websockets/)
- [Cloudflare: Supported network ports](https://developers.cloudflare.com/fundamentals/reference/network-ports/)
- [Cloudflare: Full (strict) SSL/TLS mode](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)
- [Cloudflare: Error 526](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-526/)
