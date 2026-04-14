# How to Export Dapr mTLS Root Certificates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, mTLS, Certificate, Security, Kubernetes

Description: Export Dapr root CA and issuer certificates for backup, cross-cluster trust federation, or external verification of mTLS certificates.

---

Exporting Dapr mTLS root certificates is necessary for backing up the certificate chain, federating trust across multiple clusters, or verifying that a workload certificate was issued by your Dapr Sentry. This guide covers extraction methods and use cases.

## Where Dapr Stores Root Certificates

Dapr stores the certificate bundle in a Kubernetes secret in the `dapr-system` namespace:

```bash
# View the secret structure
kubectl get secret dapr-trust-bundle -n dapr-system -o yaml
```

The secret contains three keys:
- `ca.crt` - root CA certificate (public key)
- `issuer.crt` - issuer certificate (public key)
- `issuer.key` - issuer private key (keep this secure!)

## Exporting the Root CA Certificate

```bash
# Export root CA certificate to a PEM file
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d > dapr-root-ca.crt

# Verify the exported certificate
openssl x509 -in dapr-root-ca.crt -noout -text | grep -E "Subject:|Issuer:|Not Before:|Not After:"
```

## Exporting the Issuer Certificate

```bash
# Export issuer certificate
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.issuer\.crt}' | base64 -d > dapr-issuer.crt

# Verify the certificate chain
openssl verify -CAfile dapr-root-ca.crt dapr-issuer.crt
```

## Exporting via Dapr CLI

The Dapr CLI provides a dedicated command:

```bash
# Export all certificates to the current directory
dapr mtls export -o ./certs

ls ./certs
# ca.crt  issuer.crt  issuer.key
```

## Use Case 1 - Certificate Backup

Store the exported certificates securely for disaster recovery:

```bash
# Create an encrypted backup
tar czf dapr-certs-backup-$(date +%Y%m%d).tar.gz ./certs
gpg --symmetric --cipher-algo AES256 dapr-certs-backup-$(date +%Y%m%d).tar.gz

# Upload to secure storage
aws s3 cp dapr-certs-backup-*.tar.gz.gpg s3://my-backup-bucket/dapr-certs/
```

## Use Case 2 - Cross-Cluster Trust Federation

To allow services in Cluster B to invoke services in Cluster A with mTLS, Cluster B needs to trust Cluster A's root CA:

```bash
# On Cluster A - export the root CA
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d > cluster-a-root.crt

# On Cluster B - export the existing trust bundle and append Cluster A's root CA
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d > combined-ca-bundle.crt
cat cluster-a-root.crt >> combined-ca-bundle.crt

# Update the ca.crt field with the combined bundle
kubectl patch secret dapr-trust-bundle -n dapr-system \
  --type='json' \
  -p='[{"op": "replace", "path": "/data/ca.crt", "value": "'$(base64 < combined-ca-bundle.crt | tr -d '\n')'"}]'
```

## Use Case 3 - Verifying a Workload Certificate

Verify that a certificate was issued by your Dapr Sentry:

```bash
# Extract a workload cert from a running sidecar (requires debug access)
kubectl exec deploy/order-service -c daprd -- \
  cat /var/run/secrets/dapr.io/tls/tls.crt > workload.crt

# Verify against the root CA
openssl verify -CAfile dapr-root-ca.crt -untrusted dapr-issuer.crt workload.crt
```

## Inspecting Certificate Details

```bash
# Show full certificate chain details
openssl x509 -in dapr-root-ca.crt -noout -text

# Show expiry date only
openssl x509 -in dapr-root-ca.crt -noout -enddate

# Show fingerprint for verification
openssl x509 -in dapr-root-ca.crt -noout -fingerprint -sha256
```

## Summary

Dapr root and issuer certificates are stored in the `dapr-trust-bundle` secret in the `dapr-system` namespace. Export them using `kubectl` or the `dapr mtls export` command for backup, cross-cluster trust federation, or certificate verification. Store private keys (especially `issuer.key`) encrypted and in secure storage - anyone with the issuer key can issue certificates trusted by your cluster.
