# How to Use Secret References in Dapr Binding Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, Secret, Security, Kubernetes

Description: Learn how to use Dapr secret store references in binding component specs to avoid hardcoding credentials, with examples for Kubernetes Secrets and HashiCorp Vault.

---

## Why Secret References Matter

Hardcoding credentials in component YAML files is a security risk, especially when those files are committed to source control. Dapr's secret references allow binding components to pull sensitive values at runtime from a configured secret store, keeping credentials out of your manifests.

## How Secret References Work

In a Dapr component spec, replace plaintext credential values with `secretKeyRef` blocks that point to a named secret and key in a Dapr-configured secret store:

```yaml
metadata:
  - name: accessKey
    secretKeyRef:
      name: my-secret-store-secret-name
      key: awsAccessKey
```

Dapr resolves these references at component initialization time using the secret store component you've configured.

## Setting Up a Kubernetes Secret Store

The most common secret store in Kubernetes is the built-in Secrets resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kubernetes-secrets
  namespace: default
spec:
  type: secretstores.kubernetes
  version: v1
```

Create the actual secret:

```bash
kubectl create secret generic aws-credentials \
  --from-literal=accessKey=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secretKey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Referencing the Secret in a Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: data-lake
  namespace: default
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
    - name: bucket
      value: "my-data-lake"
    - name: region
      value: "us-east-1"
    - name: accessKey
      secretKeyRef:
        name: aws-credentials
        key: accessKey
    - name: secretKey
      secretKeyRef:
        name: aws-credentials
        key: secretKey
```

No credentials appear in the binding YAML - Dapr resolves them from the Kubernetes Secret at runtime.

## Using HashiCorp Vault as a Secret Store

For more advanced secret management with rotation and audit logging, use Vault:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault-store
  namespace: default
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
    - name: vaultAddr
      value: "https://vault.example.com:8200"
    - name: skipVerify
      value: "false"
    - name: tlsServerName
      value: "vault.example.com"
    - name: vaultTokenMountPath
      value: "/var/run/secrets/vault/token"
    - name: enginePath
      value: "secret"
```

Store a secret in Vault:

```bash
vault kv put secret/dapr/bindings/stripe \
  apiKey=sk_live_XXXXXXXXXXXXX \
  webhookSecret=whsec_XXXXXXXX
```

Reference it in a binding component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: stripe-gateway
spec:
  type: bindings.http
  version: v1
  metadata:
    - name: url
      value: "https://api.stripe.com/v1"
    - name: securityToken
      secretKeyRef:
        name: bindings/stripe
        key: apiKey
    - name: securityTokenHeader
      value: "Authorization"
auth:
  secretStore: vault-store
```

## Secret Store Permission Requirements

Ensure the Dapr service account has permission to read secrets:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dapr-secret-reader
  namespace: default
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list"]
    resourceNames: ["aws-credentials", "azure-credentials", "stripe-credentials"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dapr-secret-reader-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: dapr-secret-reader
subjects:
  - kind: ServiceAccount
    name: default
    namespace: default
```

## Local Development Without Kubernetes

For local development, use the local file secret store:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-secrets
spec:
  type: secretstores.local.file
  version: v1
  metadata:
    - name: secretsFile
      value: "./secrets.json"
    - name: nestedSeparator
      value: ":"
```

Create a local secrets file (never commit this to git):

```json
{
  "aws-credentials": {
    "accessKey": "AKIAIOSFODNN7EXAMPLE",
    "secretKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  }
}
```

## Summary

Dapr secret references keep credentials out of component YAML files by resolving them at runtime from a configured secret store. Use the Kubernetes secret store for standard deployments, HashiCorp Vault for enterprise-grade rotation and audit logging, and the local file store for development. This approach enables safe storage of component files in source control without exposing sensitive credentials.
