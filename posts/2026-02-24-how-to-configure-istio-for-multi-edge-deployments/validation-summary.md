# Validation Summary: How to Configure Istio for Multi-Edge Deployments

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- Istio sidecar mode
- Istio multicluster and multi-network deployments
- IstioOperator configuration
- Istio east-west gateways
- Istio remote secrets
- Istio CA certificate plug-in support
- Kubernetes, kubectl, and Kustomize
- OpenSSL certificate generation
- Prometheus/Istio standard metrics

## Sources Consulted
- Istio multicluster installation overview: https://istio.io/latest/docs/setup/install/multicluster/
- Istio multi-primary on different networks guide: https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio primary-remote guide: https://istio.io/latest/docs/setup/install/multicluster/primary-remote/
- Istio plug-in CA certificates task: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio `istioctl create-remote-secret` command reference: https://istio.io/latest/docs/reference/commands/istioctl/#istioctl-create-remote-secret
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kustomize API types reference for deprecated `patchesStrategicMerge`: https://pkg.go.dev/sigs.k8s.io/kustomize/api/types

## Issues Found
- The OpenSSL intermediate certificate commands did not set CA extensions or build the Istio `cert-chain.pem` as a chain. Updated the root and intermediate commands to include CA constraints/key usages and to generate a per-site certificate chain containing the intermediate and root certificates.
- The Istio installation flow created `istio-system` before installation but did not label it with `topology.istio.io/network`. Added the namespace label command, matching Istio multi-network setup requirements.
- The remote secret examples did not specify the source kubeconfig context. Added `--context` to each `istioctl create-remote-secret` command so the secret is generated from the intended cluster.
- The Kustomize example used deprecated `patchesStrategicMerge`. Replaced it with the current `patches` field.
- The locality load balancing example configured both `distribute` and `failover`, but Istio allows only one of `distribute`, `failover`, or `failoverPriority`. Removed `distribute`, clarified the locality label assumption, and updated the explanation to describe failover behavior.
- The monitoring example implied that setting `ISTIO_META_CLUSTER_ID` in proxy metadata is what creates cluster labels on standard metrics. Updated the example to use `values.global.multiCluster.clusterName`, which Istio documents as the source for standard metric cluster labels.

## Review Notes
The post now aligns with Istio 1.30 documentation. `istioctl` was not installed locally, so CLI behavior was verified against the official Istio command reference rather than local help output. YAML snippets were parsed successfully with PyYAML, and the revised OpenSSL CA flow was smoke-tested locally.
