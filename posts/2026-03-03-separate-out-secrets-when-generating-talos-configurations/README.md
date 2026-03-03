# How to Separate Out Secrets When Generating Talos Configurations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Secrets Management, Security, Kubernetes, Configuration

Description: Learn how to separate secrets from machine configurations in Talos Linux for better security practices and easier configuration management.

---

When you generate Talos Linux configurations using `talosctl gen config`, the resulting files contain sensitive cryptographic material mixed in with regular configuration settings. This includes CA certificates, private keys, bootstrap tokens, and encryption keys. Storing these secrets alongside your regular configuration creates security risks and makes it harder to manage configurations in version control. Talos provides a way to separate secrets from configuration, and this guide shows you how to do it properly.

## Understanding What Secrets Talos Generates

When you run `talosctl gen config`, the tool generates several pieces of sensitive data:

- **Cluster CA certificate and key** - Used to sign all cluster certificates
- **etcd CA certificate and key** - Used for etcd mutual TLS
- **Kubernetes SA key** - Used to sign service account tokens
- **Bootstrap token** - Used for initial node bootstrapping
- **Aescbc encryption key** - Used for encrypting secrets at rest in etcd
- **Talos API CA and keys** - Used for talosctl authentication

All of this gets embedded directly into the `controlplane.yaml` and `worker.yaml` configuration files. If someone gains access to these files, they have everything they need to take over your cluster.

## Generating Secrets Separately

The first step is to generate secrets independently from the machine configuration. Talos provides a dedicated command for this:

```bash
# Generate a secrets bundle
talosctl gen secrets -o secrets.yaml
```

This creates a `secrets.yaml` file containing all the cryptographic material your cluster needs. The file looks something like this (with actual values redacted):

```yaml
cluster:
  id: <cluster-id>
  secret: <cluster-secret>
secrets:
  bootstrapToken: <token>
  secretboxEncryptionSecret: <encryption-key>
trustdInfo:
  token: <trustd-token>
certs:
  etcd:
    cert: <base64-encoded-cert>
    key: <base64-encoded-key>
  k8s:
    cert: <base64-encoded-cert>
    key: <base64-encoded-key>
  k8sAggregator:
    cert: <base64-encoded-cert>
    key: <base64-encoded-key>
  k8sServiceAccount:
    key: <base64-encoded-key>
  os:
    cert: <base64-encoded-cert>
    key: <base64-encoded-key>
```

## Generating Configurations from Existing Secrets

Now that you have secrets in a separate file, generate machine configurations that reference those secrets:

```bash
# Generate configs using the pre-existing secrets
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --from-secrets secrets.yaml
```

This produces `controlplane.yaml`, `worker.yaml`, and `talosconfig` files that use the secrets from your bundle. The machine configurations still contain the secrets (they need to for the node to operate), but the source of truth for those secrets is now the separate `secrets.yaml` file.

## Why Separation Matters

There are several practical benefits to this approach.

First, you can regenerate machine configurations without changing secrets. If you need to update cluster settings, add nodes, or change non-secret configuration, you can regenerate configs from the same secrets bundle. The cluster certificates and keys stay the same, which means existing nodes continue to work without reconfiguration.

```bash
# Regenerate configs with different settings but same secrets
talosctl gen config my-cluster https://new-endpoint.example.com:6443 \
    --from-secrets secrets.yaml \
    --config-patch @my-patches.yaml
```

Second, you can store machine configurations in version control while keeping secrets out. The configurations without the secrets bundle are not useful to an attacker on their own. You can check in patches and configuration templates to Git without worrying about exposing credentials.

Third, you can rotate secrets independently of configuration changes. If you need to rotate certificates or tokens, generate a new secrets bundle and regenerate configurations from it.

## Storing Secrets Safely

Once you have the secrets separated, you need to store them securely. Here are several approaches.

### Using SOPS for Encrypted Storage

Mozilla SOPS lets you encrypt YAML files while keeping the structure readable:

```bash
# Encrypt the secrets file with SOPS using age
sops --encrypt --age age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx secrets.yaml > secrets.enc.yaml

# Later, decrypt when you need to generate configs
sops --decrypt secrets.enc.yaml > secrets.yaml
talosctl gen config my-cluster https://10.0.1.100:6443 --from-secrets secrets.yaml

# Clean up the decrypted file
rm secrets.yaml
```

### Using a Password Manager or Vault

For teams, storing the secrets bundle in a secrets manager like HashiCorp Vault or AWS Secrets Manager is a solid approach:

