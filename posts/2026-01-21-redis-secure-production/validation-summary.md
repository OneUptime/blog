# Validation Summary: How to Secure Redis in Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Redis Open Source
- Redis ACLs
- Redis TLS configuration
- redis-cli
- redis-py
- ioredis
- Docker Compose
- Kubernetes NetworkPolicy
- UFW and iptables
- OpenSSL

## Sources Consulted
- Redis security documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis ACL SETUSER command reference: https://redis.io/docs/latest/commands/acl-setuser/
- Redis TLS documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/
- Redis example redis.conf: https://raw.githubusercontent.com/redis/redis/unstable/redis.conf
- redis-py guide and command reference: https://redis.io/docs/latest/develop/clients/redis-py/ and https://redis.readthedocs.io/en/stable/commands.html
- redis-py SSL examples: https://redis.readthedocs.io/en/stable/examples/ssl_connection_examples.html
- ioredis TLS documentation: https://github.com/redis/ioredis
- Docker Compose networking documentation: https://docs.docker.com/compose/how-tos/networking/ and https://docs.docker.com/reference/compose-file/networks/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The default security-state section said Redis listens on all interfaces out of the box. Updated it to note that Redis listens on all interfaces only when no `bind` directive is configured, while the example `redis.conf` binds to loopback by default.
- The `CONFIG REWRITE` example was shown as a bare shell command after setting `requirepass`. Changed it to a `redis-cli` invocation authenticated with the newly configured password.
- The environment-variable example implied Redis expands `${REDIS_PASSWORD}` directly in `redis.conf`. Changed it to a template plus `envsubst` flow, since Redis configuration files do not perform shell-style environment expansion by themselves.
- ACL examples were in `bash` blocks but used unquoted `>` and `~*`, which can be interpreted by the shell. Changed them to runnable `redis-cli` commands with quoted ACL rule arguments.
- The redis-py ACL helper used `acl_setuser(username, *rules)`, which does not match the current documented redis-py method signature. Changed those calls to `execute_command('ACL', 'SETUSER', ...)` for direct Redis ACL rule syntax.
- The protected-mode comment was too narrow for current Redis behavior. Updated it to match current Redis documentation: protected mode limits access to local clients when the default user has no password.
- The Docker Compose example configured Redis with `--requirepass` but gave the app a passwordless `REDIS_URL`. Updated the URL to include the password.
- The Kubernetes NetworkPolicy included an egress rule from Redis pods back to Redis pods, which did not match the stated goal of allowing application ingress to Redis. Removed the misleading egress policy.
- The TLS certificate generation commands created a self-signed server certificate but referenced a separate `ca.crt` that was never generated. Added test CA generation and signed the Redis certificate with it.
- The redis-cli TLS verification command omitted the CA certificate. Added `--cacert`.
- The Python TLS snippet created an `ssl_context` but did not pass it to redis-py. Removed the unused context setup and kept the documented redis-py TLS parameters.
- The security audit script imported unused modules, did not use TLS when checking unauthenticated access, and did not actually check several dangerous commands in its list. Removed unused imports, added `ssl=self.use_tls` to the unauthenticated test connection, and added non-destructive checks for `FLUSHALL`, `FLUSHDB`, and `SHUTDOWN`.

## Review Notes
The guide is technically valid after the fixes. Future improvements could mention that renaming commands is discouraged in favor of ACLs for modern Redis deployments, and that production certificate generation should use an organization-managed CA rather than the testing OpenSSL commands shown.
