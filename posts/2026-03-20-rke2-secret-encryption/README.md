# How to Enable RKE2 Secret Encryption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Secret Encryption, Security, Encryption at Rest, Rancher

Description: Learn how to enable and manage secret encryption at rest in RKE2 to protect sensitive cluster data stored in etcd.

Kubernetes secrets are base64-encoded in API output by default, which provides no actual encryption - anyone with etcd access can recover the data if encryption at rest is not configured. RKE2 enables secret encryption at rest by default and provides a built-in mechanism to verify, configure, and rotate encryption keys. This guide covers the complete lifecycle of secret encryption in RKE2.

## Prerequisites

- RKE2 server cluster running
- Cluster admin access
- Understanding of AES encryption concepts

## Understanding RKE2 Secret Encryption

RKE2 uses the Kubernetes API server's encryption provider framework. On RKE2 server nodes:

1. New secrets are encrypted before being stored in etcd
2. RKE2 generates and manages the encryption provider configuration
3. Encryption uses AES-CBC with PKCS#7 padding by default, or `secretbox` on supported newer releases
4. Encryption keys can be rotated

## Step 1: Check Secret Encryption

RKE2 provides a built-in command to manage secret encryption:

```bash
# Check the status of RKE2-managed secret encryption
sudo rke2 secrets-encrypt status
```

## Step 2: Verify Encryption Status

```bash
# Check if encryption is enabled
sudo rke2 secrets-encrypt status

# Expected output when enabled:
# Encryption Status: Enabled
# Current Rotation Stage: start

# Check the encryption configuration file
sudo cat /var/lib/rancher/rke2/server/cred/encryption-config.json

# Verify the API server is using the generated encryption config
ps -ef | grep '[k]ube-apiserver' | grep -- --encryption-provider-config
```

## Step 3: Rotate and Re-encrypt Secrets

For current RKE2 releases, rotate keys and re-encrypt existing secrets with the built-in `rotate-keys` command:

```bash
# Create a snapshot before rotating encryption keys
sudo rke2 etcd-snapshot save

# Rotate the encryption keys and re-encrypt secrets
sudo rke2 secrets-encrypt rotate-keys

# Wait for re-encryption to finish
sudo rke2 secrets-encrypt status

# Expected final stage:
# Current Rotation Stage: reencrypt_finished

# In HA clusters, restart RKE2 servers one at a time after the rotation finishes
sudo systemctl restart rke2-server.service
```

## Step 4: Configure the Encryption Provider

RKE2 manages the encryption configuration automatically. On supported April 2025 and newer releases, you can choose the `secretbox` provider instead of the default `aescbc` provider. For FIPS clusters, keep the default `aescbc` provider.

```bash
# Add this on every server node
sudo mkdir -p /etc/rancher/rke2/config.yaml.d
cat <<EOF | sudo tee /etc/rancher/rke2/config.yaml.d/10-secrets-encryption-provider.yaml
secrets-encryption-provider: secretbox
EOF

# Restart servers one at a time, then rotate keys to migrate the provider
sudo systemctl restart rke2-server.service
sudo rke2 secrets-encrypt rotate-keys
```

## Step 5: Re-encrypt Existing Secrets After Manual Configuration

```bash
# If you manage a custom Kubernetes EncryptionConfiguration outside the RKE2 flow,
# re-write existing secrets so they are stored with the current provider.

kubectl get secrets --all-namespaces -o json | kubectl replace -f -

# Verify a specific secret is encrypted
# The raw etcd value should include a k8s:enc:<provider>:v1 prefix
# and should not expose the secret value in plaintext.
# Check using etcdctl
ETCD_CERT_DIR="/var/lib/rancher/rke2/server/tls/etcd"
ETCDCTL_API=3 \
/var/lib/rancher/rke2/bin/etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=${ETCD_CERT_DIR}/server-ca.crt \
  --cert=${ETCD_CERT_DIR}/client.crt \
  --key=${ETCD_CERT_DIR}/client.key \
  get /registry/secrets/default/my-secret | \
  hexdump -C | head -10

# Look for k8s:enc:aescbc:v1 or k8s:enc:secretbox:v1 in the output.
# If the secret value appears in plaintext, encryption is NOT working.
```

## Step 6: Rotate Encryption Keys

Periodically rotate encryption keys for security compliance:

```bash
# Current RKE2 releases
sudo rke2 etcd-snapshot save
sudo rke2 secrets-encrypt rotate-keys
sudo rke2 secrets-encrypt status

# Expected final stage:
# Current Rotation Stage: reencrypt_finished

# HA clusters: restart each server one at a time after rotation
sudo systemctl restart rke2-server.service
echo "Key rotation complete"
```

For older RKE2 releases that require the classic rotation flow:

```bash
sudo rke2 secrets-encrypt prepare
sudo systemctl restart rke2-server.service

sudo rke2 secrets-encrypt rotate
sudo systemctl restart rke2-server.service

sudo rke2 secrets-encrypt reencrypt
sudo rke2 secrets-encrypt status

# HA clusters: perform each restart step one server at a time
sudo systemctl restart rke2-server.service
echo "Key rotation complete"
```

## Step 7: Verify Encryption is Working

```bash
# Create a test secret
kubectl create secret generic test-encryption \
  --from-literal=password=supersecret \
  -n default

# Read the encrypted value from etcd
ETCD_CERT_DIR="/var/lib/rancher/rke2/server/tls/etcd"
ETCDCTL_API=3 \
/var/lib/rancher/rke2/bin/etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=${ETCD_CERT_DIR}/server-ca.crt \
  --cert=${ETCD_CERT_DIR}/client.crt \
  --key=${ETCD_CERT_DIR}/client.key \
  get /registry/secrets/default/test-encryption | hexdump -C | head -5

# The output should include k8s:enc:aescbc:v1 or k8s:enc:secretbox:v1
# and should not show the plaintext password value

# Verify Kubernetes can still read the secret
kubectl get secret test-encryption -n default -o jsonpath='{.data.password}' | base64 -d
# Should output: supersecret

# Clean up
kubectl delete secret test-encryption -n default
```

## Conclusion

Secret encryption at rest in RKE2 is an essential security control that protects sensitive credentials and configuration data from unauthorized access to the etcd datastore. The built-in `rke2 secrets-encrypt` command simplifies the process of verifying and rotating encryption keys. For compliance frameworks like HIPAA, PCI DSS, and government security standards, encryption at rest is often required or used to satisfy data-protection controls. Ensure you have secure backups of your RKE2 datastore and encryption material - losing the encryption keys means losing access to encrypted secrets in your cluster.
