# How to Rotate mTLS Certificates Without Downtime in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Certificate Rotation, Security, Kubernetes

Description: Rotate mTLS certificates in Istio without causing service disruptions using automatic rotation, custom CA integration, and graceful rollover strategies.

---

Certificate rotation is one of those things that sounds scary but Istio actually handles really well. In a service mesh with mTLS, every workload has a certificate that identifies it. These certificates expire, and when they do, they need to be replaced. If the rotation goes wrong, services cannot authenticate with each other and you get a mesh-wide outage.

The good news is that Istio has built-in automatic certificate rotation. The bad news is that there are scenarios where you need to manage it yourself, like when rotating your root CA or integrating with an external certificate authority.

## How Istio Certificate Lifecycle Works

Every workload in the Istio mesh gets an X.509 certificate issued by Istiod (the Istio control plane). The process works like this:

1. The Envoy sidecar generates a private key and Certificate Signing Request (CSR)
2. The istio-agent (pilot-agent) sends the CSR to Istiod
3. Istiod signs the CSR using its CA and returns the certificate
4. The sidecar uses the certificate for mTLS with other sidecars
5. Before the certificate expires, the agent requests a new one

By default, workload certificates are valid for 24 hours and are automatically rotated when 80% of their lifetime has passed (roughly every 19 hours).

## Checking Current Certificate Status

See what certificate a workload is using:

```bash
istioctl proxy-config secret deploy/my-service -n default
```

This shows the certificate chain, expiration time, and the SPIFFE identity. You can also get more details:

```bash
istioctl proxy-config secret deploy/my-service -n default -o json | jq '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain'
```

To check the actual certificate details:

```bash
kubectl exec deploy/my-service -n default -c istio-proxy -- cat /var/run/secrets/istio/cert-chain.pem | openssl x509 -text -noout
```

## Adjusting Certificate Lifetime

If the default 24-hour lifetime is too short or too long, you can change it. Shorter lifetimes are more secure (less time for a stolen certificate to be useful) but increase the frequency of rotation.

Set the workload certificate TTL in the Istio mesh configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        SECRET_TTL: "12h"
```

Or set it per-workload with an annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          proxyMetadata:
            SECRET_TTL: "6h"
```

## Rotating the Root CA Certificate

This is the more involved scenario. When you need to rotate the root CA that Istiod uses to sign workload certificates, you need to be careful because all workloads trust the current root CA. If you switch to a new root CA abruptly, existing workload certificates (signed by the old CA) will not be trusted by workloads that only know about the new CA.

The safe approach involves an overlap period where both the old and new root CAs are trusted.

### Step 1: Generate the New Root CA

```bash
# Generate new root CA key and certificate
openssl req -x509 -newkey rsa:4096 -keyout new-root-key.pem -out new-root-cert.pem -days 3650 -nodes -subj "/O=my-org/CN=my-new-root-ca"
```

### Step 2: Create a Combined CA Bundle

Create a certificate bundle that includes both the old and new root CAs:

```bash
cat old-root-cert.pem new-root-cert.pem > combined-root-cert.pem
```

### Step 3: Update the CA Secret with the Combined Bundle

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=old-ca-cert.pem \
  --from-file=ca-key.pem=old-ca-key.pem \
  --from-file=root-cert.pem=combined-root-cert.pem \
  --from-file=cert-chain.pem=old-cert-chain.pem \
  --dry-run=client -o yaml | kubectl apply -f -
```

The `root-cert.pem` now contains both CAs, so workloads will trust certificates signed by either.

### Step 4: Restart Istiod

```bash
kubectl rollout restart deployment/istiod -n istio-system
kubectl rollout status deployment/istiod -n istio-system
```

### Step 5: Wait for All Workloads to Get New Trust Bundles

The combined trust bundle needs to propagate to all sidecars. This happens automatically but takes time:

```bash
# Check a workload to see if it has the new trust bundle
kubectl exec deploy/my-service -n default -c istio-proxy -- cat /var/run/secrets/istio/root-cert.pem | openssl x509 -text -noout | grep "Issuer"
```

Wait until all workloads have received the updated trust bundle. You can monitor this by checking certificates across your deployments.

### Step 6: Switch to the New CA for Signing

Now update the secret to use the new CA for signing while keeping the combined trust bundle:

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=new-ca-cert.pem \
  --from-file=ca-key.pem=new-root-key.pem \
  --from-file=root-cert.pem=combined-root-cert.pem \
  --from-file=cert-chain.pem=new-cert-chain.pem \
  --dry-run=client -o yaml | kubectl apply -f -
```

Restart Istiod again:

```bash
kubectl rollout restart deployment/istiod -n istio-system
```

New workload certificates will be signed by the new CA. Old certificates (signed by the old CA) are still trusted because of the combined trust bundle.

### Step 7: Wait for All Certificates to Rotate

Wait for all workload certificates to be renewed (which happens automatically within one certificate lifetime period):

```bash
# Check when certificates were last issued
for pod in $(kubectl get pods -n default -o name); do
  echo "$pod:"
  kubectl exec $pod -n default -c istio-proxy -- cat /var/run/secrets/istio/cert-chain.pem 2>/dev/null | openssl x509 -noout -dates
done
```

### Step 8: Remove the Old CA from the Trust Bundle

Once all certificates have been renewed with the new CA:

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=new-ca-cert.pem \
  --from-file=ca-key.pem=new-root-key.pem \
  --from-file=root-cert.pem=new-root-cert.pem \
  --from-file=cert-chain.pem=new-cert-chain.pem \
  --dry-run=client -o yaml | kubectl apply -f -
```

Restart Istiod one final time:

```bash
kubectl rollout restart deployment/istiod -n istio-system
```

## Using cert-manager Integration

For automated CA management, you can integrate Istio with cert-manager using the istio-csr project:

```bash
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --set installCRDs=true
helm install istio-csr jetstack/cert-manager-istio-csr --namespace cert-manager
```

With this setup, cert-manager handles CA rotation and certificate issuance, and Istio's workload certificates are managed through cert-manager's renewal pipeline.

## Monitoring Certificate Health

Set up alerts for certificate expiration:

```yaml
# Prometheus alert
groups:
  - name: istio-cert-alerts
    rules:
      - alert: IstioCertExpiringSoon
        expr: (citadel_server_root_cert_expiry_timestamp - time()) < 2592000
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Istio root cert expires in less than 30 days"
```

Check certificate expiry across the mesh:

```bash
istioctl proxy-config secret --all -n default | grep "Not After"
```

## Troubleshooting

If services start failing after a rotation:

```bash
# Check for certificate errors
kubectl logs deploy/istiod -n istio-system | grep -i "cert\|tls\|error"

# Check a sidecar for TLS handshake failures
kubectl logs deploy/my-service -n default -c istio-proxy | grep "TLS\|handshake\|certificate"

# Verify the trust chain
istioctl proxy-config secret deploy/my-service -n default -o json
```

## Summary

Istio's automatic certificate rotation handles the day-to-day workload certificate lifecycle without any intervention. The situation that requires careful planning is root CA rotation, where the overlapping trust bundle approach ensures zero downtime. The key is to never remove the old trust anchor until all workload certificates have been renewed with the new CA. For production environments, consider using cert-manager integration to automate the entire certificate lifecycle.
