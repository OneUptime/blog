# Validation Summary: How to Troubleshoot Traefik Routing Issues with Portainer - Part 3

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Traefik (reverse proxy, v2/v3)
- Portainer (container management)
- Docker / Docker Compose
- Docker networking
- YAML configuration

## Sources Consulted
- Traefik Dashboard & API docs: https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/
- Traefik Logs configuration: https://doc.traefik.io/traefik/reference/install-configuration/observability/logs-and-accesslogs/
- Traefik Docker provider routing: https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/
- Traefik EntryPoints: https://doc.traefik.io/traefik/reference/install-configuration/entrypoints/
- Traefik Routers (rule matcher syntax): https://doc.traefik.io/traefik/routing/routers/
- Traefik Middleware Chain: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/chain/

## Issues Found
- **Step 6 (Rule Syntax Issues)**: The third example labeled `# Wrong - escaping issue in docker-compose` showed `Host(\`app.example.com\`) && PathPrefix(\`/api\`)` inside double-quoted docker-compose label syntax. This is actually valid — docker-compose does not shell-evaluate label values, so the backticks and `&&` pass through correctly to Traefik as rule syntax. Relabeled the example as `# Correct - combining matchers with &&` so readers are not misled into thinking a valid pattern is broken.

## Review Notes
- The dashboard URL `:8080/dashboard/` is the default only when `--api.insecure=true`. In a hardened production setup, the dashboard is exposed via a configured entrypoint/router, not port 8080. The post's "typically" qualifier makes this acceptable.
- Traefik accepts both `--entrypoints.websecure.address=:443` (lowercase) and the camelCase `--entryPoints.websecure.address=:443` form shown in some docs; the post's lowercase form is fine.
- The post refers to "Part 3" of a series but the Portainer-specific aspects are light — the content is effectively generic Traefik-on-Docker troubleshooting. Not a technical issue, just a framing observation.
- The Traefik Docker provider auto-reloads on dynamic config (labels, container events) but static config changes still require a restart. The Step 8 guidance is consistent with this.
