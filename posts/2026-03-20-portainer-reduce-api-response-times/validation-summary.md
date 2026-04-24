# Validation Summary: How to Reduce API Response Times in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- Docker
- Docker Compose
- Nginx
- Bash
- BoltDB / bbolt

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer general settings (`Snapshot interval`): https://docs.portainer.io/admin/settings/general
- Portainer database encryption docs (confirms BoltDB and `/data` volume): https://docs.portainer.io/advanced/db-encryption
- Portainer deprecated and removed features: https://docs.portainer.io/advanced/deprecated
- Portainer analytics collection changes in 2.38.0: https://docs.portainer.io/sts/faqs/getting-started/what-information-does-portainer-collect
- Docker Compose service reference (`cpus`): https://docs.docker.com/reference/compose-file/services/
- NGINX `ngx_http_proxy_module` reference: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- bbolt package documentation (single writer, multiple readers): https://pkg.go.dev/go.etcd.io/bbolt

## Issues Found
- The post measured `/api/containers/json`, which is not the Portainer container-listing path. I changed it to `/api/endpoints/$ENVIRONMENT_ID/docker/containers/json` and switched the examples to the documented `X-API-Key` header.
- The root-cause table referenced `/api/containers`, which was inaccurate for Portainer. I changed that row to the broader and correct "Container listing slow" wording.
- The `--snapshot-interval 180` example was incorrect because Portainer expects duration strings such as `30s`, `5m`, or `1h`. I updated the example to `--snapshot-interval 3m`.
- The database compaction example used a one-off `docker run --rm ... --compact-db` flow that would not match Portainer's documented "compact on startup" behavior. I changed it to restarting Portainer with `--compact-db`.
- The Nginx cache example proxied to `http://portainer:9000`, even though current Portainer installs default to HTTPS on `9443`, and its cache key ignored auth headers. I updated the upstream to `https://portainer:9443`, restricted caching to the exact `/api/endpoints` location, and keyed the cache by both `Authorization` and `X-API-Key`.
- The Compose CPU example used `deploy.resources.limits.cpus`, which is part of the optional deploy section and can be ignored by Compose implementations. I changed it to the service-level `cpus` field.
- The `--no-analytics` recommendation was outdated. Portainer marks that flag as deprecated, and starting with Portainer 2.38.0 the Matomo analytics integration was removed. I replaced that section with the current behavior.
- The monitoring script used a JWT obtained from `/api/auth`, which expires, making it unsuitable for long-running trend monitoring. I updated it to use a Portainer API key via `X-API-Key`.

## Review Notes
- The updated Portainer container examples use the current `:lts` image tag to align with Portainer's current installation guidance.
- The compaction example assumes a Docker Standalone deployment. If an existing Portainer container was started with additional flags, mounts, or ports, those need to be preserved when restarting with `--compact-db`.
- The Nginx cache example is technically correct after the fixes, but the 60-second TTL is still an operational tradeoff: it improves latency at the cost of allowing brief staleness on cached reads.
