# How to Handle Istio Secret Management in GitOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Secret, GitOps, Security, Kubernetes

Description: Securely manage Istio TLS certificates and sensitive configuration in GitOps workflows using Sealed Secrets, SOPS, and external secret stores.

---

GitOps says everything should be in Git. But secrets, especially TLS private keys and certificates used by Istio gateways, should never be stored as plain text in a repository. This creates a tension: how do you manage secrets declaratively while keeping them secure?

Several tools solve this problem in different ways. This guide covers the most practical approaches for handling Istio secrets in a GitOps workflow.

## What Secrets Does Istio Need?

Istio uses Kubernetes Secrets for several purposes:

- **TLS certificates** for Gateway resources (HTTPS termination)
- **CA certificates** for mutual TLS authentication
- **Service account tokens** for external integrations
- **Custom certificates** when using SDS (Secret Discovery Service)

The most common case is TLS certificates for ingress gateways:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: example-com-tls
  namespace: istio-ingress
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-certificate>
  tls.key: <base64-encoded-private-key>
```

The Gateway references this secret by name:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-ingress
spec:
  selector:
    istio: ingress
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      hosts:
        - "*.example.com"
      tls:
        mode: SIMPLE
        credentialName: example-com-tls
```

## Option 1: Sealed Secrets

Bitnami Sealed Secrets encrypts secrets so they can be safely stored in Git. Only the controller running in your cluster can decrypt them.

Install the Sealed Secrets controller:

```bash
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm install sealed-secrets sealed-secrets/sealed-secrets \
  -n kube-system
```

Install the kubeseal CLI:

```bash
brew install kubeseal
```

Encrypt your Istio TLS secret:

```bash
kubectl create secret tls example-com-tls \
  --cert=tls.crt \
  --key=tls.key \
  --namespace=istio-ingress \
  --dry-run=client \
  -o yaml | \
  kubeseal --format yaml > sealed-secret-example-com-tls.yaml
```

The resulting sealed secret can be safely committed to Git:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: example-com-tls
  namespace: istio-ingress
spec:
  encryptedData:
    tls.crt: AgBy3i4OJSWK+PiTySYZ...
    tls.key: AgBu7Fhk+R8sNQ12r4...
  template:
    metadata:
      name: example-com-tls
      namespace: istio-ingress
    type: kubernetes.io/tls
```

When your GitOps tool applies this resource, the Sealed Secrets controller decrypts it and creates the actual Kubernetes Secret.

## Option 2: SOPS with Age or AWS KMS

Mozilla SOPS encrypts individual values within a YAML file, leaving the structure readable. This is nice because you can still see the resource kind and metadata in plain text.

Install SOPS:

```bash
brew install sops
```

Create an Age key (simpler than GPG):

```bash
age-keygen -o age-key.txt
```

Create a SOPS config file:

```yaml
# .sops.yaml
creation_rules:
  - path_regex: secrets/.*\.yaml$
    age: age1qxr4y3xv8scqp9rx5g8d7jvwzetjnp7l0d3y5zy5xwq8q7k3d9s2lh6v0
```

Encrypt your secret:

```bash
# Create the secret YAML first
cat > secrets/example-com-tls.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: example-com-tls
  namespace: istio-ingress
type: kubernetes.io/tls
stringData:
  tls.crt: |
    -----BEGIN CERTIFICATE-----
    MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiU...
    -----END CERTIFICATE-----
  tls.key: |
    -----BEGIN PRIVATE KEY-----
    MIIEvgIBADANBgkqhkiG9w0BAQEFAASC...
    -----END PRIVATE KEY-----
EOF

# Encrypt it
sops --encrypt --in-place secrets/example-com-tls.yaml
```

The encrypted file is safe to commit. The structure is preserved but sensitive values are encrypted:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: example-com-tls
  namespace: istio-ingress
type: kubernetes.io/tls
stringData:
  tls.crt: ENC[AES256_GCM,data:ab3d8f...,type:str]
  tls.key: ENC[AES256_GCM,data:7c4e2a...,type:str]
sops:
  age:
    - recipient: age1qxr4y3xv8scqp9rx5g8d7jvwzetjnp7l0d3y5zy5xwq8q7k3d9s2lh6v0
      enc: |
        -----BEGIN AGE ENCRYPTED FILE-----
        ...
        -----END AGE ENCRYPTED FILE-----
```

### Using SOPS with Flux CD

Flux has native SOPS support. Configure it in your Kustomization:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: istio-secrets
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./secrets
  prune: true
  decryption:
    provider: sops
    secretRef:
      name: sops-age-key
```

Create the decryption key secret in the cluster:

```bash
kubectl create secret generic sops-age-key \
  --namespace=flux-system \
  --from-file=age.agekey=age-key.txt
```

### Using SOPS with Argo CD

Install the SOPS plugin for Argo CD:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  configManagementPlugins: |
    - name: sops
      generate:
        command: ["bash", "-c"]
        args:
          - |
            for f in *.yaml; do
              sops --decrypt "$f"
            done
```

## Option 3: External Secrets Operator

External Secrets Operator pulls secrets from external stores like AWS Secrets Manager, HashiCorp Vault, or Azure Key Vault. The secrets never touch Git at all.

Install the operator:

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  -n external-secrets --create-namespace
```

Configure a SecretStore:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets
  namespace: istio-ingress
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
```

Create an ExternalSecret that pulls the TLS cert:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: example-com-tls
  namespace: istio-ingress
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets
    kind: SecretStore
  target:
    name: example-com-tls
    template:
      type: kubernetes.io/tls
  data:
    - secretKey: tls.crt
      remoteRef:
        key: istio/example-com-tls
        property: certificate
    - secretKey: tls.key
      remoteRef:
        key: istio/example-com-tls
        property: private_key
```

This ExternalSecret resource is safe to store in Git because it only contains references, not actual secret data. The operator resolves the references and creates the Kubernetes Secret in the cluster.

## Option 4: cert-manager for Automatic Certificates

For TLS certificates, the best approach is often to not manage them manually at all. cert-manager automates certificate issuance and renewal:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: example-com
  namespace: istio-ingress
spec:
  secretName: example-com-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - example.com
    - "*.example.com"
```

This Certificate resource lives in Git. cert-manager handles the actual certificate lifecycle (request, validate, store, renew). Your Istio Gateway references the generated secret by name.

## Rotating Secrets

Regardless of which approach you use, you need a rotation strategy.

For Sealed Secrets, re-encrypt and commit:

```bash
kubeseal --re-encrypt < sealed-secret.yaml > sealed-secret-new.yaml
mv sealed-secret-new.yaml sealed-secret.yaml
git add sealed-secret.yaml
git commit -m "rotate TLS certificate for example.com"
```

For External Secrets, update the secret in the external store and the operator handles the rest. Set `refreshInterval` to control how quickly changes propagate.

For cert-manager, rotation is fully automatic. Certificates renew before expiration with no manual intervention.

Handling secrets in a GitOps workflow for Istio comes down to choosing the right tool for your environment. If you already have a secret management system like Vault or AWS Secrets Manager, External Secrets Operator is the cleanest integration. If you want everything self-contained within the cluster, Sealed Secrets or SOPS work well. And for TLS certificates specifically, cert-manager eliminates the problem entirely by automating the full lifecycle.
