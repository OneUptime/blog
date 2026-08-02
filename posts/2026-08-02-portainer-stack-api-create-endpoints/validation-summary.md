# Validation Summary: Portainer Stack API Returns 404 After an Upgrade: Migrating to the New Create Endpoints

## Status
validated

## Post Type
Troubleshooting and API migration guide

## Technologies Covered

- Portainer HTTP API
- Docker Compose and Docker Standalone
- Docker Swarm and the Docker Engine API
- Kubernetes manifests
- Git-backed Portainer stacks
- Bash, `curl`, and `jq`
- Reverse proxies

## Sources Consulted

- Portainer deprecated and removed features: https://docs.portainer.io/advanced/deprecated
- Portainer current API documentation: https://docs.portainer.io/api/docs
- Portainer API access and API-key authentication: https://docs.portainer.io/api/access
- Portainer API usage examples, including the Docker API proxy path: https://docs.portainer.io/api/examples
- Portainer CLI configuration, including `--base-url`: https://docs.portainer.io/advanced/cli
- Portainer release notes: https://docs.portainer.io/release-notes
- Portainer Community Edition generated API specification: https://github.com/portainer/portainer/blob/develop/api/docs/swagger.yaml
- Portainer 2.20 stack route registration, including the deprecated compatibility route: https://github.com/portainer/portainer/blob/2.20.0/api/http/handler/stacks/handler.go
- Portainer 2.20 generic stack-create query mapping: https://github.com/portainer/portainer/blob/2.20.0/api/http/handler/stacks/stack_create.go
- Portainer 2.27.9 stack route registration, showing removal of `POST /stacks`: https://github.com/portainer/portainer/blob/2.27.9/api/http/handler/stacks/handler.go
- Portainer 2.27.9 Go module dependencies: https://github.com/portainer/portainer/blob/2.27.9/go.mod
- Portainer current Compose, Swarm, and Kubernetes stack-create handlers and payload definitions: https://github.com/portainer/portainer/tree/develop/api/http/handler/stacks
- Gorilla Mux 1.8.1 router implementation and method-mismatch handling: https://github.com/gorilla/mux/blob/v1.8.1/mux.go
- Docker Engine API reference: https://docs.docker.com/reference/api/engine/version/v1.45/
- Docker Compose service and restart configuration: https://docs.docker.com/reference/compose-file/services/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- jq manual: https://jqlang.org/manual/
- curl manual: https://curl.se/docs/manpage.html

## Issues Found

- The opening attributed `404 Not Found` directly to removal of `POST /stacks`. Portainer 2.27.9 still registers `GET /stacks` and uses Gorilla Mux 1.8.1, which returns `405 Method Not Allowed` when the path matches but the method does not. A reverse proxy or API gateway can still turn the reported failure into a 404. The opening now distinguishes the proxy-facing 404 from Portainer's normal direct 405 response while preserving the migration guidance.
- The repository-endpoint discussion implied that every orchestrator's repository payload includes deployment environment variables. Portainer's Docker Standalone and Docker Swarm repository payloads have an `Env` field, but the Kubernetes repository payload does not. The sentence now says that payload fields depend on the orchestrator and limits deployment environment variables to Docker stacks.

## Review Notes

- Portainer's deprecation table confirms that `POST /stacks` was deprecated in 2.20.0 and removed in 2.27.0. The replacement routes listed in the post match the generated API specification and current handler routing.
- The JSON field names, multipart field names, `endpointId` query parameter, `X-API-Key` header, and Swarm ID lookup path match Portainer's current API schema and implementation.
- The Bash snippets passed syntax checking. The Compose example passed `docker compose config`, and the Kubernetes manifest structure was checked against the current Deployment and Service documentation.
- `curl --fail-with-body` requires curl 7.76.0 or newer. This is not a Portainer-specific restriction, but clients on older operating-system images may need a curl upgrade or a different error-handling pattern.
- Repository schemas have changed beyond the endpoint migration. The post correctly tells readers to use the API schema for their installed Portainer edition and release rather than treating one repository payload as universal.
