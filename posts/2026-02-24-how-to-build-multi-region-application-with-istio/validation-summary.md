# Validation Summary: How to Build Multi-Region Application with Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio multi-cluster service mesh
- IstioOperator installation configuration
- Istio east-west gateways
- Istio remote secrets and endpoint discovery
- Istio DestinationRule locality failover
- Kubernetes Deployments, Services, Namespaces, and Secrets
- Kubernetes DNS and ingress routing
- TLS certificates for Istio CA

## Sources Consulted
- Istio official documentation: Install Multi-Primary on different networks - https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio official documentation: Before you begin for multicluster installation - https://istio.io/latest/docs/setup/install/multicluster/before-you-begin/
- Istio official documentation: Plug in CA Certificates - https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio official documentation: Locality failover - https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/failover/
- Istio official documentation: Multi-cluster Traffic Management - https://istio.io/latest/docs/ops/configuration/traffic-management/multicluster/
- Istio official command reference: istioctl proxy-config endpoint - https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The certificate generation example used ad hoc OpenSSL commands that did not create the full Istio-recommended CA artifact set with the expected certificate extensions. Replaced it with Istio's official `tools/certs/Makefile.selfsigned.mk` flow for generating root and intermediate CA files.
- The certificate-generation snippet changed into the `certs` directory but later certificate-secret commands referenced `certs/<cluster>/...`, which would be wrong if the shell stayed inside `certs`. Added `pushd` and `popd` so the later paths are correct.
- The post did not label the `istio-system` namespace with `topology.istio.io/network`, which Istio's multi-primary multi-network setup requires when the namespace already exists. Added explicit namespace labels for all three clusters.
- The IstioOperator network names did not match the east-west gateway network names. Updated the IstioOperator examples to use `us-east-1-network`, `us-west-1-network`, and `eu-west-1-network` consistently.
- The verification command inspected `deploy/my-service`; Istio's command reference uses `[type/]<name>` and endpoint checks are more useful from the client proxy. Changed it to inspect the `sleep` test pod's proxy endpoints.
- The verification wording said normal calls could reach local and remote endpoints. With locality load balancing enabled, healthy local endpoints should be preferred. Updated the wording to reflect the expected behavior.

## Review Notes
The article is technically valid after the fixes. For production, the east-west gateway should be protected by network controls and should not be exposed through a Layer 7 load balancer, and production certificates should normally come from a production-grade CA rather than the demo self-signed Makefile.
