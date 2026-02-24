# How to Create Runbook for Istio Security Incidents

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Runbook, Security, Incident Response

Description: A runbook for responding to security incidents in Istio service mesh including unauthorized access, certificate compromise, and policy violations.

---

Security incidents involving your service mesh require fast, precise action. Whether it is unauthorized service-to-service access, a compromised certificate, or a bypassed authorization policy, the response needs to be immediate and systematic. Unlike availability incidents where the goal is "get things working again," security incidents require containment first, investigation second, and remediation third.

This runbook covers the common security incident types you might encounter with Istio.

## Runbook: Istio Security Incidents

### Purpose
Respond to security incidents involving the Istio service mesh, including unauthorized access, certificate compromise, mTLS bypass, and policy violations.

### Severity Classification

| Severity | Description | Response |
|---|---|---|
| Critical | CA key compromised, mTLS bypassed mesh-wide | Immediate, all hands |
| High | Unauthorized service access, policy bypass | Within 15 minutes |
| Medium | Suspicious traffic patterns, policy misconfiguration | Within 1 hour |
| Low | Audit finding, non-compliant configuration | Within 24 hours |

### Incident Type 1: Unauthorized Service Access

A service is receiving traffic from a source that should be blocked by AuthorizationPolicy.

#### Triage

```bash
# Check which authorization policies apply to the affected service
kubectl get authorizationpolicies -n <namespace>

# View the specific policy
kubectl get authorizationpolicy <name> -n <namespace> -o yaml

# Check if policies are being enforced
istioctl proxy-config listener <affected-pod> -n <namespace> --port <port> -o json | \
  grep -A 20 "rbac"

# Check Envoy RBAC stats
kubectl exec <affected-pod> -n <namespace> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "rbac"
```

#### Immediate Containment

Apply a deny-all policy to the affected service:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: emergency-deny-all
  namespace: <namespace>
spec:
  selector:
    matchLabels:
      app: <affected-service>
  action: DENY
  rules:
    - {}
```

```bash
kubectl apply -f emergency-deny-all.yaml

# Verify the policy is in effect
kubectl exec <source-pod> -c <container> -- \
  curl -s -o /dev/null -w "%{http_code}" http://<affected-service>:<port>/
# Should return 403
```

#### Investigation

```bash
# Check access logs if enabled
kubectl logs <affected-pod> -n <namespace> -c istio-proxy | grep "rbac_access_denied\|rbac_allowed"

# Check the identity of the source
istioctl proxy-config secret <source-pod> -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -noout -subject

# Check PeerAuthentication mode
kubectl get peerauthentication --all-namespaces

# Look for PERMISSIVE mode that might allow plaintext traffic
kubectl get peerauthentication --all-namespaces -o json | \
  jq '.items[] | select(.spec.mtls.mode == "PERMISSIVE") | .metadata.name'
```

#### Remediation

Fix the authorization policy to properly restrict access:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: <service>-access
  namespace: <namespace>
spec:
  selector:
    matchLabels:
      app: <affected-service>
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/<allowed-ns>/sa/<allowed-sa>"]
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/*"]
```

Remove the emergency deny-all policy after the fix is verified:

```bash
kubectl delete authorizationpolicy emergency-deny-all -n <namespace>
```

### Incident Type 2: CA Certificate Compromise

If the Istio CA private key has been compromised, every workload certificate is potentially compromised.

#### Immediate Actions

```bash
# Step 1: Generate new CA certificates immediately
mkdir -p /tmp/new-ca && cd /tmp/new-ca

openssl req -newkey rsa:4096 -nodes -keyout root-key.pem \
  -x509 -days 3650 -out root-cert.pem \
  -subj "/O=Emergency/CN=Emergency Root CA"

openssl req -newkey rsa:4096 -nodes -keyout ca-key.pem \
  -out ca-csr.pem \
  -subj "/O=Emergency/CN=Emergency Intermediate CA"

openssl x509 -req -in ca-csr.pem -CA root-cert.pem -CAkey root-key.pem \
  -CAcreateserial -out ca-cert.pem -days 1825 \
  -extfile <(printf "basicConstraints=CA:TRUE\nkeyUsage=keyCertSign,cRLSign")

cat ca-cert.pem root-cert.pem > cert-chain.pem

# Step 2: Update the Kubernetes secret
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem --from-file=ca-key.pem \
  --from-file=root-cert.pem --from-file=cert-chain.pem \
  --dry-run=client -o yaml | kubectl apply -f -

# Step 3: Restart istiod to use new CA
kubectl rollout restart deployment/istiod -n istio-system
kubectl rollout status deployment/istiod -n istio-system --timeout=120s

# Step 4: Force all workloads to get new certificates
for ns in $(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  kubectl rollout restart deployment -n $ns
done

# Step 5: Enforce strict mTLS to prevent old certificates
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
EOF
```

