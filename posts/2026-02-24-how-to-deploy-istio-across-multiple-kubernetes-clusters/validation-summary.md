# Validation Summary: How to Deploy Istio Across Multiple Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- istioctl
- kubectl
- OpenSSL / Istio CA certificates
- Prometheus / PromQL

## Sources Consulted
- Istio Install Multicluster documentation: https://istio.io/latest/docs/setup/install/multicluster/
- Istio Multi-Primary on different networks documentation: https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio Verify multicluster installation documentation: https://istio.io/latest/docs/setup/install/multicluster/verify/
- Istio Plug in CA Certificates documentation: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The original OpenSSL commands generated intermediate certificates without the full Istio-recommended CA configuration and certificate chain layout. Replaced them with Istio's documented `tools/certs/Makefile.selfsigned.mk` workflow and updated the `cacerts` secret paths accordingly.
- The post created `istio-system` before installing Istio but did not label that namespace with `topology.istio.io/network`. Added the documented namespace labels for `network1` and `network2` so the multi-network topology is recognized correctly.
- The verification example deployed a remote-only `nginx` service and an uninjected curl pod in the `default` namespace. Updated it to use Istio's documented HelloWorld and curl samples, enable sidecar injection, create the service in both clusters for DNS, and deploy different versions in each cluster to verify cross-cluster traffic.
- Updated the locality-aware routing example host and resource name to match the corrected HelloWorld verification service.

## Review Notes
- The post now follows Istio 1.30 documentation for sidecar-mode multicluster installation. The east-west gateway script still accepts `--mesh` and `--cluster` for compatibility, but current Istio documentation only requires `--network` for this flow.
- Production deployments should use a production CA and tighter exposure controls for east-west gateways; the post's examples remain appropriate as a tutorial baseline.
