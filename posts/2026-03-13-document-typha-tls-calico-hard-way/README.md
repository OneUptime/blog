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
| Typha CA | CN=Calico Typha CA | Self | 2027-03-13 | calico-typha-ca (typhaca.crt) | kube-system |
| Typha Server | CN=calico-typha | CN=Calico Typha CA | 2027-03-13 | calico-typha-certs (typha.crt) | kube-system |
| calico/node Client | CN=calico-node | CN=Calico Typha CA | 2027-03-13 | calico-node-certs (calico-node.crt) | kube-system |
```

Generate the current state with:

```bash
echo "=== calico-typha-ca ==="
kubectl get configmap calico-typha-ca -n kube-system \
  -o jsonpath='{.data.typhaca\.crt}' | \
  openssl x509 -noout -subject -issuer -enddate

echo "=== calico-typha-certs ==="
kubectl get secret calico-typha-certs -n kube-system \
  -o jsonpath='{.data.typha\.crt}' | base64 -d | \
  openssl x509 -noout -subject -issuer -enddate

echo "=== calico-node-certs ==="
kubectl get secret calico-node-certs -n kube-system \
  -o jsonpath='{.data.calico-node\.crt}' | base64 -d | \
  openssl x509 -noout -subject -issuer -enddate
```

## Certificate Rotation Runbook

```markdown
## Typha TLS Certificate Rotation Runbook

**Trigger:** Certificate within 30 days of expiry OR security incident

**Prerequisites:**
- Access to /etc/calico/pki/ on the control plane
- kubectl access to the cluster with edit permissions on kube-system namespace
- Calico Typha CA private key (/etc/calico/pki/typhaca.key)

**Rotation Steps:**

1. Generate new server certificate
   openssl req -newkey rsa:4096 -keyout typha.key -nodes -out typha.csr -subj "/CN=calico-typha"
   openssl x509 -req -in typha.csr -CA typhaca.crt -CAkey typhaca.key -CAcreateserial -out typha.crt -days 365

2. Update the Kubernetes Secret
   kubectl create secret generic calico-typha-certs -n kube-system --from-file=typha.key --from-file=typha.crt --dry-run=client -o yaml | kubectl apply -f -

3. Restart Typha
   kubectl rollout restart deployment/calico-typha -n kube-system
   kubectl rollout status deployment/calico-typha -n kube-system

4. Verify connections recovered
   # Wait 60 seconds, then check connection count if Typha metrics are enabled
   kubectl exec -n kube-system deployment/calico-typha -- wget -qO- http://localhost:9091/metrics | grep typha_connections_active

5. Update certificate inventory (above)

**Estimated time:** 15 minutes
**Risk:** Brief Felix reconnection during Typha restart (~30 seconds)
```

## Security Audit Evidence Template

For compliance audits, document the following:

```markdown
## Typha TLS Security Controls - Audit Evidence

**mTLS Enforcement:**
- Typha requires client certificates: YES
  Evidence: TYPHA_CAFILE, TYPHA_SERVERCERTFILE, TYPHA_SERVERKEYFILE configured
  Command: kubectl get deployment calico-typha -n kube-system -o yaml | grep TYPHA_CA

**CN Verification:**
- Client CN enforcement: YES
  Required CN: calico-node
  Evidence: TYPHA_CLIENTCN=calico-node configured
  Command: kubectl get deployment calico-typha -n kube-system -o yaml | grep TYPHA_CLIENTCN

**Certificate Validity:**
- Server cert expiry: [run: kubectl get secret calico-typha-certs ...]
- Client cert expiry: [run: kubectl get secret calico-node-certs ...]

**CA Key Protection:**
- CA key location: /etc/calico/pki/typhaca.key (control plane only)
- CA key permissions: 600 (root-owned)
- CA key NOT in Kubernetes Secret: CONFIRMED
```

## Troubleshooting Quick Reference for On-Call

```bash
# Typha TLS quick diagnosis (copy-paste for on-call use; connection check requires Typha metrics)

echo "=== Cert Expiry ===" && \
  kubectl get secret calico-typha-certs -n kube-system -o jsonpath='{.data.typha\.crt}' | base64 -d | openssl x509 -enddate -noout && \
  kubectl get secret calico-node-certs -n kube-system -o jsonpath='{.data.calico-node\.crt}' | base64 -d | openssl x509 -enddate -noout && \
echo "=== CA Match ===" && \
  CA=$(mktemp); T=$(mktemp); N=$(mktemp); \
  kubectl get configmap calico-typha-ca -n kube-system -o jsonpath='{.data.typhaca\.crt}' > "$CA"; \
  kubectl get secret calico-typha-certs -n kube-system -o jsonpath='{.data.typha\.crt}' | base64 -d > "$T"; \
  kubectl get secret calico-node-certs -n kube-system -o jsonpath='{.data.calico-node\.crt}' | base64 -d > "$N"; \
  openssl verify -CAfile "$CA" "$T" "$N"; rm -f "$CA" "$T" "$N" && \
echo "=== Connections ===" && \
  kubectl exec -n kube-system deployment/calico-typha -- wget -qO- http://localhost:9091/metrics | grep typha_connections_active
```

## Conclusion

Typha TLS documentation that includes a live certificate inventory, a step-by-step rotation runbook, security audit evidence formatted for compliance teams, and a copy-paste on-call quick reference serves all the operational and security audiences that interact with Typha's TLS configuration. Keeping this documentation updated after every certificate rotation and security review makes it a reliable source of truth rather than a static document that quickly falls out of date.
