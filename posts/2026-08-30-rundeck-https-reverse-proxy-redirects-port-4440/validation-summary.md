# Validation Summary: Put Rundeck Behind HTTPS Without Broken Redirects or Port 4440

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rundeck 6.1.0
- Rundeck's embedded Jetty server and forwarded-request handling
- NGINX reverse proxying
- Docker Compose networking and port publication
- HTTPS and TLS termination
- `Forwarded` and `X-Forwarded-*` HTTP headers
- Linux DEB/RPM service configuration
- `curl` and `grep`

## Sources Consulted
- [Rundeck: Reverse Proxies](https://docs.rundeck.com/docs/administration/cluster/loadbalancer/reverse_proxies.html) - verified port 4440, `grails.serverURL`, `framework.server.url`, and the documented proxy layout.
- [Rundeck Docker Configuration Reference](https://docs.rundeck.com/docs/administration/configuration/docker.html) - verified `RUNDECK_GRAILS_URL`, `RUNDECK_SERVER_FORWARDED`, and `RUNDECK_SERVER_CONTEXTPATH`.
- [Rundeck: Configuring SSL and Forwarded Requests](https://docs.rundeck.com/docs/administration/security/ssl.html#using-an-ssl-terminated-proxy) - verified `server.useForwardHeaders`, `rundeck.jetty.connector.forwarded`, `RDECK_JVM_OPTS`, and the DEB/RPM defaults-file paths.
- [Rundeck Configuration File Reference](https://docs.rundeck.com/docs/administration/configuration/config-file-reference.html) - verified the roles and required alignment of `grails.serverURL` and `framework.server.url`.
- [Rundeck 6.1.0 Docker templates and entrypoint](https://github.com/rundeck/rundeck/tree/v6.1.0/docker/official) - verified how the documented container variables populate Rundeck configuration and enable Jetty forwarding.
- [Rundeck 6.1.0 context-path functional test](https://github.com/rundeck/rundeck/blob/v6.1.0/functional-test/src/test/resources/docker/compose/oss/docker-compose-context-path.yml) - verified the `/rundeck` URL and context-path combination.
- [Rundeck 6.1.0 release](https://github.com/rundeck/rundeck/releases/tag/v6.1.0) and [official release calendar](https://docs.rundeck.com/docs/history/release-calendar.html) - verified the release date and current supported version.
- [Official `rundeck/rundeck` Docker Hub tags](https://hub.docker.com/r/rundeck/rundeck/tags) - verified that the `6.1.0` image tag exists.
- [Jetty 12 `ForwardedRequestCustomizer`](https://javadoc.jetty.org/jetty-12/org/eclipse/jetty/server/ForwardedRequestCustomizer.html) - verified that Jetty processes RFC 7239 `Forwarded` as well as `X-Forwarded-*`, gives `Forwarded` authority precedence, and selects the left-most forwarded client value.
- [RFC 7239, Forwarded HTTP Extension](https://www.rfc-editor.org/rfc/rfc7239.html#section-8.1) - checked the integrity and trust-boundary requirements for client-supplied forwarding metadata.
- [NGINX HTTP proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html) and [real-IP module](https://nginx.org/en/docs/http/ngx_http_realip_module.html) - verified proxy syntax, empty-header removal, `$proxy_add_x_forwarded_for` behavior, and trusted-upstream client-address handling.
- [Docker Compose services reference](https://docs.docker.com/reference/compose-file/services/) and [Compose networking](https://docs.docker.com/compose/how-tos/networking/) - verified `expose`, `ports`, the default network, and service-name discovery.
- [Official NGINX container documentation](https://hub.docker.com/_/nginx) - verified that custom NGINX configuration and certificate files must be mounted or built into the image.
- [curl command-line reference](https://curl.se/docs/manpage.html) - verified `-sS`, `-D -`, `-o /dev/null`, and the certificate-verification effect of `-k`.

## Issues Found
1. **Client-supplied `Forwarded` header reached Jetty** - NGINX passes ordinary request headers unless told otherwise, while Rundeck 6.1.0's Jetty forwarding customizer accepts RFC 7239 `Forwarded` and gives it precedence over the fixed `X-Forwarded-*` authority values. Added `proxy_set_header Forwarded "";` so an Internet client cannot override the trusted host, scheme, or client address.
2. **Spoofable client address chain** - `$proxy_add_x_forwarded_for` retains a client-supplied `X-Forwarded-For` prefix, and Jetty selects the left-most value. Changed the public-edge configuration to `proxy_set_header X-Forwarded-For $remote_addr;` and clarified how to handle a specifically trusted load balancer in front of NGINX.
3. **Invalid package defaults-file example** - A bare `-Drundeck.jetty.connector.forwarded=true` line is a JVM argument, not a shell assignment suitable for `/etc/default/rundeckd` or `/etc/sysconfig/rundeckd`. Replaced it with `RDECK_JVM_OPTS="-Drundeck.jetty.connector.forwarded=true"` and noted that existing JVM options must be preserved.
4. **Incomplete Docker Compose HTTPS proxy** - The Compose example published container port 443 but did not mount the NGINX server configuration or the referenced certificate files, so the stock `nginx:alpine` container would not serve the shown HTTPS proxy. Added read-only mounts for `./nginx.conf` and `./tls`, and explicitly required the container upstream `http://rundeck:4440` rather than loopback.
5. **Misleading `expose` explanation** - `expose` does not create service-to-service reachability or enforce an access-control boundary. Reworded the explanation to distinguish port documentation/non-publication from reachability supplied by Compose's default network.
6. **Port 80 inconsistency** - The NGINX configuration defined an HTTP-to-HTTPS redirect on port 80, while Compose published only 443 and the conclusion said to expose only 443. Clarified that 443 is required and port 80 is optional when the redirect should be externally reachable; port 4440 remains unpublished.
7. **Over-specific redirect diagnosis** - `framework.server.url` was presented as a direct cause of browser `Location` headers containing `:4440`. Reworded the diagnostic to check `grails.serverURL` and forwarded host/port handling while still requiring `framework.server.url` to match the public URL.
8. **Incomplete immutable-image advice** - The Compose example also uses the mutable `nginx:alpine` tag. Clarified that deployments requiring immutable image identity must digest-pin both Rundeck and NGINX.

## Review Notes
- Rundeck 6.1.0 was released on August 3, 2026, was the current supported release on the validation date, and the `rundeck/rundeck:6.1.0` manifest resolved successfully.
- The Rundeck 6.1.0 image currently listed on Docker Hub is Linux/AMD64; the post makes no multi-architecture claim.
- The canonical URL properties, Docker environment variables, context-path example, package file locations, NGINX redirect syntax, and `curl` diagnostic command are correct after the listed fixes.
- `depends_on` controls container start order but does not wait for Rundeck application readiness, so a transient startup-time 502 remains possible. The post does not claim otherwise.
- The four Rundeck documentation links and the author link resolved successfully on the validation date.
