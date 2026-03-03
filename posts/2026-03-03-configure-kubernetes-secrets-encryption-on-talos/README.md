# How to Configure Kubernetes Secrets Encryption on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Secrets Encryption, Security, etcd

Description: Learn how to enable and configure encryption at rest for Kubernetes Secrets on Talos Linux to protect sensitive data stored in etcd.

---

By default, Kubernetes stores Secrets in etcd as base64-encoded plaintext. This means anyone with access to the etcd data directory or the ability to read from the etcd API can see your secrets in plain text. Enabling encryption at rest ensures that secret data is encrypted before it is written to etcd, adding a critical layer of protection for sensitive information.

Talos Linux makes configuring secrets encryption straightforward through its machine configuration. Unlike traditional Linux distributions where you would need to edit files on the control plane nodes, Talos lets you define the encryption configuration declaratively through its API. In this guide, we will walk through enabling and managing secrets encryption on a Talos Linux cluster.

## Understanding Encryption at Rest

Kubernetes supports encrypting resources stored in etcd through an EncryptionConfiguration. This configuration specifies which resources should be encrypted and which encryption providers to use. The supported providers include:

- **aescbc**: AES-CBC encryption with PKCS#7 padding. This is a solid choice for most use cases.
- **aesgcm**: AES-GCM encryption. Faster than aescbc but requires careful key rotation since nonce reuse can compromise security.
- **secretbox**: Uses XSalsa20 and Poly1305. A modern and fast option.
- **identity**: No encryption (the default). Data is stored as-is.

When multiple providers are listed, the first one is used for encryption and all listed providers can be used for decryption. This is how key rotation works - you add the new key first, re-encrypt, then remove the old key.

## Configuring Encryption in Talos

Talos Linux allows you to specify the encryption configuration in the machine config for control plane nodes. Here is how to set it up.

First, generate a strong encryption key.

```bash
# Generate a 32-byte random key encoded as base64
head -c 32 /dev/urandom | base64
# Output example: dGhpcyBpcyBhIHRlc3Qga2V5IGZvciBlbmNyeXB0aW9u
```

Now create a Talos machine configuration patch that enables secrets encryption.

```yaml
# encryption-patch.yaml
cluster:
  apiServer:
    extraArgs:
      encryption-provider-config: /etc/kubernetes/encryption-config.yaml
    extraVolumes:
      - hostPath: /var/etc/kubernetes/encryption-config
        mountPath: /etc/kubernetes/encryption-config.yaml
        name: encryption-config
        readOnly: true
  secretsEncryption:
    aescbc:
      keys:
        - name: key1
          secret: dGhpcyBpcyBhIHRlc3Qga2V5IGZvciBlbmNyeXB0aW9u
```

Wait - Talos Linux actually has a built-in way to handle this without manual volume mounts. Talos provides native support for secrets encryption through the machine configuration.

```yaml
# talos-encryption-patch.yaml
cluster:
  secretsEncryption:
    provider: aescbc
    aescbc:
      keys:
        - name: key-2024-01
          secret: dGhpcyBpcyBhIHRlc3Qga2V5IGZvciBlbmNyeXB0aW9u
```

Apply this patch to your control plane nodes.

```bash
# Apply the encryption configuration to control plane nodes
talosctl machineconfig patch /path/to/controlplane.yaml \
  --patch @talos-encryption-patch.yaml \
  --output controlplane-encrypted.yaml

# Apply the updated configuration to each control plane node
talosctl apply-config --nodes 10.0.0.10 --file controlplane-encrypted.yaml
talosctl apply-config --nodes 10.0.0.11 --file controlplane-encrypted.yaml
talosctl apply-config --nodes 10.0.0.12 --file controlplane-encrypted.yaml
```

## Verifying Encryption is Active

After applying the configuration and waiting for the API server to restart, verify that encryption is working.

```bash
# Create a test secret
kubectl create secret generic test-encryption \
  --from-literal=mykey=mysecretvalue \
  --namespace default

# Read the secret directly from etcd using talosctl
talosctl etcd get /registry/secrets/default/test-encryption \
  --nodes 10.0.0.10

# If encryption is working, the output should be garbled/encrypted
# If it is NOT working, you would see the plaintext value
```

You can also check the API server logs to confirm the encryption provider loaded successfully.

```bash
# Check API server logs for encryption-related messages
talosctl logs kube-apiserver --nodes 10.0.0.10 | grep -i encrypt
```

## Re-encrypting Existing Secrets

Enabling encryption only affects new secrets written to etcd. Existing secrets remain in their original format. To encrypt all existing secrets, you need to re-write them.

```bash
# Re-encrypt all secrets in the cluster
# This reads each secret and writes it back, triggering encryption
kubectl get secrets --all-namespaces -o json | \
  kubectl replace -f -
```

If you have a large number of secrets, you might want to do this namespace by namespace to avoid overwhelming the API server.

```bash
# Re-encrypt secrets one namespace at a time
for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  echo "Re-encrypting secrets in namespace: $ns"
  kubectl get secrets -n "$ns" -o json | kubectl replace -f -
done
```

