# How to Use the Portainer API as a Docker API Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Docker API, Gateway, Security

Description: Learn how to use Portainer as a secure gateway to the Docker API, adding authentication and RBAC without exposing the Docker socket directly.

## Why Use Portainer as a Docker API Gateway?

Exposing the Docker socket directly (`/var/run/docker.sock`) is a significant security risk - anyone with socket access has root-equivalent access to the host. Portainer acts as a controlled proxy:

- **Authentication**: Requests can be authenticated with a Portainer API key or JWT.
- **Activity logs**: Portainer Business Edition includes authentication and activity logs.
- **Access control**: Users only access environments they're authorized for, with granular RBAC in Business Edition.
- **TLS**: Portainer exposes its UI and API over HTTPS by default on port `9443`.

## Docker API Proxy Endpoint

Portainer proxies all Docker API calls through:
```text
/api/endpoints/{endpointId}/docker/{docker-api-path}
```

This mirrors the Docker API almost exactly, allowing custom scripts that already call the Docker HTTP API to work with minimal changes.

## Why `DOCKER_HOST` Doesn't Work Here

You can't point the standard Docker CLI directly at Portainer with `DOCKER_HOST`. The Docker CLI expects a Docker Engine API endpoint at the host root, while Portainer's gateway is exposed under `/api/endpoints/{endpointId}/docker/`.

```bash
# This will not work as a drop-in Docker host:
export DOCKER_HOST="tcp://portainer.mycompany.com:9443"

# Use direct HTTP requests or a wrapper script that calls the Portainer API instead.
```

## Wrapper Script: Docker Commands via Portainer API

```bash
#!/bin/bash
# portainer-docker.sh - Wrapper to use Docker commands via Portainer API

PORTAINER_URL="https://portainer.mycompany.com"
ACCESS_TOKEN="${PORTAINER_ACCESS_TOKEN}"
ENDPOINT_ID="${PORTAINER_ENDPOINT_ID:-1}"

docker_api() {
  local method="${1}"
  local path="${2}"
  shift 2

  curl -sS -X "${method}" \
    "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker${path}" \
    -H "X-API-Key: ${ACCESS_TOKEN}" \
    "$@"
}

case "$1" in
  ps)
    query=""
    if [ "$2" = "all" ]; then
      query="?all=true"
    fi

    docker_api GET "/containers/json${query}" | \
      jq -r '.[] | [.Id[0:12], .Names[0], .Image, .Status] | @tsv' | \
      column -t
    ;;
  logs)
    docker_api GET "/containers/${2}/logs?stdout=true&stderr=true&tail=100"
    ;;
  restart)
    docker_api POST "/containers/${2}/restart"
    echo "Restarted container ${2}"
    ;;
  *)
    echo "Usage: $0 {ps [all]|logs <container>|restart <container>}"
    exit 1
    ;;
esac
```

## Comparing Docker vs. Portainer API Calls

```bash
# Standard Docker API call (requires socket access)
curl --unix-socket /var/run/docker.sock \
  http://localhost/v1.43/containers/json

# Same call via Portainer (adds Portainer authentication and access control)
curl "https://portainer.mycompany.com/api/endpoints/1/docker/v1.43/containers/json" \
  -H "X-API-Key: ${ACCESS_TOKEN}"
```

## Setting Up Role-Based Docker API Access (Business Edition)

In Portainer Business Edition, create a limited user, inspect the available environment roles, then grant the user access to a specific environment with the role you want:

```bash
# Create a regular user
curl -X POST "${PORTAINER_URL}/api/users" \
  -H "X-API-Key: ${ADMIN_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"Username": "monitoring-bot", "Password": "...", "Role": 2}'

# List the available environment roles and choose the RoleId you want to assign
curl "${PORTAINER_URL}/api/roles" \
  -H "X-API-Key: ${ADMIN_ACCESS_TOKEN}"

# Grant access to a specific environment using the selected RoleId
curl -X PUT "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}" \
  -H "X-API-Key: ${ADMIN_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"UserAccessPolicies\": {\"${USER_ID}\": {\"RoleId\": ${ROLE_ID}}}}"
```

## Benefits Over Direct Docker Socket Exposure

| Feature | Direct Socket | Via Portainer |
|---------|--------------|---------------|
| Authentication | None | API key/JWT |
| Activity logs | None | Authentication and activity logs in BE |
| Per-user access control | None | Environment access control, with granular RBAC in BE |
| TLS | No | HTTPS support on the Portainer API |
| Multi-host | No | Yes (multiple endpoints) |

## Conclusion

Using Portainer as a Docker API gateway adds authentication and centralized access control to Docker operations. Instead of exposing the Docker socket to multiple users or systems, centralize access through Portainer's authenticated proxy for a more secure architecture.
