# Validation Summary: How to Secure Calico FIPS Mode

## Status
validated

## Post Type
Tutorial / Hardening Guide

## Technologies Covered
- Calico (Project Calico / Tigera Operator)
- Kubernetes (NetworkPolicy, RBAC, Role/RoleBinding)
- cert-manager (Certificate CRD)
- External Secrets Operator (ExternalSecret CRD)
- FIPS / TLS cryptographic compliance
- Go runtime (GODEBUG environment variable)

## Sources Consulted
- Tigera/Calico docs — component metrics ports: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Go GODEBUG reference: https://go.dev/doc/godebug
- Go TLS 1.3 default-on history (issue tracker): https://github.com/golang/go/issues/30055
- Go RSA key-exchange removal: https://github.com/golang/go/issues/63413
- External Secrets Operator v1.0.0 release notes: https://github.com/external-secrets/external-secrets/releases/tag/v1.0.0
- cert-manager Certificate resource (privateKey fields): https://cert-manager.io/docs/usage/certificate/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found

1. **Obsolete Go GODEBUG flag `tls13=1`** — The `GODEBUG=...,tls13=1` value was used to enable TLS 1.3 in Go 1.12 (opt-in), became the default in Go 1.13, and the knob was removed in Go 1.14. Setting it on a modern Go runtime (which the Tigera Operator uses) is a no-op. **Fix:** Removed `,tls13=1` from the GODEBUG value, leaving the still-meaningful `tlsrsakex=0` (which disables legacy RSA key-exchange cipher suites — the modern Go default that can be explicitly affirmed).

2. **Wrong Typha Prometheus port (9094)** — The post's NetworkPolicy comment labels port `9094` as "Typha metrics". Typha's Prometheus metrics endpoint is **not** 9094 (that port is associated with `calico-kube-controllers` metrics). Operator-installed Calico exposes Typha metrics on **9093** (the operator sets `TYPHA_PROMETHEUSMETRICSPORT=9093`); the upstream default in some manifests is 9091. **Fix:** Changed `9094` → `9093` to match the operator-managed deployment context the post describes.

3. **Outdated External Secrets Operator API version** — The post uses `apiVersion: external-secrets.io/v1beta1`. External Secrets Operator released v1.0.0 in November 2025, and `external-secrets.io/v1` is now the GA API. v1beta1 is still served by 0.16.x but is the legacy version. **Fix:** Changed `external-secrets.io/v1beta1` → `external-secrets.io/v1`.

4. **Broken RoleBinding — referenced `ClusterRole` for a `Role`** — Section 4 defines `kind: Role` (namespace-scoped) named `calico-tls-secrets-viewer`, but the matching `RoleBinding` had `roleRef.kind: ClusterRole`. Kubernetes would resolve this to a non-existent cluster-scoped object named `calico-tls-secrets-viewer` and the binding would fail to grant any permissions. (RoleBindings can legally reference a `ClusterRole`, but only when one exists with that name — here, only a `Role` was defined.) **Fix:** Changed `roleRef.kind: ClusterRole` → `roleRef.kind: Role`.

## Review Notes

- The `tlsrsakex=0` GODEBUG value matches the modern Go default (RSA key-exchange cipher suites disabled). Keeping it is harmless and serves as documentation; it does not, however, "enforce TLS 1.2 minimum" as the prose suggests. True TLS minimum-version enforcement in Go requires setting `tls.Config.MinVersion` in code — GODEBUG cannot do this. Future iterations of this post would benefit from clarifying that the GODEBUG knobs affirm cipher-suite defaults rather than impose a TLS version floor.
- The Mermaid diagram, FelixConfiguration snippet, cert-manager Certificate (ECDSA P-256, valid `size: 256`), and NetworkPolicy structure are otherwise correct.
- The `RoleBinding` name `deny-default-secrets-access` is slightly misleading — the binding *grants* the `calico-typha` ServiceAccount read access on the listed secrets; it does not in itself deny anything (Kubernetes RBAC is purely additive / default-deny). Not changed since the resource is functionally valid as written.
- Calico `fipsMode: Enabled` is set on the operator-managed `Installation` resource (not on `FelixConfiguration`); the Prerequisites section is correct as stated but readers may want to consult Tigera docs for the exact `Installation` field placement.
