# Validation Summary: How to Troubleshoot Traefik Routing Issues with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Traefik Proxy
- Docker
- Portainer
- ACME / Let's Encrypt
- OpenSSL
- `curl`
- `jq`

## Sources Consulted
- Traefik API & Dashboard documentation: https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/
- Traefik Docker provider routing documentation: https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/
- Traefik logs and access logs documentation: https://doc.traefik.io/traefik/observe/logs-and-access-logs/
- Traefik ACME certificate resolver documentation: https://doc.traefik.io/traefik/reference/install-configuration/tls/certificate-resolvers/acme/
- Docker `docker inspect` CLI reference: https://docs.docker.com/reference/cli/docker/inspect/
- Docker container networking documentation: https://docs.docker.com/network/
- Traefik source for API response fields (`RouterInfo`, `ServiceInfo`, handler output): https://github.com/traefik/traefik/blob/master/pkg/config/runtime/runtime_http.go and https://github.com/traefik/traefik/blob/master/pkg/api/handler_http.go
- Traefik source for the generated default certificate common name: https://github.com/traefik/traefik/blob/master/pkg/tls/generate/generate.go

## Issues Found
- The dashboard API example used `.err`, but Traefik exposes router and service creation problems under the `error` field in its runtime API. Updated the `jq` filter to read `error` so the example matches the actual API output.
- The text said to look for "disabled routers" while the filter selected every router whose status was not `enabled`, which also includes warnings. Updated the wording to "routers with warnings or errors" so the explanation matches the command.
- The `traefik.docker.network` comment implied the label must match a value in `traefik.yml`. Traefik documents this label as overriding the Docker network Traefik should use for container connections. Updated the comment to refer to the Docker network name rather than the config file.
- The ACME certificate check claimed the default Traefik certificate would appear in the issuer field. Traefik’s generated certificate is identified by the subject common name `TRAEFIK DEFAULT CERT`. Updated the `openssl` command to print the subject and corrected the explanation.
- The network diagnostic used `CONTAINER_IP` as a literal placeholder before the variable was defined. Reordered the commands to fetch the container IP first and then use `$CONTAINER_IP` in the connectivity test.
- The HTTP challenge note said the path "should return 404". Traefik and Let's Encrypt documentation only require port 80 reachability for HTTP-01; the exact response can vary. Updated the note to require an HTTP response rather than specifically `404`.
- One intentionally wrong label example used an ellipsis instead of a real Traefik label key, which made the example syntactically invalid rather than simply misconfigured. Replaced it with a valid `loadbalancer.server.port` label so the mismatch example remains realistic.

## Review Notes
- The examples align with current Traefik v3 documentation and current Docker CLI behavior as of 2026-04-24.
- Some diagnostic commands assume common host/container tools such as `jq`, `nslookup`, `netstat`, or `ss` are available. That is acceptable for a troubleshooting guide, but tool availability can vary by image and host distribution.
- Portainer can deploy both standalone Docker workloads and Swarm stacks. For Swarm deployments, Traefik uses service-level labels rather than container-level labels, which is worth keeping in mind if this post is later expanded.
