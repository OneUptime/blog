# Validation Summary: How to Set Up Multi-Cluster Service Mesh on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Linkerd multicluster
- Linkerd Gateway API traffic routing
- Istio multicluster
- Istio CA certificates
- Istio DestinationRule locality failover
- Kubernetes Gateway API HTTPRoute

## Sources Consulted
- Linkerd Getting Started: https://linkerd.io/2.18/getting-started/
- Linkerd Multi-cluster communication: https://linkerd.io/2.18/tasks/multicluster/
- Linkerd Installing Multi-cluster Components: https://linkerd.io/2.17/tasks/installing-multicluster/
- Linkerd multicluster CLI reference: https://linkerd.io/2.17/reference/cli/multicluster/
- Linkerd Traffic Shifting: https://linkerd.io/2/tasks/traffic-shifting/
- Linkerd Traffic Split deprecation notice: https://linkerd.io/2/features/traffic-split/
- Kubernetes Gateway API HTTP traffic splitting: https://gateway-api.sigs.k8s.io/guides/traffic-splitting/
- Istio Install Multi-Primary: https://istio.io/latest/docs/setup/install/multicluster/multi-primary/
- Istio Multicluster Before You Begin: https://istio.io/latest/docs/setup/install/multicluster/before-you-begin/
- Istio Plug in CA Certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio Deployment Models: https://istio.io/latest/docs/ops/deployment/deployment-models/
- Istio Locality Failover: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/failover/
- Talos Linux Getting Started: https://www.talos.dev/v1.5/introduction/getting-started/

## Issues Found
- The prerequisites omitted required tooling and Linkerd's Gateway API CRD requirement. Added Linkerd CLI, `istioctl`, `step`, `openssl`, `make`, and Gateway API CRDs, and clarified the network assumptions for the examples.
- The Linkerd traffic splitting example used SMI `TrafficSplit`, which is deprecated for current Linkerd. Replaced it with a Gateway API `HTTPRoute` using weighted `backendRefs`.
- The Istio multicluster section mixed a generic gateway-capable description with a single-network multi-primary install. Clarified that the shown Istio install is for a single-network mesh and that different-network clusters require east-west gateways and separate network names.
- The Istio certificate commands generated files that did not match Istio's expected `cacerts` secret layout and did not create `cert-chain.pem`. Replaced them with Istio's documented `Makefile.selfsigned.mk` workflow and updated the secret paths.
- The Istio installation example only installed cluster 1. Added the cluster 2 `cacerts` secret and `istioctl install` command with `clusterName: cluster2`.
- The Istio load balancing example showed only a Deployment, but Istio multicluster service discovery requires a Kubernetes Service entry for DNS/service discovery. Added a matching Service manifest.
- The Istio failover `DestinationRule` used an older API version and only configured outlier detection. Updated it to `networking.istio.io/v1`, used the service FQDN, and added locality failover settings consistent with Istio's locality failover documentation.
- The Linkerd monitoring command targeted `deploy/backend-api-cluster2`, but the mirrored object is a Service. Changed it to `svc/backend-api-cluster2`.

## Review Notes
The guide remains a high-level setup walkthrough. A future revision could add complete different-network Istio east-west gateway commands, but the current post is technically accurate for the single-network Istio example and the gateway-based Linkerd example it shows.