## Key Rotation

Regular key rotation is a security best practice. The process involves adding a new key, re-encrypting all secrets with the new key, and then removing the old key.

Step 1: Generate a new encryption key.

```bash
# Generate a new 32-byte key
head -c 32 /dev/urandom | base64
# Output: bmV3IGtleSBmb3Igcm90YXRpb24gZXhhbXBsZSBrZXk=
```

Step 2: Update the configuration with both keys, placing the new key first.

```yaml
# rotation-patch.yaml
cluster:
  secretsEncryption:
    provider: aescbc
    aescbc:
      keys:
        # New key first - used for encryption
        - name: key-2024-06
          secret: bmV3IGtleSBmb3Igcm90YXRpb24gZXhhbXBsZSBrZXk=
        # Old key second - only used for decryption during transition
        - name: key-2024-01
          secret: dGhpcyBpcyBhIHRlc3Qga2V5IGZvciBlbmNyeXB0aW9u
```

Step 3: Apply the updated configuration to all control plane nodes.

```bash
# Apply to each control plane node
talosctl apply-config --nodes 10.0.0.10 --file controlplane-rotated.yaml
talosctl apply-config --nodes 10.0.0.11 --file controlplane-rotated.yaml
talosctl apply-config --nodes 10.0.0.12 --file controlplane-rotated.yaml
```

Step 4: Re-encrypt all secrets with the new key.

```bash
# Re-encrypt all secrets
kubectl get secrets --all-namespaces -o json | kubectl replace -f -
```

Step 5: After verifying re-encryption is complete, remove the old key from the configuration and apply again.

```yaml
# final-patch.yaml
cluster:
  secretsEncryption:
    provider: aescbc
    aescbc:
      keys:
        - name: key-2024-06
          secret: bmV3IGtleSBmb3Igcm90YXRpb24gZXhhbXBsZSBrZXk=
```

## Encrypting Other Resources

While Secrets are the most common target for encryption at rest, you can also encrypt other resource types like ConfigMaps or custom resources.

```yaml
# Encrypt both Secrets and ConfigMaps
cluster:
  secretsEncryption:
    provider: aescbc
    resources:
      - secrets
      - configmaps
    aescbc:
      keys:
        - name: key-2024-06
          secret: bmV3IGtleSBmb3Igcm90YXRpb24gZXhhbXBsZSBrZXk=
```

Only encrypt resources that actually contain sensitive data. Encrypting everything adds CPU overhead to every read and write operation.

## Monitoring Encryption Health

Set up monitoring to detect issues with encryption early.

```bash
# Check if the API server can read encrypted secrets
kubectl get secrets --all-namespaces --no-headers | wc -l

# Monitor API server latency for secret operations
# Increased latency might indicate encryption issues
kubectl get --raw /metrics | grep apiserver_request_duration | grep secrets
```

You can also create a simple CronJob that periodically writes and reads a test secret to verify encryption is functioning.

```yaml
# encryption-health-check.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: encryption-health-check
  namespace: kube-system
spec:
  schedule: "*/30 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: encryption-checker
          containers:
            - name: checker
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Write a test secret
                  kubectl create secret generic encryption-test \
                    --from-literal=test=working \
                    --dry-run=client -o yaml | kubectl apply -f -
                  # Read it back
                  VALUE=$(kubectl get secret encryption-test -o jsonpath='{.data.test}' | base64 -d)
                  if [ "$VALUE" = "working" ]; then
                    echo "Encryption health check passed"
                  else
                    echo "ERROR: Encryption health check failed"
                    exit 1
                  fi
                  # Clean up
                  kubectl delete secret encryption-test
          restartPolicy: OnFailure
```

## Talos-Specific Considerations

There are a few important things to keep in mind when managing secrets encryption on Talos Linux:

1. **Configuration is API-driven**: Unlike other distributions where you edit files on disk, Talos requires you to update the machine configuration through talosctl. This is actually an advantage because it prevents configuration drift.

2. **Rolling restarts**: When you update the encryption configuration, the API server needs to restart. On a multi-node control plane, Talos handles this gracefully, but plan for brief API server unavailability on each node.

3. **Backup your keys**: Store encryption keys in a secure location outside the cluster. If you lose the keys and need to rebuild your control plane, you will not be able to read any encrypted secrets.

4. **etcd encryption vs secrets encryption**: Talos also supports encrypting the entire etcd database at the disk level. This is complementary to Kubernetes secrets encryption and provides defense in depth.

## Wrapping Up

Enabling encryption at rest for Kubernetes Secrets on Talos Linux is a fundamental security measure that every production cluster should implement. The process is straightforward thanks to Talos's declarative configuration model, and the operational overhead is minimal once it is set up. Regular key rotation, combined with monitoring, ensures that your secrets remain protected even if someone gains access to the etcd data store. On Talos Linux, the immutable OS design means there are fewer attack vectors for key extraction compared to traditional distributions, making it an excellent foundation for encrypted secrets management.
