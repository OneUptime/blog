# Validation Summary: How to Configure Primary-Remote Multicluster Deployment in Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio multicluster
- Istio primary-remote topology
- Kubernetes
- istioctl
- IstioOperator
- Istio east-west gateways
- Istio certificate authority configuration
- Prometheus metrics

## Sources Consulted
- Istio Install Primary-Remote: https://istio.io/latest/docs/setup/install/multicluster/primary-remote/
- Istio Install Primary-Remote on different networks: https://istio.io/latest/docs/setup/install/multicluster/primary-remote_multi-network/
- Istio Verify the installation: https://istio.io/latest/docs/setup/install/multicluster/verify/
- Istio Plug in CA Certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio expose-istiod sample: https://raw.githubusercontent.com/istio/istio/master/samples/multicluster/expose-istiod.yaml
- Istio expose-services sample: https://raw.githubusercontent.com/istio/istio/master/samples/multicluster/expose-services.yaml
- Istio gen-eastwest-gateway sample: https://raw.githubusercontent.com/istio/istio/master/samples/multicluster/gen-eastwest-gateway.sh

## Issues Found
- The certificate generation used raw OpenSSL commands that did not create the same CA file set and certificate chain expected by Istio's `cacerts` secret. Replaced it with Istio's documented `Makefile.selfsigned.mk` workflow and updated the secret creation commands to use `ca-cert.pem`, `ca-key.pem`, `root-cert.pem`, and `cert-chain.pem` from the generated per-cluster directories.
- The primary cluster configuration omitted `values.global.externalIstiod: true`, which is required for the primary control plane to serve remote clusters. Added the setting to the primary `IstioOperator`.
- The multicluster namespace topology metadata was missing. Added the `topology.istio.io/network` labels for both clusters and the `topology.istio.io/controlPlaneClusters` annotation for the remote cluster namespace.
- The east-west gateway configuration was hand-written and did not match Istio's documented primary-remote multi-network flow. Replaced it with `samples/multicluster/gen-eastwest-gateway.sh` and `samples/multicluster/expose-istiod.yaml`.
- The different-network setup did not install an east-west gateway for the remote cluster or expose cross-network service traffic. Added the documented remote gateway installation and `samples/multicluster/expose-services.yaml` application.

## Review Notes
The post now follows Istio's current primary-remote multi-network installation sequence. In production, Istio recommends using a production-ready CA and considering DNS-based `injectionURL` with properly signed certificates instead of relying only on `remotePilotAddress` for demonstrations.
