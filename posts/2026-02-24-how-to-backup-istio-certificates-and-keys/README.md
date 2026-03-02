# How to Backup Istio Certificates and Keys

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Certificate, Security, Backup, mTLS

Description: Learn how to safely backup and manage Istio CA certificates, root certificates, and signing keys for disaster recovery and multi-cluster deployments.

---

Certificates are the foundation of Istio's security model. Every mTLS connection in your mesh depends on the certificate chain that starts at the root CA. If you lose your CA certificates and keys, you lose the ability to issue new workload certificates, and existing certificates will eventually expire with no way to renew them. That means your entire mesh stops working.

Backing up Istio certificates isn't optional for production environments. Here's how to do it properly.

## Understanding Istio's Certificate Hierarchy

Istio uses a certificate hierarchy with three levels:

1. **Root CA certificate** - The trust anchor for the entire mesh
2. **Intermediate CA certificate** - Used by Istiod to sign workload certificates
3. **Workload certificates** - Short-lived certificates for each proxy

By default, Istio generates a self-signed root CA at installation time. This is stored in a Kubernetes secret. If you're using a custom CA (which production environments should), you've already provided these certificates.

## Finding Your Certificates

First, identify where your certificates are stored:

```bash
# Check for custom CA certificates
kubectl get secret cacerts -n istio-system
kubectl get secret istio-ca-secret -n istio-system

# Check which one Istiod is using
kubectl logs deploy/istiod -n istio-system | grep -i "ca\|cert" | head -20
```

If `cacerts` exists, you're using custom CA certificates (also called "plug-in CA"). If only `istio-ca-secret` exists, Istiod generated a self-signed CA at startup.

## Backing Up Custom CA Certificates (cacerts)

If you're using custom CA certificates:

```bash
mkdir -p istio-cert-backup

# Export each file from the secret
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | base64 -d > istio-cert-backup/ca-cert.pem
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.ca-key\.pem}' | base64 -d > istio-cert-backup/ca-key.pem
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.root-cert\.pem}' | base64 -d > istio-cert-backup/root-cert.pem
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.cert-chain\.pem}' | base64 -d > istio-cert-backup/cert-chain.pem

# Verify the files
openssl x509 -in istio-cert-backup/ca-cert.pem -text -noout | head -20
openssl x509 -in istio-cert-backup/root-cert.pem -text -noout | head -20
```

## Backing Up Self-Signed CA (istio-ca-secret)

If Istio generated its own CA:

```bash
mkdir -p istio-cert-backup

# The self-signed CA secret has different key names
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | base64 -d > istio-cert-backup/ca-cert.pem
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-key\.pem}' | base64 -d > istio-cert-backup/ca-key.pem

# Verify
openssl x509 -in istio-cert-backup/ca-cert.pem -text -noout | head -20
```

## Exporting the Full Secret

For a complete backup including all metadata:

```bash
# Full secret export (includes all fields)
kubectl get secret cacerts -n istio-system -o yaml > istio-cert-backup/cacerts-secret.yaml

# Or for self-signed
kubectl get secret istio-ca-secret -n istio-system -o yaml > istio-cert-backup/istio-ca-secret.yaml
```

Clean the exported secret of cluster-specific metadata:

```bash
# Remove cluster-specific fields
python3 << 'EOF'
import yaml

with open('istio-cert-backup/cacerts-secret.yaml', 'r') as f:
    secret = yaml.safe_load(f)

for field in ['resourceVersion', 'uid', 'creationTimestamp', 'managedFields']:
    secret['metadata'].pop(field, None)

with open('istio-cert-backup/cacerts-secret-clean.yaml', 'w') as f:
    yaml.dump(secret, f, default_flow_style=False)
EOF
```

## Securing the Backup

CA private keys need to be protected. If someone gets your CA key, they can issue certificates for any identity in your mesh.

```bash
# Encrypt the backup with GPG
tar czf istio-cert-backup.tar.gz istio-cert-backup/
gpg --symmetric --cipher-algo AES256 istio-cert-backup.tar.gz

# The encrypted file
ls istio-cert-backup.tar.gz.gpg

# Delete the unencrypted files
rm -rf istio-cert-backup istio-cert-backup.tar.gz
```

Store the encrypted backup in a secure location:
- Hardware Security Module (HSM)
- Cloud KMS (AWS KMS, GCP KMS, Azure Key Vault)
- Encrypted S3 bucket with restricted access
- Offline storage (USB drive in a safe)

