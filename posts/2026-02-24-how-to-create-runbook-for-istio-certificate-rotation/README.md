# How to Create Runbook for Istio Certificate Rotation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Runbook, Certificate, mTLS

Description: A detailed runbook for rotating Istio root CA certificates, intermediate certificates, and workload certificates with zero-downtime procedures.

---

Certificate rotation in Istio is one of those tasks that sounds simple but can go very wrong if you do not follow the right steps. Workload certificates rotate automatically, which is great, but the root CA certificate does not. When it is time to rotate the CA, or when you need to switch from the self-signed CA to a custom one, you need a careful procedure to avoid breaking mTLS across the entire mesh.

This runbook covers all the certificate rotation scenarios you will encounter.

## Runbook: Istio Certificate Rotation

### Purpose
Rotate Istio certificates (root CA, intermediate CA, and workload certificates) with zero downtime and continuous mTLS connectivity.

### Understanding the Certificate Hierarchy

```
Root CA Certificate (10 year lifetime by default)
  └── Intermediate CA Certificate (signed by root, used by istiod)
        └── Workload Certificate (24 hour lifetime, auto-rotated)
```

- **Workload certificates**: Automatically rotated by istiod. No manual action needed.
- **Intermediate CA certificate**: Used by istiod to sign workload certificates. Must be manually rotated before expiry.
- **Root CA certificate**: The trust anchor. Rotation requires a careful multi-step process.

### Pre-Rotation Checks

```bash
# Check current CA certificate expiry
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | \
  base64 -d | openssl x509 -noout -dates -subject

# If using custom CA (cacerts secret)
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | \
  base64 -d | openssl x509 -noout -dates -subject

# Check root certificate
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.root-cert\.pem}' | \
  base64 -d | openssl x509 -noout -dates -subject

# Check a workload certificate
istioctl proxy-config secret <any-pod> -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -noout -dates

# Verify all workload certs are valid
istioctl proxy-config secret --all
```

### Scenario 1: Routine Workload Certificate Check

Workload certificates are rotated automatically, but you should verify the rotation is working:

```bash
# Check workload certificate validity across the mesh
for pod in $(kubectl get pods --all-namespaces -l security.istio.io/tlsMode=istio -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}' | head -20); do
  ns=$(echo $pod | cut -d/ -f1)
  name=$(echo $pod | cut -d/ -f2)
  echo "=== $pod ==="
  istioctl proxy-config secret $name -n $ns 2>/dev/null | grep -A2 "default"
done
```

If any workload certificate is not being rotated, restart the affected pod:

```bash
kubectl delete pod <pod-name> -n <namespace>
```

### Scenario 2: Switching from Self-Signed to Custom CA

#### Step 1: Generate the Custom CA Certificates

```bash
# Create a working directory
mkdir -p istio-certs && cd istio-certs

# Generate root CA key and certificate
openssl req -newkey rsa:4096 -nodes -keyout root-key.pem \
  -x509 -days 3650 -out root-cert.pem \
  -subj "/O=MyOrg/CN=Root CA"

# Generate intermediate CA key and CSR
openssl req -newkey rsa:4096 -nodes -keyout ca-key.pem \
  -out ca-csr.pem \
  -subj "/O=MyOrg/CN=Istio Intermediate CA"

# Sign the intermediate CA with the root CA
openssl x509 -req -in ca-csr.pem -CA root-cert.pem -CAkey root-key.pem \
  -CAcreateserial -out ca-cert.pem -days 1825 \
  -extfile <(printf "basicConstraints=CA:TRUE\nkeyUsage=keyCertSign,cRLSign")

# Create the certificate chain
cat ca-cert.pem root-cert.pem > cert-chain.pem

# Verify the chain
openssl verify -CAfile root-cert.pem ca-cert.pem
```

#### Step 2: Create the Kubernetes Secret

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=ca-cert.pem \
  --from-file=ca-key.pem=ca-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=cert-chain.pem
```

#### Step 3: Restart istiod to Pick Up the New CA

```bash
kubectl rollout restart deployment/istiod -n istio-system
kubectl rollout status deployment/istiod -n istio-system --timeout=120s
```

#### Step 4: Restart Workloads to Get New Certificates

Rolling restart all meshed workloads so they receive certificates signed by the new CA:

```bash
MESHED_NS=$(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}')

for ns in $MESHED_NS; do
  echo "Restarting deployments in namespace: $ns"
  kubectl rollout restart deployment -n $ns
  kubectl rollout status deployment --all -n $ns --timeout=300s
  sleep 5
