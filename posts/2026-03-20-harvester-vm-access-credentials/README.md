# How to Configure VM Access Credentials in Harvester

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Security, Cloud-init

Description: Learn how to configure secure access credentials for virtual machines in Harvester using cloud-init, SSH keys, and Kubernetes secrets.

## Introduction

Configuring secure access credentials for VMs in Harvester is essential for both operational access and security compliance. Harvester supports multiple methods for setting up VM credentials: cloud-init for Linux VMs (which handles initial user creation, password setting, and SSH key injection), and Kubernetes Secrets for managing sensitive data. This guide covers best practices for setting up VM credentials securely.

## Credential Types

| Method | OS Support | Use Case |
|---|---|---|
| SSH Key Injection | Linux | Key-based SSH access (recommended) |
| Password via cloud-init | Linux | Console or SSH access when enabled |
| Cloud-init user data | Linux | Full user management |
| Kubernetes Secret | All | Back access credentials with Secret data |

## Method 1: SSH Keys via Cloud-Init

The most secure approach for Linux VMs:

```yaml
# vm-with-ssh-keys.yaml

apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: secure-vm-01
  namespace: default
spec:
  running: true
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
            claimName: secure-vm-01-root
        - name: cloudinit
          cloudInitNoCloud:
            userData: |
              #cloud-config
              # Create an admin user with SSH key access
              users:
                - name: admin
                  sudo: ALL=(ALL) NOPASSWD:ALL
                  shell: /bin/bash
                  groups: sudo, adm
                  ssh_authorized_keys:
                    # Add your public SSH keys here
                    - ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ... user@workstation
                    - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... admin@bastion
              # Disable root login and password authentication
              disable_root: true
              ssh_pwauth: false
              ssh:
                emit_keys_to_console: false
```

## Method 2: Use Kubernetes Secrets for Credentials

Store SSH public keys in a Kubernetes Secret, then reference them in a VM:

```bash
# Create a secret with SSH public keys
kubectl create secret generic vm-ssh-keys \
    --from-file=key1=$HOME/.ssh/id_rsa.pub \
    -n default

# Or create a multi-key secret
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: vm-ssh-keys
  namespace: default
type: Opaque
stringData:
  # Store SSH public keys
  key1: ssh-rsa AAAAB3NzaC1... user1@host
  key2: ssh-ed25519 AAAAC3Nz... user2@host
  key3: ssh-rsa AAAAB3NzaC1... deployer@ci
EOF
```

Reference the secret in a VM:

```yaml
# vm-with-secret-credentials.yaml
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: app-vm-01
  namespace: default
spec:
  running: true
  template:
    spec:
      domain:
        cpu:
          cores: 2
        resources:
          requests:
            memory: 4Gi
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
      accessCredentials:
        # Inject SSH keys from a Kubernetes Secret
        - sshPublicKey:
            source:
              secret:
                secretName: vm-ssh-keys
            propagationMethod:
              # Use qemu-guest-agent to inject keys dynamically
              qemuGuestAgent:
                users:
                  - ubuntu
      networks:
        - name: default
          pod: {}
      volumes:
        - name: rootdisk
          persistentVolumeClaim:
            claimName: app-vm-01-root
        - name: cloudinit
          cloudInitNoCloud:
            userData: |
              #cloud-config
              users:
                - name: ubuntu
                  sudo: ALL=(ALL) NOPASSWD:ALL
                  shell: /bin/bash
```

## Method 3: Password Authentication via Kubernetes Secret

For Windows VMs or environments where SSH keys aren't practical:

```bash
# Create a secret with the VM password
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: vm-user-passwords
  namespace: default
type: Opaque
stringData:
  # Each key must match an existing username inside the guest
  Administrator: "$(openssl rand -base64 24)"
EOF
```

```yaml
# vm-with-password-secret.yaml
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: windows-vm-01
  namespace: default
spec:
  running: true
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
                bus: sata
          interfaces:
            - name: default
              masquerade: {}
      accessCredentials:
        # Inject password via guest agent
        - userPassword:
            source:
              secret:
                secretName: vm-user-passwords
            propagationMethod:
              qemuGuestAgent: {}
      networks:
        - name: default
          pod: {}
      volumes:
        - name: rootdisk
          persistentVolumeClaim:
            claimName: windows-vm-01-root
```

## Method 4: Rotate Credentials Without VM Restart

Using the `accessCredentials` with `qemuGuestAgent`, you can rotate SSH keys without restarting the VM:

```bash
# Update the secret with new SSH keys
kubectl patch secret vm-ssh-keys -n default \
    --type merge \
    -p '{"stringData":{"key1":"ssh-rsa AAAAB3NzaC1... new-key@host\n"}}'

# The qemu-guest-agent will automatically propagate the change
# Verify the key was updated inside the VM
ssh ubuntu@<ip-address-or-hostname> 'grep "new-key@host" ~/.ssh/authorized_keys'
```

## Method 5: Cloud-Init via Harvester UI

When creating a VM through the UI:

1. Click **Create VM**
2. Go to the **Advanced Options** section
3. In the **User Data** section, enter cloud-init YAML:

```yaml
#cloud-config
# Set hostname
hostname: my-vm-hostname

# Create users with SSH keys
users:
  - name: ubuntu
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ssh-rsa AAAA... your-key-here

# Optionally set a password (less secure than key-based)
chpasswd:
  list: |
    ubuntu:ChangeMe123!
  expire: true
ssh_pwauth: true
```

## Credential Security Best Practices

```bash
# 1. Never store private keys in VM configs or secrets
# Only store public keys

# 2. Use ed25519 keys (more secure and shorter than RSA)
ssh-keygen -t ed25519 -C "harvester-vm-access" -f ~/.ssh/harvester_ed25519

# 3. Rotate keys regularly - update the secret and let qemu-guest-agent propagate
kubectl patch secret vm-ssh-keys -n default \
    --type merge \
    -p "{\"stringData\":{\"key1\":\"$(cat ~/.ssh/harvester_ed25519.pub)\"}}"

# 4. Use RBAC to restrict who can read VM secrets
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: vm-credentials-reader
  namespace: default
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["vm-ssh-keys"]
    verbs: ["get"]
EOF
```

## Conclusion

Secure credential management is foundational to VM security in Harvester. Using SSH keys stored in Kubernetes Secrets - rather than hardcoded passwords - provides stronger security and easier key rotation. The `accessCredentials` feature with qemu-guest-agent integration is particularly powerful because it allows credential updates without VM restarts. Combine proper credential management with network segmentation and RBAC to create a defense-in-depth security posture for your VM workloads.