#### Verification

```bash
# Verify all workloads have certificates from the new CA
for pod in $(kubectl get pods --all-namespaces -l security.istio.io/tlsMode=istio -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}'); do
  ns=$(echo $pod | cut -d/ -f1)
  name=$(echo $pod | cut -d/ -f2)
  issuer=$(istioctl proxy-config secret $name -n $ns -o json 2>/dev/null | \
    jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
    base64 -d 2>/dev/null | openssl x509 -noout -issuer 2>/dev/null)
  echo "$pod: $issuer"
done
```

### Incident Type 3: mTLS Bypass Detected

Traffic is flowing without mTLS in a namespace that should be STRICT.

#### Detection

```bash
# Check PeerAuthentication policies
kubectl get peerauthentication --all-namespaces -o yaml

# Check for plaintext traffic
kubectl exec <pod> -n <namespace> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "ssl\|tls"

# Look for non-mTLS connections
kubectl exec <pod> -n <namespace> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "cx_total\|cx_destroy"
```

#### Containment

```bash
# Enforce strict mTLS on the affected namespace
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: <namespace>
spec:
  mtls:
    mode: STRICT
EOF

# Verify enforcement
istioctl proxy-config listener <pod> -n <namespace> --port <port> -o json | \
  grep -i "tls\|require_client_certificate"
```

#### Investigation

Check for pods that might not have sidecars:

```bash
# Find pods without sidecars in meshed namespaces
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.metadata.namespace | test("istio-system") | not) | select(.spec.containers | length == 1) | "\(.metadata.namespace)/\(.metadata.name)"'

# Check for sidecar injection exceptions
kubectl get namespaces -l istio-injection=enabled
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.metadata.annotations["sidecar.istio.io/inject"] == "false") | "\(.metadata.namespace)/\(.metadata.name)"'
```

### Incident Type 4: Suspicious Traffic Patterns

Unusual traffic detected through access logs or metrics.

#### Investigation

```bash
# Check for unusual source identities
kubectl exec <pod> -n <namespace> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "downstream_cx"

# Review access logs for the affected period
kubectl logs <pod> -n <namespace> -c istio-proxy --since=1h | \
  grep -v "200\|health\|readyz" | head -50

# Check for high error rates from unexpected sources
# (via Prometheus)
```

```promql
# Unusual traffic sources
sum(rate(istio_requests_total{destination_service="<service>"}[5m])) by (source_workload)

# Error rates by source
sum(rate(istio_requests_total{destination_service="<service>", response_code!="200"}[5m])) by (source_workload, response_code)
```

#### Containment

Block specific source workloads:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-suspicious-source
  namespace: <namespace>
spec:
  selector:
    matchLabels:
      app: <target-service>
  action: DENY
  rules:
    - from:
        - source:
            namespaces: ["<suspicious-namespace>"]
```

### Post-Incident Procedures

1. **Preserve evidence**: Export logs, metrics screenshots, and configuration snapshots before cleaning up
2. **Timeline reconstruction**: Document exactly when the incident started, was detected, and was resolved
3. **Impact assessment**: Determine what data or services were affected
4. **Root cause analysis**: Why did the security control fail?
5. **Remediation plan**: What permanent changes prevent recurrence?
6. **Policy review**: Are authorization policies comprehensive enough?
7. **Audit**: Review all AuthorizationPolicy and PeerAuthentication resources mesh-wide

```bash
# Export a full mesh security audit
istioctl analyze --all-namespaces 2>&1 | tee security-audit.txt

# Export all security policies
kubectl get peerauthentication,authorizationpolicies --all-namespaces -o yaml > security-policies-backup.yaml
```

Security incidents in a service mesh should be treated with the same gravity as any other security breach. The mesh is your enforcement layer for zero-trust networking, and any failure in that layer needs thorough investigation and a permanent fix.
