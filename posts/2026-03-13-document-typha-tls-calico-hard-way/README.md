# How to Document Typha TLS in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, TLS, Documentation, Security, Hard Way

Description: A guide to creating effective documentation for Typha TLS in a manually installed Calico cluster, including certificate inventory, rotation runbooks, and security audit evidence.

---

## Introduction

Typha TLS documentation serves three purposes: operational guidance for engineers who manage certificate lifecycle, security audit evidence for compliance teams, and incident response reference for on-call engineers who need to quickly diagnose TLS failures. Structuring the documentation to serve all three purposes requires a certificate inventory, rotation runbook, test results, and a troubleshooting quick reference.

## Certificate Inventory Template

Maintain a current certificate inventory in your team wiki. Update it after every rotation.

```markdown
## Typha TLS Certificate Inventory

Last updated: 2026-03-13
Updated by: platform-team

| Certificate | Subject | Issuer | Not After | Secret Name | Namespace |
|-------------|---------|--------|-----------|-------------|-----------|
| Typha CA | CN=calico-typha-ca | Self | 2035-03-13 | calico-typha-tls (ca.crt) | calico-system |
| Typha Server | CN=calico-typha | CN=calico-typha-ca | 2027-03-13 | calico-typha-tls (tls.crt) | calico-system |
| Felix Client | CN=calico-felix | CN=calico-typha-ca | 2027-03-13 | calico-felix-typha-tls (tls.crt) | calico-system |
```

Generate the current state with:

```bash
for secret in calico-typha-tls calico-felix-typha-tls; do
  echo "=== $secret ==="
  kubectl get secret $secret -n calico-system \
    -o jsonpath='{.data.tls\.crt}' | base64 -d | \
    openssl x509 -noout -subject -issuer -enddate
done
```

## Certificate Rotation Runbook

```markdown
## Typha TLS Certificate Rotation Runbook

**Trigger:** Certificate within 30 days of expiry OR security incident

**Prerequisites:**
- Access to /etc/calico/pki/ on the control plane
- kubectl access to the cluster with edit permissions on calico-system namespace
- Calico CA private key (/etc/calico/pki/typha-ca.key)

**Rotation Steps:**

1. Generate new server certificate
   openssl req -newkey rsa:4096 -keyout typha-server-new.key ...
   openssl x509 -req -in typha-server-new.csr ...

2. Update the Kubernetes Secret
   kubectl create secret generic calico-typha-tls ... --dry-run=client | kubectl apply -f -

3. Restart Typha
   kubectl rollout restart deployment/calico-typha -n calico-system
   kubectl rollout status deployment/calico-typha -n calico-system

4. Verify connections recovered
   # Wait 60 seconds, then check connection count
   kubectl exec -n calico-system deployment/calico-typha -- wget -qO- http://localhost:9093/metrics | grep typha_connections_active

5. Update certificate inventory (above)

**Estimated time:** 15 minutes
**Risk:** Brief Felix reconnection during Typha restart (~30 seconds)
```

## Security Audit Evidence Template

For compliance audits, document the following:

```markdown
## Typha TLS Security Controls — Audit Evidence

**mTLS Enforcement:**
- Typha requires client certificates: YES
  Evidence: TYPHA_CAFILE, TYPHA_SERVERCERTFILE, TYPHA_SERVERKEYFILE configured
  Command: kubectl get deployment calico-typha -n calico-system -o yaml | grep TYPHA_CA

**CN Verification:**
- Client CN enforcement: YES
  Required CN: calico-felix
  Evidence: TYPHA_CLIENTCN=calico-felix configured
  Command: kubectl get deployment calico-typha -n calico-system -o yaml | grep TYPHA_CLIENTCN

**Minimum TLS Version:**
- TLS 1.3 required: YES
  Evidence: TYPHA_MINTLSVERSION=VersionTLS13
  Command: kubectl get deployment calico-typha -n calico-system -o yaml | grep TYPHA_MINTLS

**Certificate Validity:**
- Server cert expiry: [run: kubectl get secret calico-typha-tls ...]
- Client cert expiry: [run: kubectl get secret calico-felix-typha-tls ...]

**CA Key Protection:**
- CA key location: /etc/calico/pki/typha-ca.key (control plane only)
- CA key permissions: 600 (root-owned)
- CA key NOT in Kubernetes Secret: CONFIRMED
```

## Troubleshooting Quick Reference for On-Call

```bash
# Typha TLS quick diagnosis (copy-paste for on-call use)
echo "=== Cert Expiry ===" && \
  kubectl get secret calico-typha-tls -n calico-system -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -enddate -noout && \
echo "=== CA Match ===" && \
  T=$(kubectl get secret calico-typha-tls -n calico-system -o jsonpath='{.data.ca\.crt}'); \
  F=$(kubectl get secret calico-felix-typha-tls -n calico-system -o jsonpath='{.data.ca\.crt}'); \
  [ "$T" = "$F" ] && echo "MATCH" || echo "MISMATCH" && \
echo "=== Connections ===" && \
  kubectl exec -n calico-system deployment/calico-typha -- wget -qO- http://localhost:9093/metrics | grep typha_connections_active
```

## Conclusion

Typha TLS documentation that includes a live certificate inventory, a step-by-step rotation runbook, security audit evidence formatted for compliance teams, and a copy-paste on-call quick reference serves all the operational and security audiences that interact with Typha's TLS configuration. Keeping this documentation updated after every certificate rotation and security review makes it a reliable source of truth rather than a static document that quickly falls out of date.
