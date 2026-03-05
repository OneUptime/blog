# How to Use SOPS with Helm Values in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, SOPS, Helm, Secrets Management

Description: Learn how to encrypt Helm values files with Mozilla SOPS and have Flux CD automatically decrypt them during HelmRelease reconciliation.

---

Helm charts often require sensitive values like database passwords, API keys, and TLS certificates. Storing these values in plaintext in a Git repository is a security risk. Mozilla SOPS provides a solution by encrypting sensitive data while keeping it version-controlled. Flux CD has built-in support for SOPS decryption, making it straightforward to use encrypted Helm values in your GitOps workflow.

## How SOPS Works with Flux

Flux CD's kustomize-controller handles SOPS decryption natively. When a Kustomization resource is configured with a decryption provider, Flux decrypts any SOPS-encrypted files before applying them. For Helm values, the pattern involves creating a Kubernetes Secret from your encrypted values file and referencing that Secret in your HelmRelease.

## Setting Up the Encryption Key

SOPS supports multiple key management backends including AWS KMS, GCP KMS, Azure Key Vault, and age. For this guide, we will use age because it is simple and does not require cloud provider infrastructure.

Generate an age key pair:

```bash
age-keygen -o age.agekey
```

This produces output like:

```text
# created: 2026-03-05T10:00:00Z
# public key: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
AGE-SECRET-KEY-1QFMEJ...
```

Create a Kubernetes secret with the age private key so Flux can decrypt:

```bash
cat age.agekey | kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin
```

## Configuring SOPS Rules

Create a `.sops.yaml` file at the root of your repository to define encryption rules:

```yaml
creation_rules:
  - path_regex: .*-values\.yaml$
    encrypted_regex: ^(data|stringData|password|secret|token|key|apiKey|connectionString)$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

The `encrypted_regex` field tells SOPS to only encrypt specific keys within the YAML file. This means non-sensitive values remain readable while secrets are encrypted.

## Creating Encrypted Helm Values

Write your Helm values file with sensitive data included:

```yaml
# apps/my-app/secret-values.yaml
database:
  password: my-super-secret-password
  connectionString: postgresql://admin:my-super-secret-password@db.example.com:5432/mydb
redis:
  token: redis-auth-token-12345
replicaCount: 3
image:
  tag: v1.2.3
```

Encrypt the file with SOPS:

```bash
sops --encrypt --in-place apps/my-app/secret-values.yaml
```

After encryption, the file looks like this (non-sensitive fields remain in plaintext if they do not match the `encrypted_regex`):

```yaml
database:
    password: ENC[AES256_GCM,data:kD8gJ+L2mN...,type:str]
    connectionString: ENC[AES256_GCM,data:pQ9rT+vW3x...,type:str]
redis:
    token: ENC[AES256_GCM,data:zB5cF+hJ7k...,type:str]
replicaCount: 3
image:
    tag: v1.2.3
sops:
    age:
        - recipient: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
          enc: |
            -----BEGIN AGE ENCRYPTED FILE-----
            ...
            -----END AGE ENCRYPTED FILE-----
    lastmodified: "2026-03-05T10:00:00Z"
    version: 3.7.3
```

## Creating the Kustomization for Secrets

You need a Kustomization that generates a Kubernetes Secret from the encrypted values file. Create a `kustomization.yaml` in the same directory:

```yaml
# apps/my-app/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources: []
secretGenerator:
  - name: my-app-helm-values
    namespace: default
    files:
      - values.yaml=secret-values.yaml
generatorOptions:
  disableNameSuffixHash: true
```

Now create the Flux Kustomization resource that handles decryption:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-helm-values
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age
  targetNamespace: default
```

## Referencing Encrypted Values in HelmRelease

With the Secret created by the Kustomization above, reference it in your HelmRelease using `valuesFrom`:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  dependsOn:
    - name: my-app-helm-values
      namespace: flux-system
  chart:
    spec:
      chart: my-app
      version: "1.2.x"
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system
  values:
    replicaCount: 3
    image:
      tag: v1.2.3
  valuesFrom:
    - kind: Secret
      name: my-app-helm-values
      valuesKey: values.yaml
```

The `dependsOn` field ensures the Secret is created before the HelmRelease tries to use it. The `values` field contains non-sensitive defaults, while `valuesFrom` pulls in the decrypted secret values. Values from `valuesFrom` override those in `values` when keys overlap.

## Editing Encrypted Files

To edit an encrypted file, use the SOPS editor command:

```bash
sops apps/my-app/secret-values.yaml
```

This opens the decrypted content in your default editor. When you save and close, SOPS re-encrypts the file automatically.

## Handling Multiple Environments

For multiple environments, use separate values files with SOPS encryption rules per path:

```yaml
# .sops.yaml
creation_rules:
  - path_regex: environments/production/.*-values\.yaml$
    age: age1prodkey...
  - path_regex: environments/staging/.*-values\.yaml$
    age: age1stagingkey...
```

This lets you use different encryption keys per environment, limiting blast radius if a key is compromised.

## Verifying the Setup

After committing your encrypted values and Flux resources, verify that everything works:

```bash
flux reconcile kustomization my-app-helm-values --with-source
kubectl get secret my-app-helm-values -n default -o jsonpath='{.data.values\.yaml}' | base64 -d
```

The output should show your decrypted values, confirming that Flux successfully decrypted the SOPS-encrypted file.

## Common Pitfalls

Forgetting to add the `decryption` block to the Kustomization is the most common mistake. Without it, Flux applies the encrypted data as-is, resulting in garbled Secret values. Always verify that the `sops-age` secret exists in the `flux-system` namespace and that the age key matches the public key used for encryption. If you rotate your age key, you must re-encrypt all SOPS files with the new key before removing the old one from the cluster.
