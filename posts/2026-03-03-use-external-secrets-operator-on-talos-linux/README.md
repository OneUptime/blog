# How to Use External Secrets Operator on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, External Secrets Operator, Kubernetes, Secrets Management, Security

Description: Learn how to install and configure the External Secrets Operator on Talos Linux to sync secrets from external providers into Kubernetes.

---

Managing secrets in Kubernetes has always been a challenge. Storing sensitive values like API keys, database passwords, and certificates directly inside Kubernetes Secret objects works, but it creates problems around versioning, rotation, and centralized management. The External Secrets Operator (ESO) solves this by allowing you to pull secrets from external providers like AWS Secrets Manager, HashiCorp Vault, Azure Key Vault, and others directly into your Kubernetes cluster.

Talos Linux, with its immutable and API-driven design, is a natural fit for this kind of workflow. Since you cannot SSH into Talos nodes or drop configuration files onto the filesystem, having a declarative approach to secrets management through ESO becomes even more valuable. In this guide, we will walk through the full process of setting up External Secrets Operator on a Talos Linux cluster.

## Prerequisites

Before you begin, make sure you have:

- A running Talos Linux cluster with kubectl access
- Helm installed on your local machine
- An external secrets provider account (we will use AWS Secrets Manager as an example)
- talosctl configured and pointing to your cluster

## Installing External Secrets Operator

The easiest way to install ESO is through its official Helm chart. Start by adding the repository.

```bash
# Add the External Secrets Helm repository
helm repo add external-secrets https://charts.external-secrets.io

# Update the repo index
helm repo update
```

Now install the operator into its own namespace.

```bash
# Create a dedicated namespace for ESO
kubectl create namespace external-secrets

# Install the External Secrets Operator
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --set installCRDs=true \
  --set webhook.port=9443
```

Wait for the pods to become ready.

```bash
# Verify the installation
kubectl get pods -n external-secrets

# You should see three pods running:
# external-secrets-controller
# external-secrets-webhook
# external-secrets-cert-controller
```

## Understanding the ESO Architecture

External Secrets Operator works with a few key custom resources:

- **SecretStore** or **ClusterSecretStore**: Defines the connection to your external secrets provider. A SecretStore is namespace-scoped while a ClusterSecretStore works across all namespaces.
- **ExternalSecret**: Declares which secrets to fetch from the provider and how to map them into Kubernetes Secret objects.
- **PushSecret**: Allows you to push Kubernetes secrets back to an external provider (useful for bootstrapping).

The controller watches for ExternalSecret resources, connects to the configured SecretStore, fetches the secret data, and creates or updates a Kubernetes Secret with the retrieved values.

## Setting Up AWS Credentials

To connect ESO to AWS Secrets Manager, you need to provide AWS credentials. Create a Kubernetes secret containing your access keys.

```bash
# Create a secret with AWS credentials
kubectl create secret generic aws-credentials \
  --namespace external-secrets \
  --from-literal=access-key=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secret-access-key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

In production, you should use IAM roles for service accounts (IRSA) if running on EKS, or workload identity if your Talos cluster runs on a cloud provider that supports it. Hard-coded credentials are acceptable for testing but should be avoided in production deployments.

## Creating a ClusterSecretStore

Now define a ClusterSecretStore that tells ESO how to reach AWS Secrets Manager.

```yaml
# cluster-secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        secretRef:
          accessKeyIDSecretRef:
            name: aws-credentials
            namespace: external-secrets
            key: access-key
          secretAccessKeySecretRef:
            name: aws-credentials
            namespace: external-secrets
            key: secret-access-key
```

Apply this configuration.

```bash
# Apply the ClusterSecretStore
kubectl apply -f cluster-secret-store.yaml

