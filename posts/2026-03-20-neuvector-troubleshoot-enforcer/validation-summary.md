# Validation Summary: How to Troubleshoot NeuVector Enforcer Issues - A Practical Guide

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- NeuVector (Enforcer, Controller, Manager, REST API, group policy modes)
- Kubernetes (DaemonSet, Pods, Services, kubectl)
- Container runtimes (containerd, Docker, CRI-O) — host socket paths
- Bash, curl, jq, ssh — operational tooling

## Sources Consulted
- NeuVector Kubernetes manifest (5.4.0): https://raw.githubusercontent.com/neuvector/manifests/main/kubernetes/5.4.0/neuvector-k8s.yaml — confirmed DaemonSet name `neuvector-enforcer-pod`, label `app=neuvector-enforcer-pod`, service `neuvector-svc-controller`, and `CLUSTER_JOIN_ADDR` env variable
- NeuVector controller source (`share/types.go`): https://github.com/neuvector/neuvector — confirmed policy mode constants `Discover`, `Monitor`, `Protect` are case-sensitive
- NeuVector REST routes (`controller/rest/rest.go`) and handlers (`controller/rest/group.go`, `controller/rest/log.go`) — confirmed endpoints for log and service-config APIs
- NeuVector Swagger / API definitions (`controller/api/apis.yaml`) — confirmed request/response schemas (`RESTServiceBatchConfigData`, `RESTPolicyViolationsData`, `RESTSecurityData`, `RESTGroupConfigData`)
- NeuVector auth header constant (`controller/api/apis.go`): `RESTTokenHeader = "X-Auth-Token"`
- NeuVector docs: https://open-docs.neuvector.com/

## Issues Found
1. **Wrong endpoint for fetching violations (Step 4).** The post used `GET /v1/event?type=security`, which is not a valid NeuVector route. The correct endpoint for blocked traffic is `GET /v1/log/violation` (or `/v1/log/security` which returns combined threats/incidents/violations). Updated the curl command to use `/v1/log/violation` and updated the jq filter to read from `.violations[]` with the actual response fields (`reported_at`, `client_name`, `server_name`, `applications`, `message`) per `RESTPolicyViolationsData`. The redundant `select(.action == "deny")` was dropped because the violations endpoint already returns blocked events.

2. **Wrong endpoint and body for changing a group's policy mode (Step 4 and Step 5).** The post used `PATCH /v1/group/{name}` with body `{"config": {"mode": "Monitor"}}`. The `RESTGroupConfigData` accepted by `PATCH /v1/group/{name}` does not contain a `mode` (or `policy_mode`) field — that route edits the group's criteria/comment, not its policy mode. Policy mode is changed via `PATCH /v1/service/config` with `RESTServiceBatchConfigData`: `{"config": {"services": ["<service.namespace>"], "policy_mode": "Monitor"}}`. Updated both curl examples (Steps 4 and 5) to use this correct endpoint, body, and the un-prefixed service name (`myapp.production`, `batch-processor.default` — the API maps these to the internal `nv.<service>.<namespace>` group names).

## Review Notes
- All `kubectl` commands, label selectors (`app=neuvector-enforcer-pod`), DaemonSet name (`neuvector-enforcer-pod`), service name (`neuvector-svc-controller`), env variable (`CLUSTER_JOIN_ADDR`), and the controller cluster port (18300) are correct.
- The auth header `X-Auth-Token` and the manager port `8443` are both correct (port 8443 is the default `neuvector-service-webui` LoadBalancer port).
- Container runtime socket paths (`/run/containerd/containerd.sock`, `/var/run/docker.sock`, `/run/crio/crio.sock`) are accurate for current distributions.
- `curl -v telnet://host:port` is a valid way to test TCP connectivity using curl's telnet protocol support.
- "Disable DPI for low-risk, high-traffic groups" in Step 5 is loose phrasing — switching a service to Discover mode reduces enforcement overhead but does not literally disable DPI. The phrasing was softened to "Move low-risk, high-traffic services to Discover mode" to match what the API call actually does.
- Note for future updates: NeuVector also exposes `PATCH /v1/service/config/profile` and `PATCH /v1/service/config/network` for finer-grained mode changes (process-profile vs network-policy mode separately), which could be referenced if the post is expanded.