```bash
# Store secrets in Vault
vault kv put secret/talos/my-cluster @secrets.yaml

# Retrieve secrets when needed
vault kv get -format=yaml secret/talos/my-cluster > secrets.yaml
talosctl gen config my-cluster https://10.0.1.100:6443 --from-secrets secrets.yaml
rm secrets.yaml
```

### Using Environment-Specific Secrets

For organizations managing multiple clusters, you might have separate secrets bundles for each environment:

```text
secrets/
  production/
    secrets.enc.yaml
  staging/
    secrets.enc.yaml
  development/
    secrets.enc.yaml
```

Each environment has its own set of cryptographic material, preventing a compromise in one environment from affecting others.

## Working with Configuration Templates

With secrets separated, you can create reusable configuration templates. Here is a workflow that works well for teams:

```bash
# Step 1: Generate secrets (once per cluster)
talosctl gen secrets -o secrets.yaml

# Step 2: Store secrets securely
sops --encrypt --age $AGE_PUBLIC_KEY secrets.yaml > secrets.enc.yaml
rm secrets.yaml

# Step 3: Create configuration patches (stored in Git)
cat > cluster-config.yaml <<'EOF'
cluster:
  network:
    podSubnets:
      - 10.244.0.0/16
    serviceSubnets:
      - 10.96.0.0/12
  proxy:
    disabled: true
machine:
  kubelet:
    nodeIP:
      validSubnets:
        - 10.0.1.0/24
EOF

# Step 4: When deploying, decrypt secrets and generate configs
sops --decrypt secrets.enc.yaml > secrets.yaml
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --from-secrets secrets.yaml \
    --config-patch @cluster-config.yaml
rm secrets.yaml
```

This way, `cluster-config.yaml` lives in Git, `secrets.enc.yaml` lives in Git (encrypted), and plain text secrets never touch the repository.

## Automating with CI/CD

You can integrate this workflow into your CI/CD pipeline. Here is a simplified example for a GitHub Actions workflow:

```yaml
# .github/workflows/deploy-talos.yaml
name: Deploy Talos Config
on:
  push:
    branches: [main]
    paths: ['talos/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install tools
        run: |
          # Install talosctl
          curl -sL https://talos.dev/install | sh
          # Install sops
          curl -sL https://github.com/getsops/sops/releases/latest/download/sops-linux-amd64 -o /usr/local/bin/sops
          chmod +x /usr/local/bin/sops

      - name: Generate configs
        env:
          SOPS_AGE_KEY: ${{ secrets.SOPS_AGE_KEY }}
        run: |
          # Decrypt secrets
          sops --decrypt talos/secrets.enc.yaml > /tmp/secrets.yaml

          # Generate configs
          talosctl gen config my-cluster https://10.0.1.100:6443 \
              --from-secrets /tmp/secrets.yaml \
              --config-patch @talos/cluster-config.yaml

          # Clean up
          rm /tmp/secrets.yaml

      - name: Apply configs
        run: |
          talosctl apply-config --nodes 10.0.1.10 --file controlplane.yaml
```

## Rotating Secrets

When you need to rotate cluster secrets (for example, if the secrets bundle was exposed), the process is:

```bash
# Generate new secrets
talosctl gen secrets -o new-secrets.yaml

# Generate new configurations from new secrets
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --from-secrets new-secrets.yaml \
    --config-patch @cluster-config.yaml

# Apply new configurations to all nodes
# Note: This requires careful rolling update planning
talosctl apply-config --nodes 10.0.1.10 --file controlplane.yaml
```

Be aware that rotating the cluster CA certificates requires all nodes to be updated, and there will be a brief period where nodes using old certificates cannot communicate with nodes using new certificates. Plan this carefully for production environments.

## Backing Up Secrets

Always have a backup of your secrets bundle. If you lose it, you cannot regenerate matching configurations, and recovering the cluster becomes significantly harder.

```bash
# Create multiple encrypted backups
sops --encrypt --age $AGE_KEY secrets.yaml > backup/secrets-$(date +%Y%m%d).enc.yaml

# Verify the backup can be decrypted
sops --decrypt backup/secrets-$(date +%Y%m%d).enc.yaml > /dev/null
```

Store backups in at least two separate locations. A cloud storage bucket with versioning enabled is a good choice for one of those locations.

## Conclusion

Separating secrets from Talos Linux machine configurations is a fundamental security practice that every production deployment should follow. The `talosctl gen secrets` command makes the separation straightforward, and tools like SOPS or HashiCorp Vault provide secure storage options. By keeping secrets out of your configuration management workflow and version control, you reduce your attack surface and make it much easier to manage configurations across environments and over time. Start every new cluster by generating secrets first, and build your configuration workflow around that pattern.