```bash
# Example: Upload to encrypted S3 bucket
aws s3 cp istio-cert-backup.tar.gz.gpg \
  s3://my-secure-backups/istio/certs/$(date +%Y%m%d).tar.gz.gpg \
  --sse aws:kms \
  --sse-kms-key-id arn:aws:kms:us-east-1:123456789:key/abc-def-ghi
```

## Checking Certificate Expiration

Knowing when your certificates expire is crucial for planning rotations and backups:

```bash
#!/bin/bash
# check-istio-cert-expiry.sh

echo "=== Istio Certificate Expiration ==="

# Check CA cert
echo "CA Certificate:"
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | \
  base64 -d | openssl x509 -enddate -noout

# Check root cert
echo "Root Certificate:"
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.root-cert\.pem}' | \
  base64 -d | openssl x509 -enddate -noout

# Check a workload certificate
echo "Sample Workload Certificate:"
istioctl proxy-config secret deploy/my-app -n default -o json | \
  python3 -c "
import json, sys, base64, subprocess
data = json.load(sys.stdin)
for secret in data.get('dynamicActiveSecrets', []):
    if 'default' in secret.get('name', ''):
        cert_chain = secret['secret']['tlsCertificate']['certificateChain']['inlineBytes']
        cert_pem = base64.b64decode(cert_chain)
        result = subprocess.run(['openssl', 'x509', '-enddate', '-noout'], input=cert_pem, capture_output=True)
        print(result.stdout.decode())
        break
"
```

## Automated Certificate Backup

Set up a CronJob to back up certificates regularly:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cert-backup
  namespace: istio-system
spec:
  schedule: "0 0 * * 0"  # Weekly
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cert-backup
          containers:
            - name: backup
              image: bitnami/kubectl:latest
              command:
                - /bin/bash
                - -c
                - |
                  # Export certificates
                  mkdir -p /backup/certs

                  kubectl get secret cacerts -n istio-system -o yaml > /backup/certs/cacerts.yaml 2>/dev/null
                  kubectl get secret istio-ca-secret -n istio-system -o yaml > /backup/certs/istio-ca-secret.yaml 2>/dev/null

                  # Check expiration
                  if kubectl get secret cacerts -n istio-system > /dev/null 2>&1; then
                    EXPIRY=$(kubectl get secret cacerts -n istio-system \
                      -o jsonpath='{.data.ca-cert\.pem}' | base64 -d | \
                      openssl x509 -enddate -noout)
                    echo "CA cert expiry: $EXPIRY"
                  fi

                  echo "Certificate backup completed"
              volumeMounts:
                - name: backup
                  mountPath: /backup
          restartPolicy: OnFailure
          volumes:
            - name: backup
              persistentVolumeClaim:
                claimName: cert-backup-pvc
```

RBAC for the CronJob:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cert-backup
  namespace: istio-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cert-backup
  namespace: istio-system
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cert-backup
  namespace: istio-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cert-backup
subjects:
  - kind: ServiceAccount
    name: cert-backup
    namespace: istio-system
```

## Restoring Certificates

To restore certificates on a new or repaired cluster:

```bash
# Decrypt the backup
gpg --decrypt istio-cert-backup.tar.gz.gpg > istio-cert-backup.tar.gz
tar xzf istio-cert-backup.tar.gz

# Create the namespace first
kubectl create namespace istio-system

# Restore the secret
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=istio-cert-backup/ca-cert.pem \
  --from-file=ca-key.pem=istio-cert-backup/ca-key.pem \
  --from-file=root-cert.pem=istio-cert-backup/root-cert.pem \
  --from-file=cert-chain.pem=istio-cert-backup/cert-chain.pem

# Install Istio (it will use the existing cacerts secret)
istioctl install -f istiooperator.yaml
```

## Verification After Restore

Confirm that the restored certificates are being used:

```bash
# Check Istiod is using the correct CA
kubectl logs deploy/istiod -n istio-system | grep -i "ca\|cert" | head -10

# Verify a workload can get a certificate
kubectl exec deploy/my-app -c istio-proxy -- \
  curl -s localhost:15000/certs | python3 -m json.tool

# Test mTLS connection
kubectl exec deploy/sleep -- curl -s http://httpbin.default:8080/get
```

Certificate backup is non-negotiable for production Istio deployments. Without it, a control plane failure or cluster loss means your entire mesh security is gone. Keep the backups encrypted, store them safely, and test the restoration process regularly.
