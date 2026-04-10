# Validation Summary: How to Set Up DigitalOcean Managed Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis 7.x
- DigitalOcean Managed Databases
- doctl CLI
- redis-cli
- Node.js with ioredis
- Python with redis-py
- TLS/SSL connections

## Sources Consulted
- DigitalOcean doctl reference: `doctl databases create` — https://docs.digitalocean.com/reference/doctl/reference/databases/create/
- DigitalOcean doctl reference: `doctl databases firewalls append` — https://docs.digitalocean.com/reference/doctl/reference/databases/firewalls/append/
- DigitalOcean doctl reference: `doctl databases get-ca` — https://docs.digitalocean.com/reference/doctl/reference/databases/get-ca/
- Redis CLI documentation — https://redis.io/docs/connect/cli/
- ioredis documentation — https://github.com/redis/ioredis
- redis-py documentation — https://redis-py.readthedocs.io/

## Issues Found

1. **Incorrect `doctl` command for downloading the CA certificate.**
   - **What was wrong:** The post used `doctl databases ca <cluster-id> --output-dir ./certs`. The correct subcommand is `doctl databases get-ca`, not `doctl databases ca`. Additionally, there is no `--output-dir` flag; the command outputs the certificate to stdout.
   - **What was changed:** Replaced with `doctl databases get-ca <cluster-id> --output json | jq -r '.ca_certificate' > ./certs/ca-certificate.crt` to correctly retrieve and save the CA certificate.

2. **`redis-cli` connection string missing `-u` flag.**
   - **What was wrong:** The post passed the `$REDIS_URL` as a positional argument: `redis-cli --tls --cacert ... "$REDIS_URL"`. redis-cli requires the `-u` flag to interpret a URI.
   - **What was changed:** Changed to `redis-cli -u "$REDIS_URL" --tls --cacert ./certs/ca-certificate.crt`.

3. **Incorrect redis-cli prompt after remote connection.**
   - **What was wrong:** The connectivity test showed `127.0.0.1:25061>` as the prompt, but since the connection is to a remote DigitalOcean host, the prompt displays the remote hostname, not localhost.
   - **What was changed:** Changed to `<host>:25061>` to accurately reflect a remote connection prompt.

## Review Notes
- The `doctl databases create` command, firewall rules, and connection parameters (port 25061, `rediss://` scheme) are all accurate for DigitalOcean Managed Redis.
- The Node.js (ioredis) and Python (redis-py) code examples are syntactically correct and use current, non-deprecated APIs.
- The eviction policy descriptions are accurate and match Redis documentation.
- The `rediss://` URI scheme (double 's') correctly indicates TLS, which is consistent with DigitalOcean's requirement for encrypted connections.
