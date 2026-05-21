# Validation Summary: How to Configure mTLS for Cross-Cluster Communication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio multicluster mesh
- Mutual TLS
- Kubernetes
- OpenSSL certificates
- Istio Gateway
- Istio PeerAuthentication
- Istio AuthorizationPolicy

## Sources Consulted
- Istio documentation: Install Multi-Primary on different networks, https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio documentation: Verify the installation, https://istio.io/latest/docs/setup/install/multicluster/verify/
- Istio documentation: Plug in CA Certificates, https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio reference: AuthorizationPolicy, https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio reference: PeerAuthentication, https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio sample manifest: expose-services.yaml, https://raw.githubusercontent.com/istio/istio/master/samples/multicluster/expose-services.yaml

## Issues Found
- The multi-network setup omitted the `topology.istio.io/network` labels on the `istio-system` namespace. Added the label commands because Istio's multi-network installation guide uses these labels to define each cluster's network.
- The east-west gateway install examples put `--context` after `install`. Updated the commands to the documented `istioctl --context=... install -y -f -` form.
- The verification workflow deployed sample workloads without creating and labeling a sidecar-injected namespace. Updated the commands to create and label the `sample` namespace before deploying workloads.
- The HelloWorld verification commands did not deploy the service and versions in the same namespace used for the request. Updated them to deploy `helloworld` and `curl` in the `sample` namespace and to call `helloworld.sample:5000/hello`, matching the official multicluster verification pattern.
- The `istioctl proxy-config secret` example targeted a deployment instead of a concrete injected pod. Updated it to resolve the `curl` pod and pass the namespace.

## Review Notes
The certificate secret file names, `cacerts` usage, east-west `AUTO_PASSTHROUGH` gateway, remote secret direction, `PeerAuthentication` API version, and `AuthorizationPolicy` principal format align with current Istio documentation. The OpenSSL certificate generation commands are suitable for a tutorial, but production deployments should use a managed or offline CA process as recommended by Istio.
