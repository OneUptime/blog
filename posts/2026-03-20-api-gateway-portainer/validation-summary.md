# Validation Summary: How to Deploy an API Gateway with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Kong Gateway
- PostgreSQL
- Prometheus
- JWT authentication

## Sources Consulted
- Kong Gateway install with Docker Compose: https://developer.konghq.com/gateway/install/docker/
- Kong Gateway install and OSS version information: https://developer.konghq.com/gateway/install/?install=oss
- Kong Gateway version support policy: https://developer.konghq.com/gateway/version-support-policy/
- Kong Admin API security guidance: https://developer.konghq.com/gateway/secure-the-admin-api/
- Kong Services and Routes getting started guide: https://developer.konghq.com/gateway/get-started/
- Kong JWT plugin docs: https://developer.konghq.com/plugins/jwt/
- Kong Request Transformer examples: https://developer.konghq.com/plugins/request-transformer/examples/add-header/
- Kong Response Transformer examples: https://developer.konghq.com/plugins/response-transformer/examples/add-header/
- Kong Prometheus plugin docs: https://developer.konghq.com/plugins/prometheus/
- Docker Compose reference for the obsolete `version` field: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose `depends_on` conditions: https://docs.docker.com/reference/compose-file/services/
- Portainer container logs documentation: https://docs.portainer.io/user/docker/containers/logs
- Konga repository and compatibility notes: https://github.com/pantsel/konga
- Konga Docker image documentation: https://hub.docker.com/r/pantsel/konga/

## Issues Found
- The post used `kong:3.6`, which is no longer a current supported Kong OSS release. I updated the image references to `kong:3.9.1`, which Kong documents as the latest OSS version.
- The Compose snippet used the top-level `version` field, which Docker now marks as obsolete. I removed it.
- The `kong` service only waited for PostgreSQL health, not for the migration job to finish. I updated the Compose dependency to wait for `kong_migrations` with `service_completed_successfully`.
- The Admin API configuration published port `8444` without enabling it in `KONG_ADMIN_LISTEN`, and it included an unused `KONG_ADMIN_GUI_URL`. I fixed the Admin API listener and removed the incorrect GUI setting.
- The post included `Konga`, but the project is archived and its own README states that versions from `0.14.0` onward are only compatible with Kong `1.x`. I removed the unsupported Konga service and the related conclusion claim.
- The global rate-limiting example depended on Redis even though no Redis service was deployed, and it used the older `redis_host` style seen in older docs. I changed the example to a self-contained `local` policy.
- The request-transformer example added a shell-generated timestamp at configuration time, which would become a fixed static header rather than a per-request timestamp. I replaced it with a supported static-header example from Kong’s documented plugin format.
- The request/response transformer examples used form-style repeated header parameters where Kong’s current examples document JSON array configuration more clearly. I updated both examples to JSON bodies.
- The metadata claimed the post covered Traefik and analytics, but the content only covered Kong and Prometheus-style monitoring. I corrected the description and tags to match the actual implementation.
- The conclusion referred to `deck`; the official project name is `decK`. I corrected the capitalization.

## Review Notes
- The Prometheus example is technically valid on the Admin API `/metrics` endpoint, but Kong’s docs prefer using the Status API endpoint when available.
- The tutorial configures Kong through Admin API calls. That works, but declarative configuration with `decK` is a safer operational model for larger environments.
