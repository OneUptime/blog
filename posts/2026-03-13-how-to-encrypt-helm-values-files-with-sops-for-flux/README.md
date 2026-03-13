# How to Encrypt Helm Values Files with SOPS for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secrets, Encryption, Helm, HelmRelease

Description: Learn how to encrypt sensitive values in Helm values files using SOPS and deploy them securely through Flux HelmReleases.

---

Helm charts often require sensitive configuration values such as database passwords, API keys, and connection strings. When using Flux for GitOps, these values files live in your Git repository. SOPS lets you encrypt the sensitive portions of Helm values files so they can be safely committed to Git while Flux handles decryption during deployment. This guide walks through the complete setup.

## How Flux Handles Encrypted Helm Values

Flux HelmReleases can reference values from ConfigMaps or Secrets. When combined with SOPS-encrypted Kubernetes Secrets, Flux decrypts the secret during reconciliation and passes the decrypted values to the Helm chart. The key mechanism is the `valuesFrom` field in the HelmRelease spec.

## Prerequisites

Ensure you have:

- A Kubernetes cluster with Flux installed
- SOPS and age installed locally
- A Helm chart you want to deploy via Flux
- An age key pair generated and the private key stored as a Kubernetes secret in the flux-system namespace

## Setting Up the Age Key in Flux

If you have not already configured the decryption key:

```bash
age-keygen -o age.agekey

cat age.agekey | kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin
```

## Creating the .sops.yaml Configuration

Configure SOPS to encrypt only the `stringData` field of Kubernetes Secrets that hold Helm values:

```yaml
creation_rules:
  - path_regex: .*helm-values.*\.yaml$
    age: age1yourpublickey...
    encrypted_regex: ^(data|stringData)$
```

## Creating an Encrypted Helm Values Secret

Wrap your Helm values in a Kubernetes Secret manifest:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: myapp-helm-values
  namespace: flux-system
type: Opaque
stringData:
  values.yaml: |
    database:
      host: db.internal.example.com
      port: 5432
      username: appuser
      password: supersecretdbpassword
    redis:
      host: redis.internal.example.com
      password: redispassword123
    api:
      secretKey: my-api-secret-key-here
```

Encrypt the file with SOPS:

```bash
sops --encrypt --in-place myapp-helm-values.yaml
```

After encryption, the `stringData.values.yaml` content is encrypted while the metadata remains readable.

## Configuring the HelmRelease

Create a HelmRelease that references the encrypted values secret:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: myapp
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: myapp
      version: "1.2.3"
      sourceRef:
        kind: HelmRepository
        name: myapp-repo
        namespace: flux-system
  valuesFrom:
    - kind: Secret
      name: myapp-helm-values
      valuesKey: values.yaml
```

## Setting Up the Kustomization for Decryption

Create a Flux Kustomization that deploys both the encrypted secret and the HelmRelease, with SOPS decryption enabled:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

Flux decrypts the SOPS-encrypted secret during reconciliation, creates the Kubernetes Secret in the cluster, and the HelmRelease reads values from it.

## Mixing Encrypted and Plain Values

You can combine encrypted values with non-sensitive inline values in the HelmRelease:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: myapp
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: myapp
      version: "1.2.3"
      sourceRef:
        kind: HelmRepository
        name: myapp-repo
        namespace: flux-system
  values:
    replicaCount: 3
    image:
      repository: myapp
      tag: latest
    resources:
      limits:
        cpu: 500m
        memory: 256Mi
  valuesFrom:
    - kind: Secret
      name: myapp-helm-values
      valuesKey: values.yaml
```

The `values` field contains non-sensitive configuration in plaintext, while `valuesFrom` pulls sensitive values from the decrypted secret. Values from `valuesFrom` override matching keys in `values`.

## Multiple Values Secrets

For complex applications, split sensitive values into separate secrets:

```yaml
valuesFrom:
  - kind: Secret
    name: myapp-db-values
    valuesKey: values.yaml
  - kind: Secret
    name: myapp-api-values
    valuesKey: values.yaml
  - kind: ConfigMap
    name: myapp-common-values
    valuesKey: values.yaml
```

Each secret can be encrypted with different keys if needed.

## Directory Structure

A recommended directory structure for this pattern:

```
apps/
  myapp/
    kustomization.yaml
    helmrelease.yaml
    myapp-helm-values.yaml    # SOPS encrypted
    myapp-common-values.yaml  # Plain ConfigMap
```

The `kustomization.yaml` includes all resources:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - helmrelease.yaml
  - myapp-helm-values.yaml
  - myapp-common-values.yaml
```

## Updating Encrypted Values

To update the encrypted values:

```bash
# Decrypt, edit, and re-encrypt
sops myapp-helm-values.yaml
# This opens the file in your editor with decrypted content
# Make changes, save, and SOPS re-encrypts automatically
```

Or decrypt to a temporary file, edit, and re-encrypt:

```bash
sops --decrypt myapp-helm-values.yaml > /tmp/values-decrypted.yaml
# Edit /tmp/values-decrypted.yaml
sops --encrypt /tmp/values-decrypted.yaml > myapp-helm-values.yaml
rm /tmp/values-decrypted.yaml
```

## Verifying the Deployment

After pushing changes, check that Flux successfully deploys:

```bash
# Check Kustomization status
flux get kustomizations myapp

# Check HelmRelease status
flux get helmreleases -n default myapp

# Verify the secret exists in the cluster
kubectl get secret myapp-helm-values -n flux-system

# Check the HelmRelease applied values
kubectl get helmrelease myapp -n default -o jsonpath='{.status.conditions}'
```

## Conclusion

Encrypting Helm values files with SOPS in Flux provides a secure way to manage sensitive chart configurations in Git. By wrapping values in Kubernetes Secrets and using SOPS encryption, you maintain the GitOps workflow while keeping credentials protected. Flux handles the decryption and secret creation transparently, making this approach both secure and operationally simple.
