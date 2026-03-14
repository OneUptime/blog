# How to Handle Certificate Renewal Without Downtime in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Certificate Renewal, Zero Downtime, MTLS, Operations

Description: Techniques for renewing certificates in Istio without causing service disruptions, including workload cert rotation, CA cert rotation, and gateway certificate updates.

---

Certificate renewal is inevitable. Whether it is the short-lived workload certificates that Istio rotates every 24 hours, the intermediate CA certificate that expires yearly, or the gateway TLS certificate that needs updating, you need to handle renewals without dropping connections or causing outages.

## Workload Certificate Renewal (Automatic)

For the day-to-day workload certificates, Istio handles renewal automatically and you do not need to do anything. The process works like this:

1. The istio-agent watches the certificate expiration time
2. At around 80% of the certificate lifetime, it generates a new CSR
3. It sends the CSR to istiod
4. istiod signs the new certificate and returns it
5. The istio-agent pushes the new certificate to Envoy via SDS (Secret Discovery Service)
6. Envoy starts using the new certificate for new connections
7. Existing connections continue using the old certificate until they close naturally

This whole process is seamless. No connections are dropped, and no pods need to be restarted.

Verify that automatic rotation is working:

```bash
# Watch SDS updates
kubectl logs <pod-name> -c istio-proxy -f | grep -i "sds\|secret"

# Check current certificate validity
istioctl proxy-config secret <pod-name> -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -dates -noout
```

## Intermediate CA Certificate Renewal

Renewing the intermediate CA certificate (the one istiod uses to sign workload certs) requires more care. The goal is to ensure that workloads with certificates signed by the old CA and workloads with certificates signed by the new CA can still communicate.

### Step 1: Generate the New Intermediate CA

```bash
# Generate new intermediate CA key
openssl genrsa -out new-ca-key.pem 4096

# Generate CSR
openssl req -new -key new-ca-key.pem -out new-ca-csr.pem \
  -subj "/O=MyOrg/CN=Istio Intermediate CA v2"

# Sign with the same root CA
openssl x509 -req -in new-ca-csr.pem \
  -CA root-cert.pem -CAkey root-key.pem -CAcreateserial \
  -out new-ca-cert.pem -days 1825 \
  -extfile <(printf "basicConstraints=critical,CA:TRUE,pathlen:0\nkeyUsage=critical,keyCertSign,cRLSign")

# Create the new cert chain
cat new-ca-cert.pem root-cert.pem > new-cert-chain.pem
```

### Step 2: Update the cacerts Secret

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=new-ca-cert.pem \
  --from-file=ca-key.pem=new-ca-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=new-cert-chain.pem \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Step 3: Restart istiod

```bash
kubectl rollout restart deployment/istiod -n istio-system
kubectl rollout status deployment/istiod -n istio-system
```

### Step 4: Rolling Restart Workloads

Since the root CA has not changed, both old and new workload certificates are trusted. But you still want all workloads to get certificates signed by the new intermediate CA:

```bash
# Restart workloads namespace by namespace
for ns in $(kubectl get ns -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  echo "Restarting deployments in $ns"
  kubectl rollout restart deployment -n "$ns"
  kubectl rollout status deployment -n "$ns" --timeout=300s
done
```

The key point here is that because both the old and new intermediate CA certificates are signed by the same root CA, there is no trust break during the transition. A workload with an old certificate can still verify a workload with a new certificate, and vice versa.

## Root CA Certificate Renewal

Root CA renewal is the trickiest operation because it changes the trust anchor. You need a dual trust period where both roots are trusted.

### Step 1: Generate the New Root CA

```bash
openssl genrsa -out new-root-key.pem 4096
openssl req -new -x509 -key new-root-key.pem -out new-root-cert.pem \
  -days 3650 -subj "/O=MyOrg/CN=MyOrg Root CA v2" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign"
```

### Step 2: Generate New Intermediate CA Signed by New Root

