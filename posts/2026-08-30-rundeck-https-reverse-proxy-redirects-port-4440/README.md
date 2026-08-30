# How to Put Rundeck Behind an HTTPS Reverse Proxy Without Broken Redirects or Exposed Port 4440

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, Reverse Proxy, TLS, Security

Description: Publish Rundeck through an HTTPS reverse proxy with the correct external URL and forwarded headers while keeping its internal port 4440 private.

---

Rundeck listens on port 4440 by default. Placing NGINX, Apache, or a cloud load balancer in front of it is straightforward until login redirects point to `http://host:4440`, webhook URLs use the wrong scheme, or the browser enters a redirect loop.

The fix has two halves: the proxy must describe the original HTTPS request with trusted forwarded headers, and Rundeck must be configured with the exact public URL users actually visit.

## Use One Canonical External URL

Assume the public address is:

```text
https://rundeck.example.com
```

For a package installation, set Rundeck's public application URL in `/etc/rundeck/rundeck-config.properties`:

```properties
grails.serverURL=https://rundeck.example.com
```

Set the matching framework URL in `/etc/rundeck/framework.properties`:

```properties
framework.server.url=https://rundeck.example.com
```

For the official container image, the corresponding settings are:

```yaml
environment:
  RUNDECK_GRAILS_URL: https://rundeck.example.com
  RUNDECK_SERVER_FORWARDED: "true"
```

`RUNDECK_GRAILS_URL` controls the base URL Rundeck uses for links and redirects. Do not set it to the internal upstream address when users enter through the proxy.

## Forward the Original Request Correctly

Terminate TLS at NGINX and proxy cleartext only over a private loopback or trusted network:

```nginx
server {
    listen 443 ssl;
    server_name rundeck.example.com;

    ssl_certificate     /etc/nginx/tls/fullchain.pem;
    ssl_certificate_key /etc/nginx/tls/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4440;
        proxy_http_version 1.1;

        proxy_set_header Host              rundeck.example.com;
        proxy_set_header X-Forwarded-Host  rundeck.example.com;
        proxy_set_header X-Forwarded-Server rundeck.example.com;
        proxy_set_header X-Forwarded-Port  443;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For   $remote_addr;
        proxy_set_header Forwarded         "";
    }
}

server {
    listen 80;
    server_name rundeck.example.com;
    return 301 https://rundeck.example.com$request_uri;
}
```

Using the configured canonical hostname rather than reflecting an arbitrary client `Host` value also avoids generating redirects from an untrusted header. Because this NGINX instance is the public trust boundary, it also replaces a client-supplied `X-Forwarded-For` value and removes the standardized `Forwarded` header before the request reaches Rundeck. If another load balancer sits in front of NGINX, trust only that load balancer's addresses, recover the client address with NGINX's real-IP configuration, and build forwarding headers from those sanitized values rather than blindly preserving client-supplied headers.

For non-container package installations, enable forwarded-request support as documented for the installed Rundeck version. Rundeck supports this property in `rundeck-config.properties`:

```properties
server.useForwardHeaders=true
```

Alternatively, enable Jetty's forwarded connector for a package installation by adding this assignment to the package defaults file:

```sh
RDECK_JVM_OPTS="-Drundeck.jetty.connector.forwarded=true"
```

The package reads this assignment from `/etc/default/rundeckd` on Debian-family systems or `/etc/sysconfig/rundeckd` on RPM-family systems. Preserve any other options already present in `RDECK_JVM_OPTS` when appending the flag. Use the property or JVM approach appropriate to the deployment rather than assuming both are required. The Docker image's `RUNDECK_SERVER_FORWARDED=true` performs the equivalent container configuration.

## Keep Port 4440 Private

On a single host, bind or firewall the upstream so only the proxy can reach it. For Docker Compose, save the NGINX server configuration above as `./nginx.conf`, change its upstream to `http://rundeck:4440`, and place the certificate files under `./tls/`. The deployment does not need to publish 4440 on the host:

```yaml
services:
  rundeck:
    image: rundeck/rundeck:6.1.0
    expose:
      - "4440"
    environment:
      RUNDECK_GRAILS_URL: https://rundeck.example.com
      RUNDECK_SERVER_FORWARDED: "true"

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./tls:/etc/nginx/tls:ro
    depends_on:
      - rundeck
```

Here `expose` documents port 4440 for internal use but does not publish it on the host. Both services join Compose's default network, so NGINX can reach `http://rundeck:4440` by service name; `expose` itself is not an access-control rule. This example publishes only HTTPS. Add `"80:80"` to `ports` if the port-80 redirect server shown above should also be reachable. In a VM deployment, use loopback binding when supported or a host firewall rule that accepts 4440 only from the proxy.

The Rundeck point-release tag above is current at the time of writing and illustrates the network layout. Substitute the release you tested, and pin both the Rundeck and NGINX images by digest when the deployment requires immutable image identity.

## Handle a URL Path Deliberately

Hosting at the domain root is the least error-prone option. If the public URL must be `https://example.com/rundeck`, configure the same context path in Rundeck rather than stripping or inventing it only in NGINX. The Docker setting is:

```yaml
environment:
  RUNDECK_GRAILS_URL: https://example.com/rundeck
  RUNDECK_SERVER_CONTEXTPATH: /rundeck
  RUNDECK_SERVER_FORWARDED: "true"
```

Update the proxy location and upstream path to match the chosen layout. Test static assets, login, logout, API calls, webhook URLs, and links in notifications; a login page alone does not prove the base path is correct.

## Diagnose Redirect Problems

Use response headers to trace the first wrong hop:

```bash
curl -sS -D - -o /dev/null https://rundeck.example.com/user/login \
  | grep -Ei '^(HTTP/|location:)'
```

Do not add `curl -k` to make this check pass: that would hide certificate-chain or hostname failures that the public endpoint must fix.

Common interpretations are:

- A `Location` header containing `:4440` means the internal listener is leaking into URL generation; recheck `grails.serverURL` and forwarded host/port handling, and keep `framework.server.url` aligned with the public URL.
- A redirect from HTTPS back to HTTP usually means `X-Forwarded-Proto` is absent or forwarded-request support is disabled.
- Repeated additions or removals of `/rundeck` indicate a context-path mismatch.
- Correct URLs with connection failures indicate that the proxy cannot reach the upstream; check its network and Rundeck's bind address.

After changing configuration, restart Rundeck and the proxy, then test through the public hostname. Avoid testing only with `localhost`, because host and scheme handling are part of the configuration being verified.

## Official Documentation

- [Rundeck: Reverse Proxies](https://docs.rundeck.com/docs/administration/cluster/loadbalancer/reverse_proxies.html)
- [Rundeck Docker Configuration Reference](https://docs.rundeck.com/docs/administration/configuration/docker.html)
- [Rundeck: Configuring SSL and Forwarded Requests](https://docs.rundeck.com/docs/administration/security/ssl.html)
- [Rundeck Configuration File Reference](https://docs.rundeck.com/docs/administration/configuration/config-file-reference.html)

## Conclusion

Configure Rundeck with its canonical public HTTPS URL, forward the original host, port, scheme, and client address, and enable forwarded-request handling. Once the proxy can reach a private 4440 listener, leave 4440 unpublished, expose port 443 (and optionally port 80 only for HTTP-to-HTTPS redirects), and validate every generated redirect through the public hostname.
