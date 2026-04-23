# Validation Summary: How to Compare Service Mesh Options for Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Service mesh architecture
- Istio
- Linkerd
- Consul
- Open Service Mesh (OSM)
- Helm

## Sources Consulted
- Rancher Istio integration docs: https://ranchermanager.docs.rancher.com/v2.10/integrations-in-rancher/istio
- Rancher enable-Istio guide: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/advanced-user-guides/istio-setup-guide/enable-istio-in-cluster
- Rancher Istio deprecation notice: https://ranchermanager.docs.rancher.com/v2.12/integrations-in-rancher/istio/rbac-for-istio
- Istio Helm install docs: https://istio.io/latest/docs/setup/install/helm/
- Istio multicluster install docs: https://istio.io/latest/docs/setup/install/multicluster/
- Istio sidecar injection docs: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio VM architecture docs: https://istio.io/latest/docs/ops/deployment/vm-architecture/
- Linkerd getting started docs: https://linkerd.io/2.18/getting-started/
- Linkerd Helm install docs: https://linkerd.io/2.18/tasks/install-helm/
- Linkerd features docs: https://linkerd.io/2.18/features/
- Linkerd automatic proxy injection docs: https://linkerd.io/2.18/features/proxy-injection/
- Linkerd SMI extension docs: https://linkerd.io/2.18/tasks/linkerd-smi/
- Consul Helm install docs: https://developer.hashicorp.com/consul/docs/deploy/server/k8s/helm
- Consul injector docs: https://developer.hashicorp.com/consul/docs/connect/k8s/inject
- Consul Envoy protocol support reference: https://developer.hashicorp.com/consul/docs/connect/proxies/envoy
- Consul external service registration docs: https://developer.hashicorp.com/consul/docs/register/external/esm/k8s
- Consul WAN federation docs: https://developer.hashicorp.com/consul/docs/east-west/wan-federation
- Open Service Mesh official site: https://openservicemesh.io/
- Open Service Mesh protocol selection docs: https://release-v1-2.docs.openservicemesh.io/docs/guides/app_onboarding/app_protocol_selection/
- Open Service Mesh official repository: https://github.com/openservicemesh/osm

## Issues Found
- The post described OSM as a normal current choice for new deployments. I updated the introduction, OSM section, and conclusion because the official OSM site and repository state that the project is archived.
- The comparison matrix said OSM only supported HTTP/1.1, HTTP/2, and gRPC. I corrected this to include TCP based on OSM protocol-routing documentation and SMI TCPRoute support.
- The matrix said Linkerd had full SMI compliance and limited VM support. I changed this to reflect current Linkerd docs: the SMI extension is deprecated and only covers TrafficSplit-style workflows, while non-Kubernetes workloads are supported through mesh expansion.
- The matrix used old Istio multicluster terminology (`Istio Federation`) and implied Rancher integration without caveat. I updated this to current Istio multicluster terminology and noted that Rancher-Istio is deprecated in Rancher v2.12+.
- The post used exact per-proxy memory figures that are highly version- and workload-dependent and were not supported by current official sizing guidance. I replaced them with qualitative comparisons and a note that production sizing should follow current vendor guidance.
- The Rancher + Istio setup comments referenced the wrong UI flow. I corrected the path to Rancher's current Apps/Charts flow and noted the Rancher Monitoring prompt documented by Rancher.
- The Linkerd install example used older open source artifact names (`install` and `stable`). I updated it to the current official open source docs (`install-edge` and `linkerd-edge`) and added the missing certificate-generation prerequisite for Helm installs.
- The Consul Helm example omitted the standard `global.name=consul` setting used in the official Helm install guidance. I added it.
- The migration example used a namespace label for Linkerd injection. Current Linkerd docs use the `linkerd.io/inject: enabled` annotation on namespaces or workloads, so I changed the command to `kubectl annotate`.

## Review Notes
- Rancher's built-in Istio chart still exists in current docs, but Rancher-Istio is deprecated beginning with Rancher v2.12.0, so future revisions of this post should keep checking Rancher release docs.
- Linkerd's current open source documentation is oriented around edge release artifacts; teams using a commercial/stable distribution should follow their vendor's packaging guidance.
- Exact proxy CPU and memory overhead for Istio, Linkerd, Consul, and OSM depends heavily on traffic shape, enabled features, and deployment mode, so qualitative guidance is safer than fixed numbers in a general comparison post.
- OSM remains relevant for inherited environments, but it should not be presented as a recommended new production choice unless the project becomes active again.
