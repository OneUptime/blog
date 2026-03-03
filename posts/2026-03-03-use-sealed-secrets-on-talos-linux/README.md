# How to Use Sealed Secrets on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Sealed Secrets, Kubernetes, GitOps, Secrets Management

Description: Learn how to use Bitnami Sealed Secrets on Talos Linux to safely store encrypted secrets in Git repositories.

---

One of the biggest pain points in GitOps workflows is handling secrets. You want everything in Git - your deployments, services, config maps - but you obviously cannot commit plaintext Kubernetes Secrets to a repository. Bitnami Sealed Secrets solves this problem elegantly. It lets you encrypt secrets locally using a public key, commit the encrypted version to Git, and then the Sealed Secrets controller running in your cluster decrypts them back into regular Kubernetes Secrets.

Talos Linux clusters are a great fit for Sealed Secrets because the immutable nature of Talos already pushes you toward fully declarative, Git-driven workflows. In this guide, we will set up Sealed Secrets on Talos Linux and walk through the complete workflow from encryption to deployment.

## How Sealed Secrets Works

The architecture is straightforward. A controller runs in your cluster and holds a private key. You use a CLI tool called `kubeseal` on your local machine to encrypt secrets using the controller's public key. The encrypted resource, called a SealedSecret, can be safely stored in version control. When applied to the cluster, the controller decrypts the SealedSecret and creates a standard Kubernetes Secret.

The key point is that only the controller can decrypt the secrets. Even if someone gains access to your Git repository, they cannot read the secret values without the controller's private key.

## Installing the Sealed Secrets Controller

Deploy the controller using Helm.

```bash
# Add the Sealed Secrets Helm repository
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets

# Update the repo index
helm repo update

# Install the controller
helm install sealed-secrets sealed-secrets/sealed-secrets \
  --namespace kube-system \
  --set resources.requests.memory=64Mi \
  --set resources.requests.cpu=50m \
  --set resources.limits.memory=128Mi \
  --set resources.limits.cpu=100m
```

Verify the installation.

```bash
# Check the controller is running
kubectl get pods -n kube-system -l app.kubernetes.io/name=sealed-secrets

# Check the controller logs
kubectl logs -n kube-system -l app.kubernetes.io/name=sealed-secrets
```

## Installing kubeseal CLI

The `kubeseal` CLI is needed on your local machine to encrypt secrets.

```bash
# On macOS with Homebrew
brew install kubeseal

# On Linux, download the binary directly
KUBESEAL_VERSION=$(curl -s https://api.github.com/repos/bitnami-labs/sealed-secrets/releases/latest | grep tag_name | cut -d '"' -f4 | cut -d 'v' -f2)

wget "https://github.com/bitnami-labs/sealed-secrets/releases/download/v${KUBESEAL_VERSION}/kubeseal-${KUBESEAL_VERSION}-linux-amd64.tar.gz"
tar -xvzf kubeseal-${KUBESEAL_VERSION}-linux-amd64.tar.gz
sudo install -m 755 kubeseal /usr/local/bin/kubeseal
```

Verify connectivity to the controller.

```bash
# Fetch the public key from the controller
kubeseal --fetch-cert \
  --controller-name=sealed-secrets \
  --controller-namespace=kube-system > sealed-secrets-pub.pem

# Check the certificate content
openssl x509 -in sealed-secrets-pub.pem -noout -text | head -20
```

## Creating Your First Sealed Secret

Start by creating a regular Kubernetes Secret manifest (do not apply it to the cluster).

```bash
# Create a secret manifest without applying it
kubectl create secret generic my-app-secrets \
  --from-literal=database-password=supersecret123 \
  --from-literal=api-key=ak_live_abc123def456 \
  --dry-run=client \
  --output=yaml > my-app-secrets.yaml
```

Now encrypt it with kubeseal.

```bash
# Encrypt the secret into a SealedSecret
kubeseal --format=yaml \
  --controller-name=sealed-secrets \
  --controller-namespace=kube-system \
  < my-app-secrets.yaml > my-app-sealed-secrets.yaml

# Remove the plaintext secret - you do not need it anymore
rm my-app-secrets.yaml
```

Look at the sealed version.

```bash
# View the encrypted SealedSecret
cat my-app-sealed-secrets.yaml
```

The output will look something like this:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: my-app-secrets
  namespace: default
spec:
  encryptedData:
    api-key: AgBy3i4OJSWK+PiTySYZZA9rO43...
    database-password: AgCtr45sGPORhBd2M0H7fp...
  template:
    metadata:
      name: my-app-secrets
      namespace: default
    type: Opaque
```

This file is safe to commit to your Git repository.

```bash
# Apply the SealedSecret to the cluster
kubectl apply -f my-app-sealed-secrets.yaml

# Verify the controller created the Kubernetes Secret
kubectl get secret my-app-secrets -o yaml