```bash
openssl genrsa -out new-ca-key.pem 4096
openssl req -new -key new-ca-key.pem -out new-ca-csr.pem \
  -subj "/O=MyOrg/CN=Istio Intermediate CA v2"
openssl x509 -req -in new-ca-csr.pem \
  -CA new-root-cert.pem -CAkey new-root-key.pem -CAcreateserial \
  -out new-ca-cert.pem -days 1825 \
  -extfile <(printf "basicConstraints=critical,CA:TRUE,pathlen:0\nkeyUsage=critical,keyCertSign,cRLSign")
```

### Step 3: Create Combined Root Trust Bundle

```bash
# Combine old and new root certificates
cat new-root-cert.pem old-root-cert.pem > combined-root-cert.pem

# Create cert chain
cat new-ca-cert.pem new-root-cert.pem > new-cert-chain.pem
```

### Step 4: Update the Secret with Combined Trust

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=new-ca-cert.pem \
  --from-file=ca-key.pem=new-ca-key.pem \
  --from-file=root-cert.pem=combined-root-cert.pem \
  --from-file=cert-chain.pem=new-cert-chain.pem \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Step 5: Restart istiod and All Workloads

```bash
kubectl rollout restart deployment/istiod -n istio-system
kubectl rollout status deployment/istiod -n istio-system

# Wait for all root cert ConfigMaps to be updated
sleep 30

# Restart all workloads
for ns in $(kubectl get ns -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  kubectl rollout restart deployment -n "$ns"
done
```

### Step 6: Remove the Old Root (After Full Rotation)

Once all workloads have been restarted and have new certificates, update the trust bundle to remove the old root:

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=new-ca-cert.pem \
  --from-file=ca-key.pem=new-ca-key.pem \
  --from-file=root-cert.pem=new-root-cert.pem \
  --from-file=cert-chain.pem=new-cert-chain.pem \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl rollout restart deployment/istiod -n istio-system
```

## Gateway Certificate Renewal

For TLS certificates on the ingress gateway (the public-facing ones), the renewal depends on how you manage them.

### With cert-manager (Automatic)

If you use cert-manager with Let's Encrypt, renewal is automatic. cert-manager updates the Kubernetes secret, and Istio's ingress gateway picks up the new certificate via SDS:

```bash
# Check if the secret was updated
kubectl get secret api-example-com-tls -n istio-system -o jsonpath='{.metadata.resourceVersion}'

# Verify the gateway picked up the new cert
kubectl exec -n istio-system deploy/istio-ingressgateway -- \
  curl -s localhost:15000/certs | python3 -m json.tool
```

### Manual Certificate Update

If you manage gateway certificates manually:

```bash
# Update the TLS secret
kubectl create secret tls api-example-com-tls \
  --cert=new-cert.pem \
  --key=new-key.pem \
  -n istio-system \
  --dry-run=client -o yaml | kubectl apply -f -
```

Istio's SDS automatically detects the secret change and pushes the new certificate to the gateway. No restart needed.

## Verifying Zero Downtime

During any certificate renewal, verify that traffic is flowing without errors:

```bash
# Monitor error rates during renewal
kubectl exec <test-pod> -- \
  sh -c 'while true; do curl -s -o /dev/null -w "%{http_code}\n" http://my-api:8080/health; sleep 0.5; done'

# Watch for TLS errors in proxy logs
kubectl logs <pod-name> -c istio-proxy -f | grep -i "tls\|ssl\|certificate"
```

If you see 503 errors or TLS failures during renewal, it usually means the trust bundle was not properly updated before restarting workloads.

## Best Practices

1. Always maintain the combined trust bundle during transitions
2. Restart workloads gradually, not all at once
3. Monitor error rates throughout the renewal process
4. Test the renewal process in staging before production
5. Keep certificate expiration dates in your operational calendar
6. Use automation (cert-manager) wherever possible

Certificate renewal without downtime is achievable as long as you maintain trust continuity. The combined trust bundle approach ensures that old and new certificates can coexist during the transition window.
