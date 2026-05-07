# How to Enable Encryption at Rest in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Security, Encryption

Description: Learn how to enable encryption at rest for Kubernetes secrets and other sensitive data in Rancher-managed clusters.

By default, Kubernetes stores secrets unencrypted in etcd. Because secret data is only base64-encoded, anyone with access to etcd or its backups can recover the original values. Encryption at rest ensures that data stored in etcd is encrypted and cannot be read without the encryption key. This guide covers enabling encryption at rest in Rancher-managed clusters.

## Prerequisites

- A Rancher release that supports the cluster type you are managing (Rancher v2.12 and later do not manage downstream RKE clusters)
- RKE or RKE2 managed clusters
- Admin access to Rancher
- SSH access to control plane nodes

## Step 1: Understanding Encryption at Rest

Kubernetes encryption at rest works by encrypting resources before they are written to etcd. The API server handles encryption and decryption transparently, so applications are not affected. You can encrypt specific resource types, but secrets are the most important target.

Common encryption providers:

- **aescbc**: AES-CBC with PKCS#7 padding
- **aesgcm**: AES-GCM (requires more frequent key rotation)
- **secretbox**: XSalsa20 and Poly1305
- **identity**: No encryption (default)
- **kms**: Envelope encryption with an external key management service

In Rancher-managed clusters, RKE2's built-in secrets encryption currently supports `aescbc` and `secretbox`, and defaults to `aescbc`.

## Step 2: Verify and Configure Encryption in RKE2

RKE2 manages secrets encryption at rest automatically and uses `aescbc` by default. If you want to select the provider explicitly, edit the RKE2 config on each server node:

```bash
cat >> /etc/rancher/rke2/config.yaml << 'EOF'
secrets-encryption-provider: aescbc
EOF
```

Restart RKE2:

```bash
systemctl restart rke2-server.service
```

Verify encryption is active:

```bash
rke2 secrets-encrypt status
```

## Step 3: Enable Encryption in RKE Clusters via Rancher

For RKE clusters provisioned through Rancher, edit the cluster YAML:

1. Go to **Cluster Management**.
2. Click the three-dot menu on the cluster and select **Edit Config**.
3. In the configuration form, scroll down and select **Edit as YAML**.
4. Add the encryption configuration:

```yaml
rancher_kubernetes_engine_config:
  services:
    kube_api:
      secrets_encryption_config:
        enabled: true
```

Save the changes. Rancher will update the cluster configuration, restart the API server, and rewrite existing secrets.

## Step 4: Create a Custom Encryption Configuration in RKE

For more control over encryption in RKE clusters, add a custom `EncryptionConfiguration`:

```yaml
rancher_kubernetes_engine_config:
  services:
    kube_api:
      secrets_encryption_config:
        enabled: true
        custom_config:
          apiVersion: apiserver.config.k8s.io/v1
          kind: EncryptionConfiguration
          resources:
            - resources:
                - secrets
                - configmaps
              providers:
                - aescbc:
                    keys:
                      - name: key1
                        secret: BASE64_ENCODED_32_BYTE_KEY
                - identity: {}
```

Generate the encryption key:

```bash
ENCRYPTION_KEY=$(head -c 32 /dev/urandom | base64)
echo "Generated key: $ENCRYPTION_KEY"
```

Replace `BASE64_ENCODED_32_BYTE_KEY` in the YAML with the generated value, then save the cluster configuration. Rancher and RKE will deploy the configuration to the control plane nodes and restart the API server.

## Step 5: Encrypt Existing Secrets

For upstream Kubernetes encryption at rest, only newly written data is encrypted until objects are rewritten. RKE managed encryption rewrites secrets automatically, but you can force re-encryption after changing a custom configuration:

```bash
kubectl get secrets --all-namespaces -o json | kubectl replace -f -
```

For specific namespaces:

```bash
kubectl get secrets -n production -o json | kubectl replace -f -
kubectl get secrets -n staging -o json | kubectl replace -f -
```

## Step 6: Verify Encryption Is Active

For RKE2 clusters, check that secrets are encrypted in etcd by reading directly from etcd:

```bash
# On the control plane node
kubectl create secret generic secret1 -n default --from-literal=mykey=mydata

ETCDCTL_API=3 etcdctl \
  --cacert=/var/lib/rancher/rke2/server/tls/etcd/server-ca.crt \
  --cert=/var/lib/rancher/rke2/server/tls/etcd/client.crt \
  --key=/var/lib/rancher/rke2/server/tls/etcd/client.key \
  --endpoints=https://127.0.0.1:2379 \
  get /registry/secrets/default/secret1 | hexdump -C
```

If encryption is active, the output will show encrypted data prefixed with `k8s:enc:<provider>:v1:` such as `k8s:enc:aescbc:v1:` instead of readable plaintext.

## Step 7: Rotate Encryption Keys

Regular key rotation is a security best practice.

For RKE2 on current releases, rotate keys with the built-in `secrets-encrypt` command:

```bash
rke2 secrets-encrypt rotate-keys
rke2 secrets-encrypt status
```

On HA RKE2 clusters, wait until `rke2 secrets-encrypt status` shows `reencrypt_finished`, then restart the server nodes one at a time:

```bash
systemctl restart rke2-server.service
```

For RKE clusters managed by Rancher, enable secrets encryption first, then use **Cluster Management** > **⋮** > **Rotate Encryption Keys** for the target cluster.

## Step 8: Encrypt Additional Resource Types

With a custom `EncryptionConfiguration`, you can decide which additional resource types to encrypt and which to leave unencrypted:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
      - configmaps
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: BASE64_ENCODED_32_BYTE_KEY
      - identity: {}
  - resources:
      - events
    providers:
      - identity: {}
```

Be selective about what you encrypt, as encryption adds CPU overhead to every read and write operation.

## Step 9: Secure the Encryption Key

The encryption key itself must be protected:

- For RKE2, restrict access to the generated encryption config:

```bash
chmod 600 /var/lib/rancher/rke2/server/cred/encryption-config.json
chown root:root /var/lib/rancher/rke2/server/cred/encryption-config.json
```

- For RKE clusters, protect the `cluster.rkestate` file and its backups because RKE stores the encryption configuration there.
- Store a backup of the key in a secure external location (Vault, KMS).
- For custom Kubernetes encryption configurations, use a KMS provider for key management in cloud environments.
- Never commit encryption keys to version control.

## Troubleshooting

### API Server Fails to Start After Enabling Encryption

On RKE2, check the server logs:

```bash
journalctl -u rke2-server | grep -i encrypt
```

Common issues include invalid base64 encoding in the key or incorrect file paths.

### Cannot Read Secrets After Key Rotation

If the old key was removed before re-encrypting all secrets, some secrets may be unreadable. Restore the old key to the configuration, restart the API server, re-encrypt, and then remove the old key.

## Conclusion

Encryption at rest protects sensitive data stored in etcd from unauthorized access. Whether you use RKE2's built-in secrets encryption or a custom encryption configuration, enabling this feature is essential for production clusters. Combine encryption at rest with regular key rotation and secure key storage for comprehensive data protection.
