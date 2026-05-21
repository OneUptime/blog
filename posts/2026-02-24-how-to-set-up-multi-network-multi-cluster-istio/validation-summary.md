# Validation Summary: How to Set Up Multi-Network Multi-Cluster Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Kubernetes
- Istio multicluster service mesh
- Istio east-west gateways
- IstioOperator configuration
- OpenSSL certificate generation
- kubectl and istioctl

## Sources Consulted
- Istio official documentation: Install Multi-Primary on different networks, https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio official documentation: Plug in CA Certificates, https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio official documentation: Verify the installation, https://istio.io/latest/docs/setup/install/multicluster/verify/
- Istio official release announcement: Istio 1.30.0, https://istio.io/latest/news/releases/1.30.x/announcing-1.30/

## Issues Found
- The traffic-flow explanation said the destination east-west gateway terminates mTLS. In Istio's `AUTO_PASSTHROUGH` east-west gateway setup, the gateway passes TLS through and routes the existing mTLS connection by SNI, so the wording was corrected.
- The prerequisite listed `istioctl` 1.20+, but Istio 1.20 is no longer a current supported release. This was changed to require a supported Istio release and matching `istioctl` version.
- The custom CA example generated intermediate certificates without CA extensions and used only the intermediate certificate as `cert-chain.pem`. The OpenSSL command now marks the intermediate as a CA, and the secret uses a chain file containing the intermediate and root certificate.
- The `istio-system` namespace was created without the required per-cluster network label. Explicit `topology.istio.io/network` labels were added before each cluster install.
- The verification commands used old `release-1.20` raw sample URLs and deployed `helloworld` only to cluster2. The commands now use samples from the local Istio release bundle and create the `helloworld` service in cluster1 so DNS and service discovery work as expected.

## Review Notes
The guide uses the sidecar-mode multi-primary topology. Istio also has ambient multicluster documentation, but that is a different deployment model and was not substituted into this post.
