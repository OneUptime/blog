# Validation Summary: Securing Typha Scaling in Calico the Hard Way

## Status
validated

## Post Type
Tutorial / Guide (hands-on hardening walkthrough)

## Technologies Covered
- Calico (v3.27.0)
- Calico Typha (sync port 5473, health port 9098)
- Calico Felix
- Kubernetes RBAC (ClusterRole, scale subresource)
- Kubernetes PodDisruptionBudget (policy/v1)
- Kubernetes Audit Policy (audit.k8s.io)
- mTLS / X.509 certificates via OpenSSL
- Prometheus metrics (kube-state-metrics)

## Sources Consulted
- Calico Typha configuration reference — https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Typha config_params.go (v3.27.0) — https://github.com/projectcalico/calico/blob/v3.27.0/typha/pkg/config/config_params.go
- Calico Felix config_params.go (v3.27.0) — https://github.com/projectcalico/calico/blob/v3.27.0/felix/config/config_params.go
- Calico FelixConfiguration CRD (v3.27.0) — https://github.com/projectcalico/calico/blob/v3.27.0/libcalico-go/config/crd/crd.projectcalico.org_felixconfigurations.yaml
- Calico "Secure Typha communications" guide — https://docs.tigera.io/calico/latest/operations/comms/crypto-auth
- Kubernetes Audit Logging — https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes RBAC (subresource auth) — https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes PodDisruptionBudget — https://kubernetes.io/docs/concepts/workloads/pods/disruptions/

## Issues Found

1. **Wrong Typha env var name (`TYPHA_CLIENTCA`)** — The Typha config struct field is `CAFile`, so the env var is `TYPHA_CAFILE`. `TYPHA_CLIENTCA` does not exist in Typha and would be silently ignored, leaving Typha with no client CA to verify Felix certs. **Fix:** Renamed to `TYPHA_CAFILE` in the Typha Deployment manifest.

2. **Felix TLS configured via the wrong resource** — The post placed Felix's Typha TLS settings (`typhaCaFile`, `typhaClientCertFile`, `typhaClientKeyFile`, `typhaServerCN`) in a `FelixConfiguration` CRD. These fields do not exist in the FelixConfiguration CRD schema; Felix reads Typha TLS settings from environment variables on the calico-node container (`FELIX_TYPHACAFILE`, `FELIX_TYPHACERTFILE`, `FELIX_TYPHAKEYFILE`, `FELIX_TYPHACN`). As written, `calicoctl apply` would either reject the unknown fields or accept them as no-ops, and mTLS would never engage on the Felix side. **Fix:** Replaced the FelixConfiguration snippet with a `calico-node` DaemonSet patch that sets the four `FELIX_TYPHA*` env vars and mounts the `calico-felix-tls` Secret at `/calico-secrets`. Updated the apply command to `kubectl apply`.

## Review Notes
- The OpenSSL commands do not include `extendedKeyUsage=clientAuth` on the Felix client cert or `extendedKeyUsage=serverAuth` on the Typha server cert. Go's `crypto/tls` does honor EKU extensions when present; some strict TLS validators reject certs missing the appropriate EKU. Calico typically works without explicit EKUs in practice, but adding them via `-addext` (or a config file) would be more defensive.
- Calico v3.27.0 is the pinned image tag; v3.28+ has shipped since. The configuration shown remains valid for v3.27+.
- The PodDisruptionBudget uses `minAvailable: 2` in the example but the Best Practices section recommends `replicas - 1` — the example value happens to satisfy that rule for `replicas: 3` but readers should adjust if they change replica count.
- The audit policy fragment is a single rule meant to be inserted into a full `audit.k8s.io/v1` Policy; the surrounding `apiVersion`/`kind`/`rules:` wrapper is assumed to already exist, which the comment makes clear.
- The jq filter for auditing broad bindings (`select(.roleRef.name | test("edit|admin|cluster-admin"))`) is a useful heuristic but will miss custom-named roles that grant equivalent permissions — worth flagging to readers, though not technically incorrect.
