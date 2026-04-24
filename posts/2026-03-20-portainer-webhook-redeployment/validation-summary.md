# Validation Summary: How to Trigger Container Redeployment via Webhook in Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer container webhooks
- Docker containers
- HTTP webhooks
- `curl`
- `wget`
- Bash scripting
- Python `requests`

## Sources Consulted
- Portainer Docs: Container webhooks: https://docs.portainer.io/user/docker/containers/webhooks
- Portainer Docs: Add a new container: https://docs.portainer.io/sts/user/docker/containers/add
- Portainer Docs: Service webhooks: https://docs.portainer.io/user/docker/services/webhooks
- Portainer source: webhook execution handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/webhooks/webhook_execute.go
- Portainer source: empty HTTP response helper (`204 No Content`): https://github.com/portainer/portainer/blob/develop/pkg/libhttp/response/response.go
- everything curl: `--write-out` / response code handling: https://everything.curl.dev/usingcurl/verbose/writeout.html
- GNU Wget manual: `--post-data` and `--server-response`: https://www.gnu.org/software/wget/manual/wget.html
- Requests Quickstart: https://requests.readthedocs.io/en/master/user/quickstart/

## Issues Found
- The prerequisites implied container webhooks were generally available in Portainer. I corrected this to match Portainer's current documentation: container webhooks are a Portainer Business Edition feature and only available on non-Edge environments.
- The "behind the scenes" explanation described the webhook as a fixed sequence of `docker pull`, `docker stop`, `docker rm`, and `docker run`. Portainer documents this behavior more generally as pulling the most up-to-date image and re-deploying/recreating the container, so I replaced the overly specific Docker CLI sequence with wording that matches the documented feature.
- The "Deploy Specific Version via Tag Parameter" example was incorrect. Container webhooks use the documented `?tag=<tag>` query parameter; they do not take the JSON body shown in the draft, and the `SERVICE_TAG` environment-variable pattern applies to service and stack webhooks rather than container webhooks.
- The response-handling section listed `403 Forbidden` and `400 Bad Request` as standard outcomes for invalid webhook usage. Portainer's webhook implementation and docs support `204 No Content` on success, `404 Not Found` when the webhook token is not found, and server-side `5xx` errors for processing failures, so I corrected the examples accordingly.
- The ordered deployment example used HTTP health checks against PostgreSQL on port `5432` and Redis on port `6379`, which is technically wrong because those services do not expose HTTP on those ports by default. I replaced those checks with protocol-appropriate readiness commands (`pg_isready` and `redis-cli ping`) and also added webhook status validation before waiting.

## Review Notes
- The Python example is syntactically correct and uses the current `requests.post(..., timeout=30)` pattern documented by Requests.
- The `curl` and `wget` examples use valid current options for POST requests, timeouts, output suppression, and header/status inspection.
- The ordered deployment example assumes the required client tools (`pg_isready`, `redis-cli`, and `curl`) are available wherever the script runs.
