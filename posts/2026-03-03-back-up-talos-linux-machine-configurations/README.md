# How to Back Up Talos Linux Machine Configurations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Backups, Machine Configuration, Kubernetes, Infrastructure as Code

Description: A practical guide to backing up Talos Linux machine configurations to ensure you can rebuild or recover your cluster nodes.

---

Machine configurations in Talos Linux define everything about how a node operates - its role, network settings, cluster membership, certificates, and system parameters. Losing these configurations means you cannot rebuild nodes or recover from failures. Backing them up properly is a fundamental part of Talos cluster management.

## What Machine Configurations Contain

A Talos machine configuration is a YAML document that includes:

- Cluster membership information (cluster name, endpoints, certificates)
- Node role (control plane or worker)
- Network configuration (interfaces, routes, DNS)
- Install parameters (disk, bootloader, extensions)
- Kubernetes-specific settings (kubelet configuration, API server settings)
- TLS certificates and keys
- Encryption keys

Because they contain sensitive cryptographic material, machine configs must be treated as secrets.

## Extracting Configurations from Running Nodes

The most reliable way to back up configurations is to pull them directly from running nodes:

```bash
# Extract machine config from a control plane node
talosctl get machineconfig --nodes <cp-node-ip> -o yaml > cp-node-1-config.yaml

# Extract from a worker node
talosctl get machineconfig --nodes <worker-node-ip> -o yaml > worker-node-1-config.yaml
```

Do this for every node in your cluster. While control plane nodes typically share the same base config (with node-specific overrides), worker nodes might have different configurations based on their role or hardware.

```bash
# Script to extract configs from all nodes
#!/bin/bash

NODES=(
    "cp-1:10.0.0.1"
    "cp-2:10.0.0.2"
    "cp-3:10.0.0.3"
    "worker-1:10.0.0.10"
    "worker-2:10.0.0.11"
    "worker-3:10.0.0.12"
)

BACKUP_DIR="./config-backups/$(date +%Y%m%d)"
mkdir -p ${BACKUP_DIR}

for entry in "${NODES[@]}"; do
    NAME="${entry%%:*}"
    IP="${entry##*:}"
    echo "Extracting config from ${NAME} (${IP})..."
    talosctl get machineconfig --nodes ${IP} -o yaml > ${BACKUP_DIR}/${NAME}.yaml
done

echo "Configs saved to ${BACKUP_DIR}/"
```

## Backing Up the Secrets Bundle

When you first create a Talos cluster, `talosctl gen config` produces a secrets bundle. This bundle contains the root CA certificates and keys used to generate all other certificates in the cluster. Without it, you cannot generate new machine configurations that are compatible with the existing cluster.

```bash
# If you still have the original secrets bundle, back it up
cp talosconfig ${BACKUP_DIR}/talosconfig
cp secrets.yaml ${BACKUP_DIR}/secrets.yaml

# If you generated configs with --output-dir
cp -r generated-configs/ ${BACKUP_DIR}/original-configs/
```

If you have lost the original secrets bundle, you can extract the relevant certificates from a running node's configuration. However, regenerating the full bundle from extracted certs is more complex, so it is better to keep the original safe.

## Storing Backups Securely

Machine configurations contain private keys, certificates, and bootstrap tokens. They need to be encrypted and stored securely.

### Encryption with GPG

```bash
# Encrypt a config backup
gpg --symmetric --cipher-algo AES256 \
  --output ${BACKUP_DIR}/cp-node-1-config.yaml.gpg \
  ${BACKUP_DIR}/cp-node-1-config.yaml

# Remove the unencrypted file
shred -u ${BACKUP_DIR}/cp-node-1-config.yaml

# Decrypt when needed
gpg --decrypt ${BACKUP_DIR}/cp-node-1-config.yaml.gpg > cp-node-1-config.yaml
```

### Using a Secrets Manager

For teams using cloud infrastructure, consider storing encrypted configs in a secrets manager:

```bash
# Store in AWS Secrets Manager
aws secretsmanager create-secret \
  --name "talos/production/cp-node-1-config" \
  --secret-string file://${BACKUP_DIR}/cp-node-1-config.yaml

# Store in HashiCorp Vault
vault kv put secret/talos/production/cp-node-1 \
  config=@${BACKUP_DIR}/cp-node-1-config.yaml
```

### Using Git with Encryption

If you want version-controlled configs, use git with encryption tools like SOPS or git-crypt:

