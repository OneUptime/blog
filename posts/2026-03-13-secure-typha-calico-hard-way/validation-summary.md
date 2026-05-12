# Validation Summary: How to Secure Typha in a Calico Hard Way Installation

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Calico (Typha component)
- Felix (Calico per-node agent)
- Kubernetes (Deployments, ClusterRoles, NetworkPolicy, Secrets, securityContext)
- mTLS / TLS certificates (OpenSSL)
- kubectl / calicoctl CLI tooling

## Sources Consulted
- Calico Typha component docs: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Felix configuration reference (TyphaCAFile, TyphaCertFile, TyphaKeyFile): https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico mTLS for Typha-Felix: https://docs.tigera.io/calico/latest/operations/comms/crypto-auth
- Kubernetes NetworkPolicy API (networking.k8s.io/v1): https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#networkpolicy-v1-networking-k8s-io
- Kubernetes SecurityContext reference: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- kubectl rollout / patch / create secret docs: https://kubernetes.io/docs/reference/kubectl/
- OpenSSL x509 command reference (-enddate, -noout): https://www.openssl.org/docs/man3.0/man1/openssl-x509.html
- BusyBox wget (supports `--timeout` in recent BusyBox releases): https://busybox.net/

## Issues Found
1. **Typo in FelixConfiguration field name (line 36).** The post listed `tymphaCertFile` as an expected field. The correct field is `typhaCertFile` (alongside `typhaCAFile` and `typhaKeyFile`). Fixed in place.
2. **Wrong Typha service name in Step 6 (line 141).** The post probed `typha-svc.calico-system.svc.cluster.local:5473`. The Calico Typha Service in `calico-system` is named `calico-typha`, so the FQDN should be `calico-typha.calico-system.svc.cluster.local:5473`. Fixed in place.

## Review Notes
- The post uses the `calico-system` namespace and `calico-typha`/`calico-node` labels, which match the operator-installed Calico layout. A "hard way" manifest install conventionally uses the `kube-system` namespace, but the labels and resource names referenced are consistent with each other throughout the post, so the steps remain coherent — readers running a manifest install should mentally substitute their actual namespace.
- The Typha metrics port `9093` (PrometheusMetricsPort default) and the Typha sync port `5473` referenced in the NetworkPolicy are correct.
- The `runAsUser: 1000` choice in Step 5 is illustrative; the actual UID baked into the Calico Typha image may differ between releases — operators should verify the image's expected non-root UID before applying the patch in production.
- `busybox` `wget` long-flag support for `--timeout` varies by BusyBox build; on older images you may need `-T 5` instead. Not changed since the example is for verification and the failure (rejection) is the expected outcome regardless.
- Certificate rotation in Step 4 does not explicitly mention rotating the CA or coordinating Felix-side trust updates, which would matter for full CA rotations; left as-is since the post focuses on leaf cert rotation.
