# Validation Summary: How to Configure JFrog Artifactory with IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- JFrog Artifactory (OSS, version 7.71.5)
- Docker / Docker Compose (with IPv6 networking)
- Nginx (reverse proxy with IPv6 listeners)
- Maven (settings.xml repository configuration)
- ip6tables (Linux IPv6 firewall)
- IPv6 networking (RFC 3513 / RFC 4291)

## Sources Consulted
- JFrog Artifactory installation docs: https://jfrog.com/help/r/jfrog-installation-setup-documentation/install-artifactory-single-node-with-docker
- JFrog system.yaml reference: https://jfrog.com/help/r/jfrog-installation-setup-documentation/system-yaml-file-descriptions
- Docker Compose IPv6 networking: https://docs.docker.com/compose/compose-file/06-networks/#enable_ipv6
- Docker `ports` short syntax: https://docs.docker.com/compose/compose-file/05-services/#ports
- nginx `listen` directive: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- RFC 4291 (IPv6 Addressing Architecture): https://www.rfc-editor.org/rfc/rfc4291
- iptables-persistent (Debian/Ubuntu) — saves rules to `/etc/iptables/rules.v4` and `/etc/iptables/rules.v6`
- Maven settings reference: https://maven.apache.org/settings.html
- Docker registry / `docker login` reference: https://docs.docker.com/reference/cli/docker/login/

## Issues Found
1. **Invalid IPv6 subnet literal in `docker-compose.yml`.** The original subnet `"2001:db8:artifactory::/80"` is not a valid IPv6 address — IPv6 hextets must consist of hex digits (0–9, a–f), and `artifactory` contains non-hex characters (`r`, `t`, `i`, `y`). Docker Compose will reject this with a parse error. Replaced with `"2001:db8:a17f::/64"`, which is a valid documentation-range subnet (RFC 3849) and uses Docker's recommended `/64` prefix.
2. **Incorrect path for persisted ip6tables rules.** The post wrote rules to `/etc/ip6tables/rules.v6`, but the `iptables-persistent` package on Debian/Ubuntu uses the directory `/etc/iptables/` (singular `iptables`, shared between v4 and v6). Corrected the redirection target to `/etc/iptables/rules.v6` so the rules are actually loaded on boot by `netfilter-persistent`.

## Review Notes
- The Docker Compose `ports` block lists both `"8081:8081"` and `"[::]:8081:8081"` (and the same pair for 8082). Docker's userland proxy can run these side-by-side, but on hosts where `IPV6_V6ONLY=0` is set kernel-side, the IPv6 wildcard bind may collide with the IPv4 wildcard bind and produce an "address already in use" error. In practice this is fine on default Docker Desktop / Docker CE configurations, but operators should be aware.
- The `system.yaml` `router.entrypoints` block uses `internalAddress` / `externalAddress` keys. JFrog's documented schema has historically used `externalPort` / `internalPort` integers, though newer Artifactory 7.x versions accept `*Address` keys (host:port). Readers on older 7.x versions may need to translate this to the port-only form.
- The Artifactory 7.71.5 image tag is pinned and current as of the post's publication date; readers should consider tracking a newer LTS line for production.
- The `JF_SHARED_DATABASE_TYPE=derby` environment variable is appropriate for evaluation only; the inline comment correctly notes that production deployments should use an external database.
