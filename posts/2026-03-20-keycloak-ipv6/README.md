# How to Configure Keycloak with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Keycloak, IPv6, OAuth2, SSO, Authentication

Description: Configure Keycloak identity server to listen on IPv6, connect to PostgreSQL over IPv6, and handle IPv6 client addresses in tokens.

## Overview

Configure Keycloak for dual-stack or IPv6-preferred networking, connect to PostgreSQL over IPv6, and preserve IPv6 client addresses through trusted proxy headers.

## Key Considerations for IPv6

When working with IPv6 addresses in Keycloak deployments:
- Keycloak is accessible over IPv4 and IPv6 by default; use JVM network properties only if you need to prefer one address family
- IPv6 literals in HTTPS URLs and PostgreSQL JDBC URLs must be enclosed in square brackets
- If Keycloak is behind a reverse proxy, set `proxy-headers` and limit `proxy-trusted-addresses` to the IPv6 addresses or CIDRs of proxies you trust
- Keycloak publishes OIDC metadata from the configured `hostname`, so use a stable DNS name instead of a raw IP literal when possible

## Configuration Example

### Keycloak server settings

```bash
# Optional: prefer IPv6 addresses when the JVM resolves hostnames
export JAVA_OPTS_APPEND="-Djava.net.preferIPv4Stack=false -Djava.net.preferIPv6Addresses=true"

bin/kc.sh start \
  --hostname=https://sso.example.com \
  --http-enabled=true \
  --proxy-headers=xforwarded \
  --proxy-trusted-addresses=2001:db8:100::/64 \
  --db=postgres \
  --db-url=jdbc:postgresql://[2001:db8:200::25]:5432/keycloak \
  --db-username=keycloak \
  --db-password=change_me
```

### What this config does

```text
- `--hostname` sets the public base URL Keycloak publishes in its OIDC metadata
- `--http-enabled=true` is required only when TLS is terminated at the reverse proxy
- `--proxy-headers=xforwarded` tells Keycloak to parse `X-Forwarded-*` headers from the proxy
- `--proxy-trusted-addresses` limits trusted proxy headers to the listed IPv6 address or CIDR range
- `--db-url` uses a PostgreSQL JDBC URL with the IPv6 literal enclosed in square brackets
```

## Testing

```bash
# Fetch the OpenID Connect discovery document over IPv6
curl -6 https://sso.example.com/realms/master/.well-known/openid-configuration

# Fetch the realm public keys over IPv6
curl -6 https://sso.example.com/realms/master/protocol/openid-connect/certs
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor Keycloak's OpenID Connect discovery document or JWKs endpoints over IPv6 and track response times. Set up alerts for elevated error rates or latency spikes on your public `realms` endpoints.

## Conclusion

How to Configure Keycloak with IPv6 requires using a stable public hostname, enabling the correct proxy header handling, enclosing IPv6 literals in PostgreSQL connection URLs, and validating the published OIDC endpoints over IPv6.