```bash
# Using SOPS to encrypt config files
sops --encrypt --in-place ${BACKUP_DIR}/cp-node-1-config.yaml

# The file is now encrypted and safe to commit to git
git add ${BACKUP_DIR}/cp-node-1-config.yaml
git commit -m "Add encrypted machine config backup"

# Decrypt when needed
sops --decrypt ${BACKUP_DIR}/cp-node-1-config.yaml > decrypted-config.yaml
```

## What to Back Up Beyond Individual Configs

### The talosconfig File

The `talosconfig` file contains the endpoints and credentials needed to connect to your cluster with `talosctl`. Back this up alongside the machine configs:

```bash
# Back up talosconfig
cp ~/.talos/config ${BACKUP_DIR}/talosconfig

# Or wherever your talosconfig is located
```

### Configuration Patches

If you use configuration patches (applied with `talosctl apply-config` or during generation), back up the patch files too:

```bash
# Back up patch files
cp -r ./patches/ ${BACKUP_DIR}/patches/

# Example patch structure:
# patches/
#   all-nodes.yaml
#   control-plane-only.yaml
#   worker-gpu.yaml
#   node-specific/
#     cp-1.yaml
#     worker-1.yaml
```

### Generation Commands

Document the exact commands used to generate your cluster configurations:

```bash
# Save the generation command
cat > ${BACKUP_DIR}/generation-command.sh <<'SCRIPT'
#!/bin/bash
# Commands used to generate this cluster's configs

talosctl gen config production-cluster \
  https://api.production.example.com:6443 \
  --output-dir ./generated \
  --with-secrets secrets.yaml \
  --config-patch @patches/all-nodes.yaml \
  --config-patch-control-plane @patches/control-plane-only.yaml \
  --config-patch-worker @patches/worker.yaml
SCRIPT
```

## Automating Configuration Backups

Set up a cron job or scheduled task to back up configs regularly:

```bash
#!/bin/bash
# automated-config-backup.sh

CLUSTER="production"
BACKUP_BASE="/opt/backups/talos-configs"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="${BACKUP_BASE}/${CLUSTER}/${DATE}"
RETENTION_DAYS=90

# Node list
CP_NODES="10.0.0.1 10.0.0.2 10.0.0.3"
WORKER_NODES="10.0.0.10 10.0.0.11 10.0.0.12"

mkdir -p ${BACKUP_DIR}

# Extract configs
for node in ${CP_NODES}; do
    talosctl get machineconfig --nodes ${node} -o yaml \
      > ${BACKUP_DIR}/cp-${node}.yaml 2>/dev/null
done

for node in ${WORKER_NODES}; do
    talosctl get machineconfig --nodes ${node} -o yaml \
      > ${BACKUP_DIR}/worker-${node}.yaml 2>/dev/null
done

# Encrypt the backup directory
tar czf ${BACKUP_DIR}.tar.gz -C ${BACKUP_BASE}/${CLUSTER} ${DATE}
gpg --symmetric --batch --passphrase-file /opt/secrets/backup-key \
  --output ${BACKUP_DIR}.tar.gz.gpg ${BACKUP_DIR}.tar.gz

# Clean up
rm -rf ${BACKUP_DIR} ${BACKUP_DIR}.tar.gz

# Upload to remote storage
aws s3 cp ${BACKUP_DIR}.tar.gz.gpg \
  s3://backups/talos/${CLUSTER}/${DATE}.tar.gz.gpg

# Retention
find ${BACKUP_BASE}/${CLUSTER} -name "*.tar.gz.gpg" \
  -mtime +${RETENTION_DAYS} -delete

echo "Config backup complete: ${DATE}"
```

## Validating Backups

Periodically verify that your backed-up configurations are still valid and usable:

```bash
# Decrypt and validate a backup
gpg --decrypt ${BACKUP_DIR}.tar.gz.gpg | tar xzf -

# Validate each config file
for config in ${BACKUP_DIR}/*.yaml; do
    echo "Validating ${config}..."
    talosctl validate --config ${config} --mode metal
done
```

## Using Configs for Recovery

When you need to use backed-up configurations to recover a node:

```bash
# Apply a backed-up config to a fresh node
talosctl apply-config --nodes <new-node-ip> \
  --file ${BACKUP_DIR}/cp-node-1.yaml \
  --insecure

# The --insecure flag is needed if the node does not yet
# have trust established with your talosconfig
```

## Summary

Backing up Talos Linux machine configurations is essential for disaster recovery and cluster rebuilding. Extract configs from all running nodes, encrypt them before storing, keep the secrets bundle safe, and automate the backup process. Combine config backups with etcd snapshots for a complete recovery strategy. Test your backups regularly by validating the config files and practicing recovery in a non-production environment. When trouble strikes, having reliable config backups can mean the difference between a quick recovery and a complete cluster rebuild from scratch.
