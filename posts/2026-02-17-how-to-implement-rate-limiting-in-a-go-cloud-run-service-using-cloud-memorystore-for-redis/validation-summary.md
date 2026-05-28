# Validation Summary: How to Use Rate Limiting in a Go Cloud Run Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Cloud Memorystore for Redis
- Serverless VPC Access
- Redis Lua scripting
- Redis sorted sets and hashes
- Go
- go-redis v9
- HTTP middleware

## Sources Consulted
- Google Cloud SDK documentation for `gcloud redis instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/redis/instances/create
- Google Cloud SDK documentation for Serverless VPC Access connector creation: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/vpc-access/connectors/create
- Google Cloud Run documentation for VPC connectors: https://docs.cloud.google.com/run/docs/configuring/vpc-connectors
- Google Cloud Memorystore for Redis overview and networking documentation: https://docs.cloud.google.com/memorystore/docs/redis/memorystore-for-redis-overview and https://docs.cloud.google.com/memorystore/docs/redis/networking
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/programmability/eval-intro/
- Redis command documentation for hashes, including `HMSET` deprecation and `HSET`: https://redis.io/docs/latest/commands/ and https://redis.io/docs/latest/commands/hset/
- go-redis v9 package documentation: https://pkg.go.dev/github.com/redis/go-redis/v9
- Redis Go client guide: https://redis.io/docs/latest/develop/clients/go/

## Issues Found
- The sliding-window limiter used the Unix microsecond timestamp as both the sorted-set score and member. Redis sorted-set members are unique, so two requests for the same key in the same microsecond could overwrite each other and be undercounted. I changed the Lua script to use a Redis `INCR` sequence key when constructing the sorted-set member, while still using the timestamp as the score.
- The sliding-window limiter recorded rejected requests before checking the limit. This can extend throttling based on denied traffic rather than accepted traffic. I changed the script to count first and only add the current request when it is allowed.
- The token-bucket script used `HMSET`, which Redis documents as deprecated. I changed it to `HSET` with multiple field-value pairs.
- The middleware comment called `X-RateLimit-*` headers "standard" headers. These are common/de facto headers rather than the current standards-track form, so I changed the comment to "common rate limit headers."

## Review Notes
- The Cloud Run and Memorystore setup commands use current documented `gcloud` flags.
- Serverless VPC Access connectors remain valid for this architecture, though Cloud Run also supports Direct VPC egress in modern deployments.
- Production systems should be deliberate about whether they trust `X-Forwarded-For` and how they normalize client IPs, but the example is acceptable for a concise tutorial.
