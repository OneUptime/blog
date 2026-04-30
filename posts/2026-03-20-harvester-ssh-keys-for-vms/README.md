# How to Set Up SSH Keys for VMs in Harvester

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, SSH, Security

Description: Learn how to generate, store, and inject SSH keys into Harvester virtual machines using keypair management and cloud-init.

## Introduction

SSH key-based authentication is the standard method for secure, passwordless access to Linux virtual machines. Harvester provides a built-in keypair management feature that lets you store public SSH keys in the cluster and inject them into VMs during creation. This guide covers the complete workflow from key generation to VM access.

## Step 1: Generate an SSH Key Pair

```bash
# Generate an Ed25519 key pair (recommended for most use cases)

ssh-keygen -t ed25519 \
    -C "harvester-vms-$(date +%Y%m)" \
    -f ~/.ssh/harvester_key

# Or generate an RSA 4096-bit key pair
ssh-keygen -t rsa -b 4096 \
    -C "harvester-vms-$(date +%Y%m)" \
    -f ~/.ssh/harvester_rsa_key

# Set the file name for the key you generated
KEY_FILE=~/.ssh/harvester_key
# If you generated the RSA key instead, use:
# KEY_FILE=~/.ssh/harvester_rsa_key

chmod 600 "${KEY_FILE}"
chmod 644 "${KEY_FILE}.pub"

# View the public key (this is what you'll add to Harvester)
cat "${KEY_FILE}.pub"
```

## Step 2: Add the SSH Keypair to Harvester

### Via the UI

1. Navigate to **Advanced** → **SSH Keys**
2. Click **Create**
3. Fill in:
   - **Name**: `admin-key-2024`
   - **Namespace**: `default`
   - **Public Key**: Paste the contents of `~/.ssh/harvester_key.pub`
4. Click **Create**

### Via kubectl

```yaml
# ssh-keypair.yaml
# Store an SSH public key in Harvester

apiVersion: harvesterhci.io/v1beta1
kind: KeyPair
metadata:
  name: admin-key-2024
  namespace: default
spec:
  # Paste the public key content here
  publicKey: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample... harvester-vms-202401"
```

```bash
kubectl apply -f ssh-keypair.yaml

# Verify the keypair was created
kubectl get keypair admin-key-2024 -n default

# List all keypairs
kubectl get keypair -n default
```

### Using a Script to Import Multiple Keys

```bash
#!/bin/bash
# import-ssh-keys.sh - Import SSH public keys for multiple team members

NAMESPACE="default"

# Define keys as name:key pairs
declare -A KEYS=(
    ["alice-key"]="ssh-ed25519 AAAAC3NzaC1... alice@company.com"
    ["bob-key"]="ssh-rsa AAAAB3NzaC1yc2E... bob@company.com"
    ["deploy-key"]="ssh-ed25519 AAAAC3NzaC1... ci-deploy@automation"
)

for KEY_NAME in "${!KEYS[@]}"; do
    PUBLIC_KEY="${KEYS[$KEY_NAME]}"
    echo "Importing: ${KEY_NAME}"

    kubectl apply -f - <<EOF
apiVersion: harvesterhci.io/v1beta1
kind: KeyPair
metadata:
  name: ${KEY_NAME}
  namespace: ${NAMESPACE}
  labels:
    team: platform
spec:
  publicKey: "${PUBLIC_KEY}"
EOF
done

echo "Done. SSH keys imported:"
kubectl get keypair -n ${NAMESPACE}
```

## Step 3: Assign SSH Keys When Creating a VM

### Via the UI

When creating a VM:
1. Go to the **Basics** tab
2. In the **SSH Keys** section, click the dropdown
3. Select the keypair(s) to inject
4. Multiple keys can be selected

### Via Cloud-Init (Manual)

```yaml
# vm-with-ssh-keys.yaml
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: dev-server-01
  namespace: default
spec:
  runStrategy: Always
  template:
    spec:
      domain:
        cpu:
          cores: 4
        resources:
          requests:
            memory: 8Gi
        machine:
          type: q35
        devices:
          disks:
            - name: rootdisk
              bootOrder: 1
              disk:
                bus: virtio
            - name: cloudinit
              disk:
                bus: virtio
          interfaces:
            - name: default
              masquerade: {}
      networks:
        - name: default
          pod: {}
      volumes:
        - name: rootdisk
          persistentVolumeClaim:
            claimName: dev-server-01-root
        - name: cloudinit
          cloudInitNoCloud:
            # Reference a Kubernetes Secret that contains cloud-init userdata
            # This Secret is separate from Harvester KeyPair objects
            secretRef:
              name: dev-server-01-cloudinit
```

