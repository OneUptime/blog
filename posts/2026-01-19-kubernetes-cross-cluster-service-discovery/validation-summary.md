# Validation Summary: How to Set Up Cross-Cluster Service Discovery in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Multi-Cluster Services API
- Submariner and Lighthouse
- Istio multi-cluster service mesh
- Cilium Cluster Mesh
- Skupper
- CoreDNS multicluster plugin
- ExternalDNS
- Prometheus remote write and PromQL

## Sources Consulted
- Submariner subctl deployment documentation: https://submariner.io/operations/deployment/subctl/
- Submariner service discovery architecture: https://submariner.io/getting-started/architecture/service-discovery/
- Istio primary-remote multi-cluster installation: https://istio.io/latest/docs/setup/install/multicluster/primary-remote/
- Istio multi-primary multi-network installation: https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Cilium Cluster Mesh setup documentation: https://docs.cilium.io/en/stable/network/clustermesh/clustermesh/
- Cilium Cluster Mesh global services documentation: https://docs.cilium.io/en/stable/network/clustermesh/services/
- Cilium Cluster Mesh service affinity documentation: https://docs.cilium.io/en/stable/network/clustermesh/affinity/
- Skupper v2 getting started guide: https://skupper.io/start/
- Skupper Kubernetes site configuration documentation: https://skupper.io/docs/kube-cli/site-configuration.html
- Skupper Kubernetes site linking documentation: https://skupper.io/docs/kube-cli/site-linking.html
- Skupper service exposure documentation: https://skupper.io/docs/kube-cli/service-exposure.html
- CoreDNS multicluster plugin documentation: https://coredns.io/explugins/multicluster/
- ExternalDNS CRD source documentation: https://github.com/kubernetes-sigs/external-dns/blob/master/docs/sources/crd.md
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- Submariner `join` commands used non-current flags `--pod-cidr`, `--service-cidr`, and `--health-check-enabled`. Updated them to `--clustercidr`, `--servicecidr`, and `--health-check=true` to match official `subctl` documentation.
- Submariner service CIDRs used `/12` ranges that overlapped between clusters. Changed them to non-overlapping `/16` ranges.
- The example Kubernetes `Deployment` manifests omitted required `spec.selector` and pod template labels. Added matching selectors and labels so the manifests are valid `apps/v1` Deployments.
- The Istio primary-remote flow omitted `externalIstiod`, the east-west gateway installation, the control-plane namespace annotation on the remote cluster, and had the remote secret applied in the wrong direction. Updated the flow to match Istio's current primary-remote steps.
- The Istio multi-primary flow used `gen-eastwest-gateway.yaml` as if it were directly applicable and omitted the `istio-system` namespace when exposing services. Updated the commands to run `gen-eastwest-gateway.sh`, install through `istioctl`, apply expose-services in `istio-system`, and use current `istioctl create-remote-secret` commands.
- Cilium examples used old annotation names such as `io.cilium/global-service`. Replaced them with current `service.cilium.io/global`, `service.cilium.io/shared`, and `service.cilium.io/affinity` annotations.
- Cilium install commands used outdated cluster identity flags. Updated them to the documented `--set cluster.name=...` and `--set cluster.id=...` form.
- Skupper examples used v1 commands such as `skupper init`, `token create`, `link create`, and `expose`. Updated them to the current v2 controller install, `site create`, `token issue`, `token redeem`, `connector create`, and `listener create` workflow.
- The health-check examples used invalid cluster-name DNS forms under `svc.clusterset.local`. Replaced them with valid service and namespace based `clusterset.local` names.

## Review Notes
- The CoreDNS `multicluster` snippet is syntactically consistent with the external plugin documentation, but real deployments must ensure the plugin is included in the CoreDNS build or image.
- Some multi-cluster commands remain environment-dependent, especially LoadBalancer availability for Istio east-west gateways and Cilium Cluster Mesh control-plane exposure.
