# How to Configure Secrets Encryption in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Security, Encryption

Description: Learn how to configure and manage Kubernetes secrets encryption in Rancher-managed clusters using native encryption providers and external KMS integration.

Kubernetes secrets store sensitive data such as passwords, API keys, and TLS certificates. By default, these are stored as base64-encoded plaintext in etcd, which means they are not truly secure. Configuring secrets encryption ensures that this sensitive data is encrypted before it reaches etcd. This guide covers multiple approaches to secrets encryption in Rancher.

## Prerequisites

- Rancher v2.5 or later for RKE2 clusters
- RKE2 managed clusters, or existing legacy RKE (RKE1) clusters on Rancher versions that still support them
- Admin access to Rancher
- SSH access to control plane nodes

## Step 1: Verify Built-in Secrets Encryption in RKE2

Current RKE2 releases manage secrets encryption automatically by generating an encryption configuration and passing it to the Kubernetes API server. Verify that it is enabled:

```bash
# On the RKE2 server node

rke2 secrets-encrypt status
```

Expected output:

```plaintext
Encryption Status: Enabled
Current Rotation Stage: start
```

## Step 2: Enable Secrets Encryption in RKE via Rancher

For existing RKE (RKE1) clusters managed through Rancher:

1. Go to **Cluster Management**.
2. Click the three-dot menu on the cluster.
3. Select **Edit Config** > **Edit as YAML**.
4. Add the encryption configuration:

```yaml
rancher_kubernetes_engine_config:
  services:
    kube_api:
      secrets_encryption_config:
        enabled: true
```

5. Save the changes. Rancher will update the cluster.

> Note: RKE1 reached end of life on July 31, 2025, and Rancher 2.12+ no longer supports provisioning or managing downstream RKE1 clusters.

## Step 3: Choose an Encryption Provider in RKE2

RKE2 manages the encryption configuration file for you. To change the provider from the default `aescbc` to `secretbox` on releases that support it, update the RKE2 config:

```bash
# /etc/rancher/rke2/config.yaml
cat >> /etc/rancher/rke2/config.yaml << 'EOF'
secrets-encryption-provider: secretbox
EOF

systemctl restart rke2-server
```

`secretbox` support was added in the April 2025 RKE2 releases. For FIPS 140-2 compliance, keep the default `aescbc` provider.

## Step 4: Encrypt All Existing Secrets

After enabling encryption on an existing cluster or changing providers, existing secrets remain under the previous configuration until they are rewritten. Re-encrypt them:

```bash
kubectl get secrets -A -o json | kubectl replace -f -
```

For large clusters, process namespace by namespace to avoid timeouts:

```bash
for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  echo "Re-encrypting secrets in namespace: $ns"
  kubectl get secrets -n "$ns" -o json 2>/dev/null | kubectl replace -f - 2>/dev/null
done
```

## Step 5: Verify Secrets Are Encrypted

Read a secret directly from etcd to confirm encryption:

```bash
ETCDCTL_API=3 etcdctl get /registry/secrets/default/test-secret \
  --cacert=/var/lib/rancher/rke2/server/tls/etcd/server-ca.crt \
  --cert=/var/lib/rancher/rke2/server/tls/etcd/server-client.crt \
  --key=/var/lib/rancher/rke2/server/tls/etcd/server-client.key \
  --endpoints=https://127.0.0.1:2379 | hexdump -C | head -20
```

Encrypted secrets will show binary data instead of readable Secret content. With the `aescbc` provider, the stored value is prefixed with `k8s:enc:aescbc:v1:`.

## Step 6: Rotate Encryption Keys

Rotate keys periodically to limit the impact of a key compromise.

### For RKE2 Built-in Encryption

```bash
# Run on one RKE2 server node
rke2 secrets-encrypt rotate-keys

# Wait for reencryption to finish
rke2 secrets-encrypt status
```

On HA clusters, run `rotate-keys` on one server node, wait until the status shows `reencrypt_finished`, then restart `rke2-server.service` sequentially on each server node. For older RKE2 releases, use the classic `prepare` / `rotate` / `reencrypt` procedure from the RKE2 documentation.

### For Custom Encryption Configuration

1. Add the new key as the second key entry:

```yaml
providers:
  - aescbc:
      keys:
        - name: key1
          secret: OLD_KEY
        - name: key2
          secret: NEW_KEY
  - identity: {}
```

2. Restart the API server.
3. Move the new key to the first position in the list.
4. Restart the API server again.
5. Re-encrypt all secrets.
6. Remove the old key after all secrets have been rewritten.

## Step 7: Integrate with External KMS

For production environments where you manage the Kubernetes API server encryption configuration directly, use an external Key Management Service instead of static keys. On Kubernetes v1.29 and later, prefer KMS v2; KMS v1 is deprecated and disabled by default. This is Kubernetes-level guidance rather than a native RKE2 provider setting.

### AWS KMS Plugin

Deploy the AWS KMS encryption provider plugin:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - kms:
          apiVersion: v2
          name: aws-kms
          endpoint: unix:///var/run/kms-plugin/socket.sock
          timeout: 3s
      - identity: {}
```

Deploy a Kubernetes-compatible AWS KMS plugin on each control plane node according to the plugin's documentation, and expose it over the UNIX domain socket referenced by `endpoint`.

### HashiCorp Vault Transit

For Vault-based key management:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - kms:
          apiVersion: v2
          name: vault-kms
          endpoint: unix:///var/run/vault-kms/socket.sock
          timeout: 3s
      - identity: {}
```

As with AWS KMS, the Vault-backed KMS plugin must run on each control plane node and listen on the configured UNIX domain socket.

## Step 8: Audit Secrets Access

Monitor who accesses secrets with audit logging:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: Metadata
  resources:
  - group: ""
    resources: ["secrets"]
  verbs: ["get", "list", "watch"]
- level: RequestResponse
  resources:
  - group: ""
    resources: ["secrets"]
  verbs: ["create", "update", "patch", "delete"]
```

This policy logs common secret read and write operations for compliance and security monitoring.

## Troubleshooting

### API Server Fails After Enabling Encryption

Check the API server logs:

```bash
journalctl -u rke2-server | grep -i encrypt
```

Common issues:
- Invalid base64 key encoding
- Incorrect file permissions on the encryption config
- Missing or incorrect file path

### Secrets Cannot Be Read After Key Change

If you removed an old key before re-encrypting, secrets encrypted with that key become unreadable. Restore the old key, restart the API server, re-encrypt all secrets, then remove the old key.

### Performance Impact

Encryption adds CPU overhead. Monitor API server resource usage:

```bash
kubectl top pods -n kube-system -l component=kube-apiserver
```

Prefer `kms` v2 when you need external key management. In RKE2, `aescbc` remains the default and is required for FIPS 140-2 compliance, while `secretbox` is also supported on newer releases.

## Conclusion

Secrets encryption is a fundamental security measure for Kubernetes clusters. Rancher-managed RKE2 clusters include built-in secrets encryption, while legacy RKE clusters can enable it through Rancher configuration. Combined with regular key rotation and access auditing, secrets encryption helps protect your sensitive data at rest.