Create the cloud-init secret:

```yaml
# cloud-init-secret.yaml
# Cloud-init configuration that injects SSH keys

apiVersion: v1
kind: Secret
metadata:
  name: dev-server-01-cloudinit
  namespace: default
type: Opaque
stringData:
  userdata: |
    #cloud-config
    users:
      - name: ubuntu
        sudo: ALL=(ALL) NOPASSWD:ALL
        shell: /bin/bash
        ssh_authorized_keys:
          # Inject SSH public keys
          - ssh-ed25519 AAAAC3NzaC1... alice@company.com
          - ssh-ed25519 AAAAC3NzaC1... bob@company.com
    # Disable password authentication for security
    ssh_pwauth: false
    disable_root: true
```

## Step 4: Connect to the VM via SSH

After the VM boots:

```bash
# Get the VM's IP address
kubectl get vmi dev-server-01 -n default \
    -o jsonpath='{.status.interfaces[*].ipAddress}'

# Or from the Harvester UI, check the VM details for the IP

# Connect using the private key
ssh -i ~/.ssh/harvester_key ubuntu@<VM_IP>

# If you added a config entry for convenience
cat >> ~/.ssh/config <<EOF

Host harvester-dev-01
    HostName <VM_IP>
    User ubuntu
    IdentityFile ~/.ssh/harvester_key
EOF

# Connect using the config alias
ssh harvester-dev-01
```

## Step 5: Dynamic Key Injection with accessCredentials

For dynamic SSH key management with accessCredentials (attach the credential before the VM starts, or restart the VM after adding it):

```yaml
# vm-dynamic-keys.yaml
# Configure dynamic SSH key injection via accessCredentials

apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: prod-server-01
  namespace: default
spec:
  runStrategy: Always
  template:
    spec:
      # accessCredentials allows dynamic key management
      accessCredentials:
        - sshPublicKey:
            source:
              secret:
                secretName: prod-ssh-keys  # Kubernetes Secret with authorized_keys
            propagationMethod:
              qemuGuestAgent:
                users:
                  - ubuntu  # Username to inject keys for
      domain:
        cpu:
          cores: 4
        resources:
          requests:
            memory: 8Gi
        machine:
          type: q35
        devices:
          disks:
            - name: rootdisk
              disk:
                bus: virtio
          interfaces:
            - name: default
              masquerade: {}
      networks:
        - name: default
          pod: {}
      volumes:
        - name: rootdisk
          persistentVolumeClaim:
            claimName: prod-server-01-root
```

```bash
# Create the SSH keys secret before starting the VM
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: prod-ssh-keys
  namespace: default
type: Opaque
stringData:
  authorized_keys: |
    ssh-ed25519 AAAAC3NzaC1... alice@company.com
    ssh-ed25519 AAAAC3NzaC1... sre-team@company.com
EOF

# After the VM starts with this access credential attached,
# the qemu-guest-agent will inject the keys automatically
# Later Secret updates are applied without a VM restart

# To add a new key, update the Secret with the full desired key set
kubectl patch secret prod-ssh-keys -n default \
    --type merge \
    -p '{"stringData":{"authorized_keys":"ssh-ed25519 AAAAC3NzaC1... alice@company.com\nssh-ed25519 AAAAC3NzaC1... sre-team@company.com\nssh-ed25519 NEW_KEY... new-user@company.com\n"}}'
```

## Best Practices

```bash
# 1. Create separate keys per role/team
kubectl apply -f - <<EOF
apiVersion: harvesterhci.io/v1beta1
kind: KeyPair
metadata:
  name: sre-team-keys
  namespace: default
  labels:
    role: sre
    rotation-date: "2024-01"
spec:
  publicKey: "ssh-ed25519 AAAA... sre-team@company.com"
EOF

# 2. Audit who has VM access
kubectl get keypair -A -o jsonpath='{range .items[*]}{.metadata.name} {.metadata.namespace}{"\n"}{end}'

# 3. Remove compromised keys immediately
kubectl delete keypair compromised-key -n default

# 4. If using accessCredentials, replace the Secret contents with only the remaining authorized keys
kubectl patch secret prod-ssh-keys -n default \
    --type merge \
    -p '{"stringData":{"authorized_keys":"ssh-ed25519 REMAINING_KEY_1...\nssh-ed25519 REMAINING_KEY_2...\n"}}'
```

## Conclusion

SSH key management in Harvester is designed to be both simple and secure. The built-in keypair store provides a central place to manage public keys, while cloud-init and accessCredentials provide flexible injection methods for new and running VMs. By adopting key-based SSH authentication, disabling password login, and regularly rotating keys, you establish a strong security baseline for all VM access in your Harvester environment.