# Check the SealedSecret status
kubectl get sealedsecret my-app-secrets
```

## Scoping Options

Sealed Secrets supports three scoping modes that control how tightly the encrypted values are bound to their metadata:

1. **strict** (default): The SealedSecret must be applied with the exact same name and namespace. This is the most secure option.

2. **namespace-wide**: The SealedSecret can be used with any name within the same namespace.

3. **cluster-wide**: The SealedSecret can be used anywhere in the cluster.

```bash
# Create a namespace-scoped sealed secret
kubeseal --format=yaml \
  --scope namespace-wide \
  --controller-name=sealed-secrets \
  --controller-namespace=kube-system \
  < my-secret.yaml > my-sealed-secret.yaml

# Create a cluster-wide sealed secret
kubeseal --format=yaml \
  --scope cluster-wide \
  --controller-name=sealed-secrets \
  --controller-namespace=kube-system \
  < my-secret.yaml > my-sealed-secret.yaml
```

For most use cases, the default strict scope is recommended because it prevents someone from copying the SealedSecret to a different namespace.

## Key Management and Rotation

The Sealed Secrets controller generates a new key pair every 30 days by default. Old keys are kept so that existing SealedSecrets can still be decrypted, but new SealedSecrets will use the latest key.

```bash
# List all sealing keys
kubectl get secrets -n kube-system -l sealedsecrets.bitnami.com/sealed-secrets-key

# Back up the private keys (critical for disaster recovery)
kubectl get secrets -n kube-system \
  -l sealedsecrets.bitnami.com/sealed-secrets-key \
  -o yaml > sealed-secrets-keys-backup.yaml
```

Store the key backup securely outside your cluster. If you lose the private keys, you will not be able to decrypt any existing SealedSecrets.

To re-encrypt all SealedSecrets with the latest key:

```bash
# Re-encrypt a SealedSecret with the current active key
kubeseal --re-encrypt \
  --controller-name=sealed-secrets \
  --controller-namespace=kube-system \
  < my-app-sealed-secrets.yaml > my-app-sealed-secrets-reencrypted.yaml
```

## Integrating with GitOps on Talos Linux

If you use ArgoCD or Flux on your Talos Linux cluster, Sealed Secrets integrates seamlessly. Store SealedSecret manifests in your Git repository alongside your other Kubernetes manifests.

```
# Repository structure example
my-app/
  base/
    deployment.yaml
    service.yaml
    sealed-secrets.yaml    # Encrypted secrets safe for Git
  overlays/
    production/
      kustomization.yaml
      sealed-secrets.yaml  # Production-specific encrypted secrets
    staging/
      kustomization.yaml
      sealed-secrets.yaml  # Staging-specific encrypted secrets
```

When ArgoCD or Flux syncs the repository, it applies the SealedSecret resources, and the controller decrypts them into regular Kubernetes Secrets that your deployments can reference.

## Disaster Recovery on Talos Linux

Since Talos Linux is immutable and nodes can be replaced entirely, your Sealed Secrets controller and its keys need special attention during cluster recovery.

```bash
# Step 1: Back up the private keys regularly
kubectl get secrets -n kube-system \
  -l sealedsecrets.bitnami.com/sealed-secrets-key \
  -o yaml > sealed-secrets-backup.yaml

# Step 2: Store the backup in a secure external location
# (e.g., encrypted S3 bucket, Vault, or a secure file store)

# Step 3: When restoring to a new Talos cluster, apply the keys first
kubectl apply -f sealed-secrets-backup.yaml

# Step 4: Then install the Sealed Secrets controller
# It will pick up the existing keys automatically
```

Always test your disaster recovery process. Spin up a fresh Talos cluster, restore the keys, install the controller, and verify that your SealedSecrets decrypt correctly.

## Troubleshooting Common Issues

If a SealedSecret is not being decrypted, check these common causes:

```bash
# Check the controller logs for decryption errors
kubectl logs -n kube-system -l app.kubernetes.io/name=sealed-secrets

# Verify the SealedSecret was created in the correct namespace
kubectl get sealedsecret -A

# Check events on the SealedSecret
kubectl describe sealedsecret my-app-secrets
```

Common problems include namespace mismatches (the SealedSecret was encrypted for a different namespace), key rotation issues (the encrypting key was deleted), and scope conflicts.

## Wrapping Up

Sealed Secrets provides a simple and effective way to manage secrets in a GitOps workflow on Talos Linux. The ability to safely commit encrypted secrets to Git eliminates the gap that usually exists in fully declarative cluster management. On Talos Linux specifically, where everything is API-driven and you cannot manually intervene on nodes, having your secrets as part of your Git repository means your entire cluster state can be reconstructed from code. Just remember to back up the controller's private keys and store them securely outside the cluster, because losing them means losing access to all your encrypted secrets.
