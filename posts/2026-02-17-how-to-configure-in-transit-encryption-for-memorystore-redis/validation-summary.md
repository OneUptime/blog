# Validation Summary: How to Configure In-Transit Encryption for Memorystore Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Memorystore for Redis
- Google Cloud CLI
- Redis TLS
- Redis AUTH
- Python redis-py
- Node.js node-redis
- Go go-redis
- Kubernetes Secrets and Deployments

## Sources Consulted
- Google Cloud Memorystore for Redis: Manage in-transit encryption: https://docs.cloud.google.com/memorystore/docs/redis/manage-in-transit-encryption
- Google Cloud Memorystore for Redis: About in-transit encryption: https://docs.cloud.google.com/memorystore/docs/redis/about-in-transit-encryption
- Google Cloud Memorystore for Redis: Security overview: https://docs.cloud.google.com/memorystore/docs/redis/security-overview
- Google Cloud CLI reference: gcloud redis instances create: https://docs.cloud.google.com/sdk/gcloud/reference/redis/instances/create
- Google Cloud CLI reference: gcloud redis instances update: https://cloud.google.com/sdk/gcloud/reference/redis/instances/update
- Redis node-redis client documentation: https://redis.io/docs/latest/develop/clients/nodejs/connect/
- redis-py connection documentation: https://redis-py-uglide.readthedocs.io/en/latest/connections.html
- go-redis official repository documentation: https://github.com/redis/go-redis

## Issues Found
- The post stated that Memorystore traffic is not encrypted by default. Google Cloud documents default network-level encryption for Memorystore traffic, so the wording was changed to clarify that Redis TLS is not enabled by default and that TLS protects the Redis protocol layer.
- The post stated that enabling in-transit encryption makes Redis accept TLS connections on the same port. Google Cloud documents the secure Redis port as `6378`, so the explanation was corrected.
- The post described enabling TLS on an existing Memorystore for Redis instance with `gcloud redis instances update`. Official Memorystore for Redis documentation says in-transit encryption can only be enabled at instance creation, so that section now explains creating a replacement instance.
- The post included a command to disable TLS in place. Official documentation says in-transit encryption cannot be disabled for instances created with it, so that section now explains replacing the instance instead.
- The certificate explanation referred to a Google-managed CA. Memorystore provides one or more instance-specific CAs, so the wording was corrected.
- The Python example created an unused SSL context and did not pass it to redis-py. The unused context was removed, and `ssl_check_hostname=False` was made explicit while keeping CA verification required.
- The Node.js example imported an unused `tls` module and did not account for Memorystore connections by IP address. The unused import was removed, and `checkServerIdentity` was set so the client verifies the chain against the downloaded CA without requiring hostname verification against the IP.
- The Go example used default hostname verification, which can fail when connecting to Memorystore by IP address. It now verifies the presented certificate against the downloaded CA while not requiring the certificate hostname to match the IP address.
- The certificate rotation section mixed server certificate rotation with CA rotation and implied a new CA appears only when a certificate is about to expire. It now reflects the documented CA validity and rotation window.
- The performance section gave exact latency estimates that are not stated in the official documentation. Those numbers were replaced with qualitative overhead guidance and a recommendation to benchmark.

## Review Notes
The post is now technically aligned with the current Memorystore for Redis documentation. The Python snippet was syntax-checked with Python 3.12. The local environment did not have `gcloud`, Go, or the Node.js `redis` package installed, so those snippets were verified against official documentation rather than executed locally.
