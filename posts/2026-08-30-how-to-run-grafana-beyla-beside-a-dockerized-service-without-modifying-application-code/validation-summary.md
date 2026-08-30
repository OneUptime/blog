# Validation Summary: How to Run Grafana Beyla Beside a Dockerized Service Without Modifying Application Code

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Beyla
- eBPF
- Docker Engine and Docker Compose
- OpenTelemetry and OTLP/HTTP
- Grafana Alloy
- Linux capabilities and PID namespaces
- HTTP, HTTPS, gRPC, and distributed tracing

## Sources Consulted
- Grafana Beyla overview and requirements: https://grafana.com/docs/beyla/latest/
- Grafana Beyla Docker setup: https://grafana.com/docs/beyla/latest/setup/docker/
- Grafana Beyla global configuration properties: https://grafana.com/docs/beyla/latest/configure/options/
- Grafana Beyla service discovery: https://grafana.com/docs/beyla/latest/configure/service-discovery/
- Grafana Beyla telemetry export: https://grafana.com/docs/beyla/latest/configure/export-data/
- Grafana Beyla routes decorator: https://grafana.com/docs/beyla/latest/configure/routes-decorator/
- Grafana Beyla instrumentation and context propagation: https://grafana.com/docs/beyla/latest/configure/controlling-instrumentation/
- Grafana Beyla language-specific agents: https://grafana.com/docs/beyla/latest/configure/language-agents/
- Grafana Beyla distributed tracing: https://grafana.com/docs/beyla/latest/distributed-traces/
- Grafana Beyla security, permissions, and capabilities: https://grafana.com/docs/beyla/latest/security/
- Grafana Alloy `beyla.ebpf` component: https://grafana.com/docs/alloy/latest/reference/components/beyla/beyla.ebpf/
- Docker Compose services reference, including `pid`: https://docs.docker.com/reference/compose-file/services/#pid
- Docker Compose startup order and readiness: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose networking: https://docs.docker.com/compose/how-tos/networking/
- Docker `run` PID namespace reference: https://docs.docker.com/reference/cli/docker/container/run/#pid
- Docker privileged-mode reference: https://docs.docker.com/reference/cli/docker/container/run/#escalate-container-privileges---privileged
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- curl command-line manual: https://curl.se/docs/manpage.html

## Issues Found
- The request immediately after `docker compose up -d` could race application readiness because short-form `depends_on` controls startup order but does not wait for readiness. Added bounded curl retries for connection-refused errors.
- The Docker CLI explanation said the PID-namespace donor only had to exist. A stopped container cannot donate a live PID namespace, so the text now says the `api` container must already be running.
- The route example implied that `routes.unmatched: heuristic` produces a named `/orders/{id}` template. Heuristic mode uses the configured wildcard character and produces a route such as `/orders/*`, so the example was corrected.
- The capability discussion omitted `NET_RAW` and `SYS_ADMIN` from Grafana's current application-observability example and did not identify the current conditional requirements precisely. Updated it to include the documented example set, `NET_ADMIN` for TC-based network capture or packet-level context propagation, and `SYS_RESOURCE` for kernels older than 5.11.
- The `BEYLA_ENFORCE_SYS_CAPS=1` workflow implied that Beyla would print a complete required-capability list before privileged mode was removed. Enforcement instead aborts startup and logs capabilities that are missing, so the workflow now enables it while testing the reduced-capability configuration.

## Review Notes
The review used the current Grafana Beyla v3.33.x documentation. The post correctly warns that `latest` and `dev` image tags are mutable and should be replaced with reviewed immutable versions or digests in production. Its OTLP endpoint is valid: Beyla infers OTLP/HTTP protobuf from port 4318 and appends the per-signal path to the shared endpoint. The Compose YAML was also accepted by Docker Compose v5.1.4, and the referenced Docker and curl flags were checked against Docker 29.4.3 and curl 8.7.1. A Compose service key named `api` normally receives a project-scoped Engine container name, so anyone moving from the Compose example to the standalone CLI example must use the actual container name or ID unless the target was explicitly named `api`.