# Verify the store is ready
kubectl get clustersecretstore aws-secrets-manager
```

The status should show "Valid" once the operator verifies it can connect to AWS.

## Creating an ExternalSecret

Suppose you have a secret in AWS Secrets Manager called `production/database` that contains a JSON object with `username` and `password` fields. You can create an ExternalSecret to pull those values into your cluster.

```yaml
# external-secret-db.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
  data:
    - secretKey: username
      remoteRef:
        key: production/database
        property: username
    - secretKey: password
      remoteRef:
        key: production/database
        property: password
```

```bash
# Apply the ExternalSecret
kubectl apply -f external-secret-db.yaml

# Check the sync status
kubectl get externalsecret database-credentials -n default

# Verify the Kubernetes secret was created
kubectl get secret db-credentials -n default -o yaml
```

The `refreshInterval` field controls how often ESO checks the external provider for updates. Setting it to `1h` means the secret will be refreshed every hour automatically.

## Using Templates for Custom Secret Formats

Sometimes you need the secret data in a specific format. ESO supports templates that let you transform the fetched data.

```yaml
# external-secret-template.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-url
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: db-connection-string
    template:
      type: Opaque
      data:
        # Build a connection string from individual secret properties
        DATABASE_URL: "postgresql://{{ .username }}:{{ .password }}@{{ .host }}:5432/{{ .dbname }}"
  data:
    - secretKey: username
      remoteRef:
        key: production/database
        property: username
    - secretKey: password
      remoteRef:
        key: production/database
        property: password
    - secretKey: host
      remoteRef:
        key: production/database
        property: host
    - secretKey: dbname
      remoteRef:
        key: production/database
        property: dbname
```

This approach is especially useful when applications expect environment variables in a particular format like connection strings.

## Monitoring and Troubleshooting

ESO provides several ways to check if your secrets are syncing correctly. The ExternalSecret resource has a status field that shows the sync state.

```bash
# Check the status of all ExternalSecrets
kubectl get externalsecrets --all-namespaces

# Describe a specific ExternalSecret for detailed status
kubectl describe externalsecret database-credentials -n default

# Check the operator logs for errors
kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets
```

Common issues include incorrect credentials, network connectivity problems between the cluster and the secrets provider, and permission errors on the IAM role or service account.

## Talos-Specific Considerations

On Talos Linux, there are a few things to keep in mind when running ESO:

1. **No filesystem access**: Since Talos is immutable, you cannot store provider credentials on disk. Always use Kubernetes secrets or workload identity mechanisms.

2. **Network policies**: If you have network policies enabled on your Talos cluster, make sure the ESO pods can reach your external secrets provider endpoints.

3. **DNS resolution**: Ensure CoreDNS is properly configured so that ESO can resolve the hostnames of external providers like `secretsmanager.us-east-1.amazonaws.com`.

4. **Resource limits**: Set appropriate resource requests and limits for the ESO pods through Helm values to prevent resource contention on your Talos nodes.

```yaml
# Custom Helm values for resource management
# values.yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 200m
    memory: 256Mi
```

## Security Best Practices

When using ESO on Talos Linux, follow these practices to maintain a strong security posture:

- Use ClusterSecretStore sparingly. Prefer namespace-scoped SecretStore resources to limit the blast radius of compromised credentials.
- Enable RBAC rules that restrict which namespaces can reference a given SecretStore.
- Set short refresh intervals for critical secrets so that rotations propagate quickly.
- Use the `creationPolicy: Owner` setting so that Kubernetes secrets are garbage collected when the ExternalSecret is deleted.
- Regularly audit which secrets are being synced and who has access to the ExternalSecret resources.

## Wrapping Up

External Secrets Operator is a powerful tool for bridging the gap between external secrets providers and Kubernetes. On Talos Linux, where the operating system is locked down and API-driven, ESO fits perfectly into the declarative management philosophy. By pulling secrets from centralized stores rather than managing them manually inside the cluster, you gain better auditability, easier rotation, and a single source of truth for sensitive configuration data.

The combination of Talos Linux's security-first approach and ESO's automated secrets synchronization gives you a production-ready secrets management pipeline that requires minimal manual intervention.
