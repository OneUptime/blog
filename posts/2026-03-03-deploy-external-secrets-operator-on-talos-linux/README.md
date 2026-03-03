# How to Deploy External Secrets Operator on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, External Secrets Operator, Kubernetes, Secrets Management, Security

Description: Learn how to deploy and configure the External Secrets Operator on Talos Linux to sync secrets from external providers into your Kubernetes cluster.

---

Managing secrets in Kubernetes has always been a challenge. You have credentials, API keys, database passwords, and certificates scattered across different systems. The External Secrets Operator (ESO) solves this by syncing secrets from external providers like AWS Secrets Manager, HashiCorp Vault, Azure Key Vault, and Google Secret Manager directly into Kubernetes secrets. Running ESO on Talos Linux gives you a secure, immutable operating system paired with a robust secrets management workflow.

In this guide, we will walk through deploying and configuring the External Secrets Operator on a Talos Linux cluster from scratch.

## Why External Secrets Operator on Talos Linux

Talos Linux is built for Kubernetes. It has no SSH, no shell, and no package manager. The entire OS is managed through an API, making it one of the most secure Kubernetes platforms available. When you combine this with the External Secrets Operator, you get a system where secrets never need to be stored in plain text in your Git repositories or configuration files.

The External Secrets Operator watches for ExternalSecret custom resources in your cluster and automatically creates Kubernetes Secret objects by fetching data from your external secret store. This means your GitOps workflows stay clean, and sensitive data stays where it belongs.

## Prerequisites

Before getting started, make sure you have the following in place:

- A running Talos Linux cluster with kubectl configured
- Helm v3 installed on your local machine
- Access to at least one external secret provider (Vault, AWS SM, etc.)
- A working knowledge of Kubernetes namespaces and RBAC

## Installing External Secrets Operator with Helm

The recommended way to install ESO is through the official Helm chart. Start by adding the Helm repository.

```bash
# Add the External Secrets Helm repository
helm repo add external-secrets https://charts.external-secrets.io

# Update your local Helm chart cache
helm repo update
```

Now create a dedicated namespace and install the operator.

```bash
# Create a namespace for the operator
kubectl create namespace external-secrets

# Install the External Secrets Operator
helm install external-secrets \
  external-secrets/external-secrets \
  --namespace external-secrets \
  --set installCRDs=true \
  --set webhook.port=9443
```

Verify that all the pods are running correctly.

```bash
# Check the status of the operator pods
kubectl get pods -n external-secrets

# Expected output should show three pods running:
# external-secrets-controller
# external-secrets-webhook
# external-secrets-cert-controller
```

## Configuring a SecretStore

The SecretStore resource tells ESO how to connect to your external secret provider. Let us configure one for HashiCorp Vault, since it is a common choice for teams running Talos Linux clusters.

First, create a Kubernetes secret that holds the Vault authentication token.

```yaml
# vault-token-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: vault-token
  namespace: default
type: Opaque
stringData:
  token: "hvs.your-vault-token-here"
```

```bash
# Apply the Vault token secret
kubectl apply -f vault-token-secret.yaml
```

Now create the SecretStore resource.

```yaml
# secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: default
spec:
  provider:
    vault:
      # Your Vault server address
      server: "https://vault.example.com"
      # The path where secrets are stored
      path: "secret"
      # API version for the KV engine
      version: "v2"
      auth:
        tokenSecretRef:
          name: vault-token
          key: token
```

```bash
# Apply the SecretStore configuration
kubectl apply -f secret-store.yaml

# Verify the SecretStore is ready
kubectl get secretstore vault-backend -n default
```

The status should show the store as "Valid" once it successfully connects to your Vault instance.

## Creating an ExternalSecret

With the SecretStore configured, you can now create ExternalSecret resources that pull specific secrets from Vault into Kubernetes.

```yaml
# external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: default
spec:
  # How often to sync the secret
  refreshInterval: "15m"
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  # The Kubernetes secret that will be created
  target:
    name: db-credentials
    creationPolicy: Owner
  # Map remote keys to local secret keys
  data:
    - secretKey: username
      remoteRef:
        key: database/credentials
        property: username
    - secretKey: password
      remoteRef:
        key: database/credentials
        property: password
```

```bash
# Apply the ExternalSecret
kubectl apply -f external-secret.yaml

# Check if the secret was synced successfully
kubectl get externalsecret database-credentials -n default

# Verify the Kubernetes secret was created
kubectl get secret db-credentials -n default -o jsonpath='{.data.username}' | base64 -d
```

## Using ClusterSecretStore for Multi-Namespace Access

If you need secrets accessible across multiple namespaces, use a ClusterSecretStore instead. This is especially useful in Talos Linux environments where you might have many workloads spread across different namespaces.

```yaml
# cluster-secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-cluster-store
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret"
      version: "v2"
      auth:
        tokenSecretRef:
          name: vault-token
          key: token
          namespace: external-secrets
```

Then reference it from any namespace.

```yaml
# app-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-config
  namespace: production
spec:
  refreshInterval: "30m"
  secretStoreRef:
    name: vault-cluster-store
    # Note the kind is ClusterSecretStore
    kind: ClusterSecretStore
  target:
    name: app-config-secret
  data:
    - secretKey: api-key
      remoteRef:
        key: apps/myapp
        property: api-key
```

## Configuring AWS Secrets Manager as a Provider

Many teams use AWS Secrets Manager. Here is how to set that up on Talos Linux.

```yaml
# aws-secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets
  namespace: default
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        secretRef:
          accessKeyIDSecretRef:
            name: aws-credentials
            key: access-key-id
          secretAccessKeySecretRef:
            name: aws-credentials
            key: secret-access-key
```

## Monitoring and Troubleshooting

Once everything is deployed, you should monitor the health of your External Secrets setup. The operator exposes Prometheus metrics that you can scrape.

```bash
# Check the operator logs for any issues
kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets

# View the status conditions on an ExternalSecret
kubectl describe externalsecret database-credentials -n default

# Check events for sync failures
kubectl get events -n default --field-selector reason=UpdateFailed
```

Common issues on Talos Linux include network policies blocking the operator from reaching external providers. Make sure your Talos network configuration allows outbound connections to your secret store endpoints.

## Security Best Practices

When running External Secrets Operator on Talos Linux, follow these practices to keep your cluster secure:

- Use RBAC to limit which namespaces can reference ClusterSecretStores
- Rotate your provider credentials regularly and update the corresponding Kubernetes secrets
- Set appropriate refresh intervals to balance between freshness and API rate limits
- Use the Owner creation policy so that deleting an ExternalSecret also cleans up the generated Kubernetes secret
- Enable audit logging on your external secret provider to track access patterns

## Wrapping Up

The External Secrets Operator is a natural fit for Talos Linux clusters. The immutable nature of Talos means you cannot store secrets on the filesystem, so having a robust operator that pulls secrets from external providers is exactly what you need. With proper SecretStore configuration and sensible refresh intervals, your workloads can access the credentials they need without any manual intervention. The combination of Talos Linux's security posture and ESO's automated secrets management gives you a production-ready secrets workflow that scales well across environments.
