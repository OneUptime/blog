# Validation Summary: How to Fix 'Redis authentication failed' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Redis Open Source authentication
- Redis ACLs
- redis-cli
- redis-py
- ioredis
- Jedis
- Docker Compose
- Kubernetes
- AWS ElastiCache
- TLS/SSL

## Sources Consulted
- Redis AUTH command documentation: https://redis.io/docs/latest/commands/auth/
- Redis ACL guide: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis ACL SETUSER command documentation: https://redis.io/docs/latest/commands/acl-setuser/
- Redis ACL SAVE command documentation: https://redis.io/docs/latest/commands/acl-save/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis security documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- redis-py connection documentation: https://redis.io/docs/latest/develop/clients/redis-py/connect/
- redis-py SSL examples: https://redis.readthedocs.io/en/stable/examples/ssl_connection_examples.html
- Jedis guide: https://redis.io/docs/latest/develop/clients/jedis/
- ioredis documentation: https://github.com/redis/ioredis
- Docker Compose variable interpolation documentation: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Kubernetes command and arguments documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- AWS ElastiCache AUTH token documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/auth.html
- AWS ElastiCache in-transit encryption documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/in-transit-encryption.html

## Issues Found
- The post described single-password authentication as only "Legacy AUTH (Redis < 6.0)". Redis 6.0+ still supports password authentication through `requirepass` and the default ACL user, so this was changed to "Password authentication" and the setup heading was updated accordingly.
- Several `redis-cli ACL SETUSER` examples used unquoted `>password` arguments. In a shell, these are parsed as output redirections instead of Redis ACL password rules. The password and key-pattern ACL rules were quoted in shell command examples.
- The Java Jedis example used `JedisPool`, which is deprecated in current Jedis documentation. It was updated to use the current `RedisClient` API and separate variable names for the password-only and username/password examples.
- The TLS section said certificate issues can cause authentication failures. Certificate verification problems are TLS connection failures, not Redis authentication failures, so the wording was corrected.
- The Python TLS example created an `ssl_context` but did not pass it to redis-py. The unused context setup was removed, leaving the actual redis-py TLS parameters.
- The ACL file example included comment lines. Redis ACL file comment support is version-sensitive, so the comments were removed from the ACL file snippet to keep the example compatible across Redis 6+ deployments.
- The `ACL SAVE` example did not mention that it requires `aclfile` configuration. A note was added in the command comment.
- The Docker Compose example used `${REDIS_PASSWORD}` in the Redis command while defining `REDIS_PASSWORD` only inside the service environment. Compose interpolation comes from the shell or `.env`, not from the same service's `environment` block. The command was changed to use runtime shell expansion with `$$REDIS_PASSWORD`, and the Compose interpolation was kept for values supplied by the shell or `.env`.

## Review Notes
- `redis-cli -a` and `--pass` are valid, but Redis documentation notes that `REDISCLI_AUTH` can be safer than passing passwords directly on the command line.
- The Kubernetes `$(REDIS_PASSWORD)` syntax in command arguments is correct for Kubernetes environment variable expansion.
