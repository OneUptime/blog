# Validation Summary: How to Set Up Mesh Federation Between Istio Meshes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Istio multicluster / multi-primary deployments
- Istio east-west gateways
- Istio remote secrets
- Istio Gateway API
- Istio MeshConfig service settings

## Sources Consulted
- Istio official multicluster installation guide: https://istio.io/latest/docs/setup/install/multicluster/
- Istio official multi-primary on different networks guide: https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio official multicluster prerequisites and trust setup: https://istio.io/latest/docs/setup/install/multicluster/before-you-begin/
- Istio official multicluster verification guide: https://istio.io/latest/docs/setup/install/multicluster/verify/
- Istio official deployment models documentation: https://istio.io/latest/docs/ops/deployment/deployment-models/
- Istio official multicluster traffic management documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/multicluster/
- Istio official Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio official ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio official istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio upstream east-west gateway generator script: https://raw.githubusercontent.com/istio/istio/master/samples/multicluster/gen-eastwest-gateway.sh

## Issues Found
- The post described the setup as separate federated meshes with unique mesh IDs and independent roots of trust. The commands shown actually match Istio multi-primary multicluster on different networks, which requires the clusters to be in the same mesh ID and to establish trust, commonly through intermediate certificates from a common root CA. Updated the introduction, prerequisites, and IstioOperator examples accordingly.
- The title and description referred to mesh federation between separate Istio meshes, while the implementation steps use Istio multicluster connectivity between clusters in one mesh. Updated the post title, description, and remaining wording to align with the supported model.
- The IstioOperator snippets used different `global.meshID` values for each cluster and also set `spec.meshConfig.meshId`. Updated both clusters to use the same `global.meshID` value and removed the redundant meshConfig field from the installation examples.
- The east-west gateway commands included `--mesh` and `--cluster`. The current official workflow only requires `--network`; the upstream script keeps those flags only as no-op compatibility flags. Updated the commands to the current documented form.
- The Gateway example used `networking.istio.io/v1beta1`. Updated it to the current `networking.istio.io/v1` API version used by the official Istio examples.
- The verification steps deployed only the HelloWorld workload in the remote cluster. Istio's official verification guide notes that the Kubernetes Service must exist in each cluster so DNS lookup succeeds from either side. Added commands to create the sample namespace in both clusters and apply the HelloWorld Service in both clusters before deploying the remote v2 workload.
- The ServiceEntry section implied that Kubernetes services should be explicitly federated with a ServiceEntry. For Istio multicluster service discovery, remote secrets provide endpoint discovery, while `MeshConfig.serviceSettings` is the documented way to keep services cluster-local or allow specific cross-cluster exceptions. Replaced the ServiceEntry example with a `serviceSettings` example.
- The TLS troubleshooting note said different root CAs could be fixed later with cross-mesh trust. Updated it to match Istio multicluster requirements: clusters must trust each other, commonly through a common root CA with per-cluster intermediates.

## Review Notes
The post is now technically aligned with Istio's supported multi-primary multicluster model rather than a vendor-specific mesh federation API.
