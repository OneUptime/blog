# Validation Summary: How to Deploy SuperEdge for Managing Large-Scale Edge Node Fleets

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Kubernetes
- SuperEdge
- edgeadm
- SuperEdge Tunnel
- SuperEdge edge-health
- SuperEdge ServiceGroup, DeploymentGrid, and ServiceGrid
- Prometheus scrape configuration

## Sources Consulted
- SuperEdge manual installation documentation: https://superedge.io/docs/installation/install-manually/
- SuperEdge edgeadm installation documentation: https://superedge.io/docs/installation/how-to-bootstrap-an-edge-kubernetes-cluster/
- SuperEdge ServiceGroup documentation: https://superedge.io/docs/components/servicegroup/
- SuperEdge edge-health documentation: https://superedge.io/docs/components/edge-health/
- SuperEdge tunnel documentation: https://superedge.io/docs/components/tunnel/
- SuperEdge application-grid-controller manifest: https://raw.githubusercontent.com/superedge/superedge/master/deployment/application-grid-controller.yaml
- SuperEdge tunnel-cloud manifest: https://raw.githubusercontent.com/superedge/superedge/master/deployment/tunnel-cloud.yaml
- SuperEdge edge-health manifest: https://raw.githubusercontent.com/superedge/superedge/master/deployment/edge-health.yaml
- SuperEdge application-grid API types: https://raw.githubusercontent.com/superedge/superedge/master/pkg/application-grid-controller/apis/superedge.io/v1/types.go
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes Topology Aware Routing documentation: https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/
- Kubernetes removed feature gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/

## Issues Found
- The post claimed SuperEdge requires Kubernetes 1.20 or later. SuperEdge's published docs target Kubernetes 1.18.x and recommend 1.18 or later for edgeadm, so the version guidance was corrected.
- The post used `kubectl version --short`, which is no longer present in current kubectl documentation. Replaced it with `kubectl version -o yaml`.
- The install command referenced a non-existent `deployment/superedge-cloud.yaml`. Replaced it with the documented edgeadm workflow and official manifest application flow.
- The namespace `superedge-system` did not match SuperEdge's official manifests, which use `edge-system`. Updated SuperEdge manifest examples and commands accordingly.
- The tunnel-cloud example used incorrect image names, ports, and command flags. Replaced the hand-written manifest with instructions to configure and apply the official tunnel manifests.
- The application-grid-controller example used an outdated image style and incomplete command. Updated it to match the official manifest shape.
- The edge node setup created an incomplete custom edge-health DaemonSet and unused tunnel variables. Replaced it with official tunnel-edge and edge-health manifest application steps.
- The post used a `superedge.io/v1` `NodeGroup` custom resource with `selector` and `autonomy` fields. That is not the ServiceGroup API shape; SuperEdge ServiceGroup uses node labels selected by `gridUniqKey`. Replaced the CRD examples with node-unit labels.
- The ServiceGrid example incorrectly embedded a Deployment spec under `kind: ServiceGrid`. SuperEdge uses `DeploymentGrid` for workloads and `ServiceGrid` for Service specs, so the examples were split into a DeploymentGrid and a ServiceGrid.
- The post used Kubernetes `spec.topologyKeys` and described it as current. That alpha Service topology API was deprecated in Kubernetes 1.21 and removed after Kubernetes 1.22, so it was removed and replaced with ServiceGrid behavior.
- The edge autonomy ConfigMap was not a documented SuperEdge configuration. Replaced it with the documented Kubernetes endpoint annotations for routing pod API traffic through lite-apiserver.
- The edge-health ConfigMap format was not documented. Replaced it with the documented `hmac-config` and kubelet health plugin flags.
- The monitoring section listed made-up SuperEdge metric names and used selectors that would miss official edge-health pods. Removed the invented metric names and corrected the scrape relabeling.

## Review Notes
The post is now technically aligned with the published SuperEdge documentation and manifests, but SuperEdge's public docs and examples are old and centered on v0.7.0-era manifests. Future maintenance should re-check image tags, Kubernetes compatibility, and component metrics against the exact SuperEdge release being deployed.
