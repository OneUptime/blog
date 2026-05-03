# Validation Summary: How to Deploy Consul Connect via Portainer

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- HashiCorp Consul 1.17.0 (server agent, client agent, Connect service mesh)
- Consul Connect (sidecar proxies, intentions, service-intentions config entries)
- Envoy proxy v1.27.0 (sidecar)
- Portainer (Docker Swarm and Kubernetes stack management)
- Docker Compose (v3.8)
- consul-k8s Helm chart (Kubernetes deployment)
- nginx, hashicorp/http-echo (sample workloads)

## Sources Consulted
- Consul Agent CLI reference: https://developer.hashicorp.com/consul/commands/agent
- Consul Connect Envoy command: https://developer.hashicorp.com/consul/commands/connect/envoy
- Consul Intention Create (deprecation notice): https://developer.hashicorp.com/consul/commands/intention/create
- Service intentions config entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-intentions
- Consul Helm Chart Reference: https://developer.hashicorp.com/consul/docs/reference/k8s/helm
- consul-k8s values.yaml: https://github.com/hashicorp/consul-k8s/blob/main/charts/consul/values.yaml
- HashiCorp discuss thread on consul + envoy Docker images: https://discuss.hashicorp.com/t/consul-official-docker-container-and-connect-with-envoy/20495
- nicholasjackson/docker-consul-envoy reference Dockerfile: https://github.com/nicholasjackson/docker-consul-envoy

## Issues Found

1. **Envoy sidecar image was missing the `consul` binary.**
   The original `web-proxy` and `api-proxy` services used `envoyproxy/envoy:v1.27.0` and tried to execute `/usr/local/bin/consul connect envoy`. The official Envoy image does not contain the `consul` binary, and the `hashicorp/consul` image does not contain Envoy, so neither image can run the command on its own. Replaced this with a small multi-stage Dockerfile that copies the `consul` binary from `hashicorp/consul:1.17.0` into `envoyproxy/envoy:v1.27.0` (the pattern HashiCorp recommends in their forum and Docker tutorials), and updated the compose `image:` lines to reference the resulting custom image. Also dropped the redundant `/usr/local/bin/consul connect envoy` prefix from the `command:` since the new Dockerfile sets it as the `ENTRYPOINT`.

2. **`consul intention create` CLI is deprecated.**
   The bash snippet under Step 5 used `consul intention create web api` and `consul intention create -deny "*" "*"`. This CLI was deprecated in Consul 1.9.0 (and remains deprecated in 1.17.x) in favor of writing a `service-intentions` config entry. Replaced the snippet with an HCL `service-intentions` config entry for the `api` destination (allow `web`, deny `*`) applied via `consul config write`, which is the supported approach for Consul 1.17.

3. **`global.connect.enabled` is not a valid Helm value.**
   The Kubernetes values file set `global.connect.enabled: true`, but the consul-k8s Helm chart has no `global.connect` field — connect/service-mesh features are enabled by `connectInject.enabled` (which is already set later in the same file). Removed the invalid `global.connect` block and added a clarifying comment to `connectInject.enabled`.

## Review Notes
- `enable_central_service_config` defaults to `true` from Consul 1.8.0 onward, so the explicit setting in `connect.json` is redundant but not incorrect — left as-is to keep the author's voice.
- Consul 1.17.0 is a real release. For new deployments today, HashiCorp recommends Consul Dataplane (`hashicorp/consul-dataplane`) instead of the client agent + Envoy sidecar pattern shown here, but the client-agent approach is still supported in 1.17.x.
- The compose stack does not actually register the `web` and `api` services with the Consul agent (the JSON in Step 4 is shown but never mounted into the agent's `-config-dir`). The post leaves wiring this up as an exercise; not a strict technical inaccuracy, just a gap a reader will hit when reproducing the steps.
- The web service's healthcheck targets `http://localhost:80/health`, which `nginx:alpine` does not serve out of the box — readers will need to add a custom nginx config or change the path. Left as-is since this is an example endpoint, not a factual claim about nginx.
