# How to Encrypt SSH Keys with SOPS for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secrets, Encryption, SSH, Keys

Description: Learn how to encrypt SSH private keys using SOPS and deploy them securely through Flux for applications that need SSH access.

---

Applications running in Kubernetes sometimes need SSH access to external systems for tasks like Git operations, SFTP transfers, or remote command execution. SSH private keys stored in Kubernetes Secrets must be encrypted before committing to a Git repository. This guide explains how to encrypt SSH keys with SOPS and manage them through Flux.

## Use Cases for SSH Keys in Kubernetes

Common scenarios where pods need SSH keys include applications that clone private Git repositories, batch jobs that transfer files via SFTP, CI/CD runners that deploy to remote servers, and backup scripts that connect to remote storage systems.

## Prerequisites

You need:

- A Kubernetes cluster with Flux and SOPS decryption configured
- SOPS and age CLI tools
- An SSH key pair to store in the cluster
- An age key pair configured in Flux

## Creating the SSH Key Secret

Generate an SSH key pair if you do not already have one:

```bash
ssh-keygen -t ed25519 -f deploy-key -N "" -C "deploy@example.com"
```

Create a Kubernetes Secret manifest containing the private key:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ssh-credentials
  namespace: default
type: kubernetes.io/ssh-auth
stringData:
  ssh-privatekey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    b3BlbnNzaC1rZXktdjEAAAAABG5vbm...
    ...key content...
    -----END OPENSSH PRIVATE KEY-----
```

Alternatively, generate the manifest from the key file:

```bash
kubectl create secret generic ssh-credentials \
  --from-file=ssh-privatekey=deploy-key \
  --namespace=default \
  --dry-run=client -o yaml > ssh-secret.yaml
```

## Including Known Hosts

For secure SSH connections, include the known hosts file:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ssh-credentials
  namespace: default
type: Opaque
stringData:
  ssh-privatekey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ...key content...
    -----END OPENSSH PRIVATE KEY-----
  known_hosts: |
    github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
    gitlab.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAfuCHKVTjquxvt6CM6tdG4SLp1Btn/nOeHHE5UOzRdf
```

## Configuring SOPS

Set up `.sops.yaml` for SSH key files:

```yaml
creation_rules:
  - path_regex: .*ssh.*\.yaml$
    age: age1yourkey...
    encrypted_regex: ^(data|stringData)$
```

## Encrypting the SSH Secret

Encrypt the manifest:

```bash
sops --encrypt --in-place ssh-secret.yaml
```

The private key content is now encrypted while the secret metadata remains readable.

## Deploying with Flux

Create a Flux Kustomization:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ssh-credentials
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/ssh
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

## Mounting SSH Keys in Pods

Mount the SSH key in a pod using volume mounts:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: git-sync
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: git-sync
  template:
    metadata:
      labels:
        app: git-sync
    spec:
      containers:
        - name: git-sync
          image: registry.k8s.io/git-sync/git-sync:v4.0.0
          env:
            - name: GITSYNC_REPO
              value: "git@github.com:org/private-repo.git"
            - name: GITSYNC_SSH
              value: "true"
          volumeMounts:
            - name: ssh-key
              mountPath: /etc/git-secret
              readOnly: true
      volumes:
        - name: ssh-key
          secret:
            secretName: ssh-credentials
            defaultMode: 0400
```

The `defaultMode: 0400` ensures the SSH key has the correct permissions (read-only by owner).

## Using SSH Keys with Init Containers

For one-time SSH operations during pod startup:

```yaml
initContainers:
  - name: clone-repo
    image: alpine/git
    command:
      - sh
      - -c
      - |
        mkdir -p /root/.ssh
        cp /ssh/ssh-privatekey /root/.ssh/id_ed25519
        chmod 600 /root/.ssh/id_ed25519
        cp /ssh/known_hosts /root/.ssh/known_hosts
        git clone git@github.com:org/private-repo.git /data/repo
    volumeMounts:
      - name: ssh-key
        mountPath: /ssh
        readOnly: true
      - name: repo-data
        mountPath: /data
volumes:
  - name: ssh-key
    secret:
      secretName: ssh-credentials
  - name: repo-data
    emptyDir: {}
```

## Multiple SSH Keys for Different Hosts

When you need SSH keys for different services, create separate secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-ssh
  namespace: default
type: Opaque
stringData:
  ssh-privatekey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ...github deploy key...
    -----END OPENSSH PRIVATE KEY-----
---
apiVersion: v1
kind: Secret
metadata:
  name: sftp-ssh
  namespace: default
type: Opaque
stringData:
  ssh-privatekey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ...sftp server key...
    -----END OPENSSH PRIVATE KEY-----
```

Encrypt each with SOPS and mount them at different paths in the pod.

## SSH Config for Multiple Hosts

Include an SSH config file to manage multiple keys:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ssh-config
  namespace: default
type: Opaque
stringData:
  config: |
    Host github.com
      IdentityFile /ssh/github/ssh-privatekey
      StrictHostKeyChecking yes
      UserKnownHostsFile /ssh/known_hosts

    Host sftp.example.com
      IdentityFile /ssh/sftp/ssh-privatekey
      StrictHostKeyChecking yes
      UserKnownHostsFile /ssh/known_hosts
  known_hosts: |
    github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
```

## Key Rotation

When rotating SSH keys:

```bash
# Generate a new key pair
ssh-keygen -t ed25519 -f new-deploy-key -N ""

# Update the encrypted secret
sops ssh-secret.yaml
# Replace the private key content in the editor
# Save and close

# Add the new public key to the target system
# Remove the old public key from the target system
```

Commit and push the updated encrypted secret. Flux deploys the new key to the cluster.

## Verifying the Deployment

```bash
# Check the secret exists
kubectl get secret ssh-credentials -n default

# Verify key permissions in a pod
kubectl exec deployment/git-sync -- ls -la /etc/git-secret/

# Test SSH connectivity from the pod
kubectl exec deployment/git-sync -- ssh -T git@github.com
```

## Conclusion

Encrypting SSH keys with SOPS in Flux provides a secure, version-controlled way to manage SSH credentials in your Kubernetes cluster. By encrypting the private key material and letting Flux handle decryption during deployment, you maintain the GitOps workflow while keeping sensitive key material protected in your repository.
