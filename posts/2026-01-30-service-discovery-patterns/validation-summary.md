# Validation Summary: How to Create Service Discovery Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Consul (HTTP API, service registration, health checking)
- etcd (`python-etcd3` library, leases, watch API)
- Kubernetes (Services, headless Services, in-cluster DNS, service account namespace)
- DNS-based service discovery (A records, SRV records via `dnspython`)
- Node.js (`consul` npm package, Express.js)
- Python (`python-consul`, `etcd3`, `dnspython`, `aiohttp`)
- Circuit breaker pattern (CLOSED / OPEN / HALF_OPEN state machine)
- Mermaid (architecture diagrams)

## Sources Consulted
- Consul HTTP API – Agent Service: https://developer.hashicorp.com/consul/api-docs/agent/service
- Consul service definitions (config-file format): https://developer.hashicorp.com/consul/docs/services/usage/define-services
- `silas/node-consul` README (npm `consul` package, v1.x promise-based API)
- `python-consul` (`Consul`, `Check.http`, `agent.service.register`, `health.service`)
- `python-etcd3` API (`client.lease`, `client.put`, `client.get_prefix`, `client.watch_prefix`, `etcd3.events.PutEvent`/`DeleteEvent`)
- Kubernetes DNS spec (`<service>.<namespace>.svc.cluster.local`, SRV `_port._proto.<service>.<namespace>...`): https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes headless services (`clusterIP: None`): https://kubernetes.io/docs/concepts/services-networking/service/#headless-services
- Kubernetes service account projection (`/var/run/secrets/kubernetes.io/serviceaccount/namespace`)
- dnspython 2.x `dns.resolver.resolve()` and SRV rdata attributes (`target`, `port`, `priority`, `weight`)

## Issues Found
- **Consul HTTP API payload format was wrong.** The `service-definition.json` example used the agent **config-file** format (outer `{"service": { ... }}` wrapper with lowercase fields) but the accompanying `curl` command `PUT`s it to `/v1/agent/service/register`. That endpoint expects fields at the top level (no `service` wrapper) and uses the canonical PascalCase field names (`Name`, `ID`, `Port`, `Tags`, `Check`, with `HTTP`/`Interval`/`Timeout` inside `Check`). As written, the JSON would not register the service correctly. Rewrote the JSON to the HTTP-API payload format and updated the file comment to clarify the distinction between the config-file and HTTP-API formats.

## Review Notes
- The Kubernetes SRV-record example (`_http._tcp.<service>.<namespace>.svc.cluster.local`) requires the Service to declare a **named** port (e.g. `name: http`). The earlier `payment-service.yaml` in the post uses an unnamed port, so applying the SRV example to that exact Service would return no records. This is correct in the abstract but worth flagging if the post is expanded later.
- `python-etcd3` is somewhat unmaintained as of late 2024–2026; the API used is still correct, but readers may want to evaluate `etcd3-py` or the official gRPC client for new production code.
- The `silas/node-consul` package is on the 1.x promise-based API. `await consul.health.service({ service, passing: true })` resolves to the data array directly, matching how the post uses it.
- The circuit breaker implementation is a clean, conventional CLOSED/OPEN/HALF_OPEN state machine; no correctness issues.
- The Kubernetes namespace path `/var/run/secrets/kubernetes.io/serviceaccount/namespace` is correct for in-cluster pods using the default service account token projection.