done
```

#### Step 5: Verify New Certificates

```bash
# Verify workloads have certificates signed by the new CA
istioctl proxy-config secret <pod-name> -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -noout -issuer

# Should show the new intermediate CA as the issuer
```

### Scenario 3: Root CA Rotation

Root CA rotation is the most sensitive operation because you need both the old and new roots trusted simultaneously during the transition.

#### Step 1: Generate New Root and Intermediate CA

```bash
# Generate new root CA
openssl req -newkey rsa:4096 -nodes -keyout new-root-key.pem \
  -x509 -days 3650 -out new-root-cert.pem \
  -subj "/O=MyOrg/CN=Root CA v2"

# Generate new intermediate CA signed by the new root
openssl req -newkey rsa:4096 -nodes -keyout new-ca-key.pem \
  -out new-ca-csr.pem \
  -subj "/O=MyOrg/CN=Istio Intermediate CA v2"

openssl x509 -req -in new-ca-csr.pem -CA new-root-cert.pem -CAkey new-root-key.pem \
  -CAcreateserial -out new-ca-cert.pem -days 1825 \
  -extfile <(printf "basicConstraints=CA:TRUE\nkeyUsage=keyCertSign,cRLSign")

cat new-ca-cert.pem new-root-cert.pem > new-cert-chain.pem
```

#### Step 2: Create Combined Root Certificate

Both old and new roots must be trusted during the transition:

```bash
# Combine old and new root certificates
cat root-cert.pem new-root-cert.pem > combined-root-cert.pem
```

#### Step 3: Update the Secret with Combined Roots

```bash
# Update the cacerts secret with new intermediate but COMBINED roots
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=new-ca-cert.pem \
  --from-file=ca-key.pem=new-ca-key.pem \
  --from-file=root-cert.pem=combined-root-cert.pem \
  --from-file=cert-chain.pem=new-cert-chain.pem \
  --dry-run=client -o yaml | kubectl apply -f -
```

#### Step 4: Restart istiod

```bash
kubectl rollout restart deployment/istiod -n istio-system
kubectl rollout status deployment/istiod -n istio-system --timeout=120s
```

#### Step 5: Rolling Restart All Workloads

```bash
# Restart workloads namespace by namespace
for ns in $(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  echo "=== Restarting $ns ==="
  kubectl rollout restart deployment -n $ns
  kubectl rollout status deployment --all -n $ns --timeout=300s

  # Verify mTLS connectivity after each namespace
  echo "Verifying connectivity..."
  sleep 10
done
```

#### Step 6: Remove Old Root (After Full Rotation)

Once all workloads have been restarted and are using the new certificates:

```bash
# Update the secret to use only the new root
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=new-ca-cert.pem \
  --from-file=ca-key.pem=new-ca-key.pem \
  --from-file=root-cert.pem=new-root-cert.pem \
  --from-file=cert-chain.pem=new-cert-chain.pem \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart istiod again
kubectl rollout restart deployment/istiod -n istio-system

# One more rolling restart of workloads
for ns in $(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  kubectl rollout restart deployment -n $ns
  kubectl rollout status deployment --all -n $ns --timeout=300s
done
```

### Monitoring During Rotation

Watch these metrics during any certificate rotation:

```promql
# Certificate rotation errors
citadel_server_csr_count
citadel_server_success_cert_issuance_count
citadel_server_csr_parsing_err_count

# Workload certificate expiry
envoy_server_days_until_first_cert_expiring

# mTLS connection errors (should not spike)
istio_requests_total{response_code="503", response_flags="UF"}
```

```bash
# Watch for certificate-related errors in real time
kubectl logs -n istio-system deploy/istiod -f | grep -i "cert\|csr\|sign"
```

### Rollback Procedure

If mTLS breaks during rotation:

```bash
# Restore the old CA secret from backup
kubectl apply -f cacerts-backup.yaml

# Restart istiod
kubectl rollout restart deployment/istiod -n istio-system

# Restart all workloads
kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}' | \
  xargs -I {} kubectl rollout restart deployment -n {}

# As a last resort, switch to permissive mTLS
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
EOF
```

### Maintenance Schedule

| Certificate | Default Lifetime | Rotation Frequency | Automation |
|---|---|---|---|
| Workload certs | 24 hours | Automatic | Built into Istio |
| Intermediate CA | 5 years | Annually recommended | Manual (or cert-manager) |
| Root CA | 10 years | Every 3-5 years | Manual |

Set calendar reminders for CA rotation at least 6 months before expiry. Certificate expiry is one of the most common causes of mesh outages, and it is completely preventable with proper planning.
