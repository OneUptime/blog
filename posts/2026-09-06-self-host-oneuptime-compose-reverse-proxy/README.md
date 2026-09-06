# How to Self-Host OneUptime with Docker Compose Behind an Existing Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OneUptime, Self-Hosting, Docker Compose, Reverse Proxy, TLS

Description: Deploy OneUptime with Docker Compose behind an existing TLS reverse proxy while preserving client addresses and safe network boundaries.

---

OneUptime includes its own ingress container, but many self-hosted environments already terminate TLS at NGINX, HAProxy, Caddy, or a cloud load balancer. The clean design is to let that existing proxy own the public certificate and forward HTTP to OneUptime's ingress service.

This guide targets OneUptime 12.0.33. It assumes the proxy and Docker host are already secured and that the public name resolves to the proxy.

## Prepare the OneUptime configuration

Check out the release branch, copy the example environment file, and replace every placeholder secret before starting the stack:

```bash
git clone https://github.com/OneUptime/oneuptime.git
cd oneuptime
git checkout release
cp config.example.env config.env
```

At minimum, set the external URL and disable OneUptime-managed certificates:

```dotenv
HOST=oneuptime.example.com
HTTP_PROTOCOL=https
PROVISION_SSL=false
ONEUPTIME_HTTP_PORT=8080
STATUS_PAGE_HTTPS_PORT=8443
TRUSTED_PROXY_HOPS=2
```

`HTTP_PROTOCOL=https` describes the URL seen by users. Traffic between the existing reverse proxy and OneUptime can remain HTTP on a protected host or private network. `PROVISION_SSL=false` prevents competing certificate automation for the primary host. The alternate published ports avoid competing with a proxy already listening on 80 and 443. If you do not use OneUptime-managed custom-domain TLS, keep port 8443 blocked rather than publishing it through the firewall.

The stock configuration uses `TRUSTED_PROXY_HOPS=1` for OneUptime's internal gateway. An additional external reverse proxy normally makes the value `2`. Count the actual trusted hops in your deployment. A value that is too small records a proxy address as the client; one that is too large can trust a client-supplied forwarding entry.

Also replace `ONEUPTIME_SECRET`, database passwords, encryption secrets, probe keys, and every other value marked for randomization in `config.example.env`. Do not commit `config.env`.

## Start and verify the stack

Render the effective Compose model before applying it:

```bash
docker compose --env-file config.env config >/dev/null
docker compose --env-file config.env up --remove-orphans -d
docker compose --env-file config.env ps
```

OneUptime's published HTTP port reaches its ingress container. Restrict that port with the host firewall or private network policy so clients cannot bypass the external proxy. When the proxy runs on the same host, forwarding to `127.0.0.1:8080` is suitable only if the Docker port is actually bound or firewalled accordingly. Do not assume changing a firewall and changing a Docker bind address are the same operation.

## Configure the external proxy

The following NGINX server is a practical baseline:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl http2;
    server_name oneuptime.example.com;

    ssl_certificate     /etc/letsencrypt/live/oneuptime.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/oneuptime.example.com/privkey.pem;

    client_max_body_size 100m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }
}
```

The larger body limit is useful if this hostname also accepts telemetry. Choose a limit that matches your ingestion design rather than copying it blindly. Apply equivalent forwarded-host, protocol, and client-address settings in another proxy product.

## Test both routing and trust

Verify the public path, redirects, and an authenticated browser session:

```bash
curl -I https://oneuptime.example.com
curl -sS -o /dev/null -w '%{http_code}\n' https://oneuptime.example.com
```

Then check the OneUptime and external-proxy logs while signing in. Confirm that generated links use HTTPS, WebSocket connections remain open, and application audit data sees the expected client address. A redirect loop usually means `HTTP_PROTOCOL`, `Host`, or `X-Forwarded-Proto` disagrees with the public URL.

## Production checklist

- Permit the published OneUptime port only from the reverse proxy.
- Back up PostgreSQL and ClickHouse before upgrades.
- Set explicit log rotation for Docker containers.
- Monitor disk space, certificate expiry, and the proxy-to-ingress request path.
- Keep `TRUSTED_PROXY_HOPS` equal to the known proxy chain.
- Upgrade with OneUptime's documented release procedure, not an unpinned image pull.

## Conclusion

An existing reverse proxy should be the single public TLS boundary. OneUptime still uses its bundled ingress internally, while the external proxy supplies the public host, forwarding headers, request limits, and certificate. The two details most often missed are restricting direct access to the published port and counting trusted proxy hops correctly.

## Official Documentation

- [OneUptime Docker Compose installation](https://oneuptime.com/docs/en/installation/docker-compose)
- [OneUptime 12.0.33 environment configuration](https://github.com/OneUptime/oneuptime/blob/12.0.33/config.example.env)
- [Docker Compose documentation](https://docs.docker.com/compose/)
- [NGINX reverse proxy configuration](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
