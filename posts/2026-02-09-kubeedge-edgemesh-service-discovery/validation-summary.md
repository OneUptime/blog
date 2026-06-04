# Validation Summary: How to Configure KubeEdge EdgeMesh for Service Discovery Between Edge Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- KubeEdge
- EdgeMesh
- Kubernetes Services, Deployments, DaemonSets, ConfigMaps, and CRDs
- kubectl
- Edge service discovery and relay configuration

## Sources Consulted
- EdgeMesh official Getting Started guide: https://edgemesh.kubeedge.io/
- EdgeMesh official configuration reference: https://edgemesh.kubeedge.io/reference/config-items.html
- EdgeMesh official Hybrid Proxy and Service Filter guide: https://edgemesh.kubeedge.io/advanced/hybird-proxy.html
- EdgeMesh official test case guide: https://edgemesh.kubeedge.io/guide/test-case
- KubeEdge/EdgeMesh upstream repository README and manifests: https://github.com/kubeedge/edgemesh
- EdgeMesh upstream agent ConfigMap manifest: https://raw.githubusercontent.com/kubeedge/edgemesh/master/build/agent/resources/04-configmap.yaml
- EdgeMesh upstream agent DaemonSet manifest: https://raw.githubusercontent.com/kubeedge/edgemesh/master/build/agent/resources/05-daemonset.yaml
- HashiCorp http-echo repository: https://github.com/hashicorp/http-echo

## Issues Found
- The post described a separate EdgeMesh-Server deployment and server ConfigMap. Current EdgeMesh documentation states that after v1.12.0, edgemesh-server capabilities were merged into the edgemesh-agent EdgeTunnel module. Updated the architecture and install sections to use the current agent-based deployment model.
- The install flow omitted the upstream RBAC, service account, PSK ConfigMap, and standard `build/agent/resources/` deployment path. Updated the installation steps to apply the official resource directory and mention PSK regeneration.
- The agent configuration used `modules.tunnel`; the documented current field is `modules.edgeTunnel`. Updated configuration snippets to use `edgeTunnel`.
- The service filtering label and semantics were incorrect. The post used `edgemesh.kubeedge.io/service: "true"` as an opt-in label, but EdgeMesh documents `service.edgemesh.kubeedge.io/service-proxy-name` as the service filter label, and the default `FilterIfLabelExists` mode excludes labeled services from EdgeMesh proxying. Updated the service examples and filtering section.
- The `hashicorp/http-echo` examples exposed port 8080 but did not configure the container to listen on 8080. Added `-listen=:8080` to both deployments.
- The monitoring commands used `app=edgemesh-agent`, but the upstream manifests label agents with `kubeedge=edgemesh-agent`. Updated the log commands accordingly.
- The multi-zone section claimed that Kubernetes topology labels automatically make EdgeMesh prefer same-zone endpoints. I found no support for that behavior in the EdgeMesh documentation. Replaced it with documented relay node configuration guidance and clarified that topology labels are not an EdgeMesh locality policy.
- Made namespace creation and Kubernetes API service labeling commands idempotent with `--dry-run=client -o yaml | kubectl apply -f -` and `--overwrite`.

## Review Notes
The post is now technically aligned with the current EdgeMesh documentation and upstream manifests. Operators should still pin EdgeMesh image versions instead of relying on `latest` in production and should validate relay addresses, PSK handling, and KubeEdge Edge Kube-API endpoint configuration for their specific cluster topology.
