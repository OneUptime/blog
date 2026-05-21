# Validation Summary: How to Set Up Flat Network Multi-Cluster Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio sidecar mode multi-cluster
- Kubernetes multi-cluster networking
- IstioOperator installation configuration
- Istio remote secrets
- Kubernetes Deployments and Services
- OpenSSL certificate generation

## Sources Consulted
- Istio official documentation: Install Multi-Primary, https://istio.io/latest/docs/setup/install/multicluster/multi-primary/
- Istio official documentation: Before you begin for multicluster installs, https://istio.io/latest/docs/setup/install/multicluster/before-you-begin/
- Istio official documentation: Plug in CA Certificates, https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio official documentation: Verify the multicluster installation, https://istio.io/latest/docs/setup/install/multicluster/verify/
- Istio official documentation: Install Multi-Primary on different networks, https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio official source: certificate Makefile behavior for `cert-chain.pem`, https://raw.githubusercontent.com/istio/istio/master/tools/certs/Makefile.selfsigned.mk

## Issues Found
- The custom CA commands created intermediate certificates without CA extensions and used only the intermediate certificate as `cert-chain.pem`. Updated the OpenSSL commands to generate CA certificates with appropriate CA extensions and to build each cluster's `cert-chain.pem` from the intermediate certificate plus the root certificate, matching Istio's expected `cacerts` secret inputs.
- The flat-network installation examples set `global.network` to an empty string. Updated both clusters to use the same explicit network name, `network1`, which matches Istio's documented same-network multi-primary configuration.
- The verification flow deployed the `helloworld` Service only in `cluster2`, while Istio's multicluster verification requires the Service object in each cluster so DNS lookup works from either cluster. Updated the commands to create the Service in both clusters, then deploy the v2 workload in `cluster2`.
- The load-balancing step implied that deploying only the Service in both clusters would create cross-cluster load balancing. Updated it to deploy a v1 workload in `cluster1` so both clusters have healthy endpoints behind the `helloworld` Service.
- The troubleshooting section said port `15443` must be open for mTLS traffic. That port is for Istio east-west gateway traffic in different-network topologies, not direct flat-network pod-to-pod traffic. Updated the note to say pod CIDRs and destination application ports must be reachable across clusters.

## Review Notes
The tutorial now matches Istio's current same-network multi-primary model. The examples still assume sidecar mode and automatic sidecar injection; ambient multicluster has separate setup and verification requirements.
