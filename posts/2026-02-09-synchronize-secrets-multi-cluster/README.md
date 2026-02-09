# How to Synchronize Secrets Across Multiple Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Secrets Management, Multi-Cluster, Security, External Secrets

Description: Learn practical approaches to synchronize and manage secrets across multiple Kubernetes clusters using tools like External Secrets Operator, Sealed Secrets, and vault integration.

---

Managing secrets across multiple Kubernetes clusters presents unique challenges. Hardcoding secrets in manifests creates security risks, while manual secret distribution is error-prone and doesn't scale. You need automated secret synchronization that maintains security while enabling consistent secret values across your cluster fleet.

In this guide, you'll learn several approaches to synchronize secrets across Kubernetes clusters, from GitOps-friendly sealed secrets to dynamic secret fetching from external vaults.

## Understanding Secret Synchronization Challenges

When running workloads across multiple clusters, applications often need access to the same credentials, API keys, and certificates. Manually creating secrets in each cluster leads to configuration drift, missed updates, and security gaps. You need a solution that provides centralized secret management, automated secret distribution, version control and audit trails, and secure secret rotation without service disruption.

## Approach 1: External Secrets Operator with AWS Secrets Manager

External Secrets Operator fetches secrets from external secret stores and creates Kubernetes Secret objects automatically. This centralizes secret storage while allowing clusters to pull secrets on demand.

Install External Secrets Operator in each cluster:

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace
```

Configure AWS Secrets Manager as the secret store:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: default
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

Create an ExternalSecret that syncs from AWS Secrets Manager:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  data:
  - secretKey: username
    remoteRef:
      key: prod/database/credentials
      property: username
  - secretKey: password
    remoteRef:
      key: prod/database/credentials
      property: password
  - secretKey: connection-string
    remoteRef:
      key: prod/database/credentials
      property: connection_string
```

Deploy this ExternalSecret to all clusters, and they'll automatically fetch and sync the secret from AWS Secrets Manager.

For multi-region deployments, use region-specific secret stores:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager-us-west
  namespace: default
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-west-2
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
```

## Approach 2: HashiCorp Vault Integration

Vault provides centralized secret management with advanced features like dynamic secrets, secret rotation, and fine-grained access control.

Install Vault Agent Injector in each cluster:

```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault \
  -n vault \
  --create-namespace \
  --set "injector.enabled=true" \
  --set "server.enabled=false"  # Use external Vault
```

Configure Kubernetes authentication in Vault:

```bash
# Enable Kubernetes auth method
vault auth enable kubernetes

# Configure the auth method
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
  token_reviewer_jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)"

# Create a policy for database secrets
vault policy write database-read - <<EOF
path "secret/data/database/*" {
  capabilities = ["read", "list"]
}
EOF

# Create a role binding the policy to a service account
vault write auth/kubernetes/role/database \
  bound_service_account_names=app \
  bound_service_account_namespaces=default \
  policies=database-read \
  ttl=24h
```

Inject secrets into pods using annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "database"
        vault.hashicorp.com/agent-inject-secret-database: "secret/data/database/credentials"
        vault.hashicorp.com/agent-inject-template-database: |
          {{- with secret "secret/data/database/credentials" -}}
          export DATABASE_URL="{{ .Data.data.connection_string }}"
          export DB_USER="{{ .Data.data.username }}"
          export DB_PASS="{{ .Data.data.password }}"
          {{- end -}}
    spec:
      serviceAccountName: app
      containers:
      - name: api
        image: myapp:latest
        command: ["/bin/sh"]
        args: ["-c", "source /vault/secrets/database && ./app"]
```

The Vault agent sidecar automatically fetches secrets and keeps them updated.

## Approach 3: Sealed Secrets for GitOps

Sealed Secrets allows you to encrypt secrets and store them in Git, enabling GitOps workflows while maintaining security.

Install Sealed Secrets controller in each cluster:

```bash
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm install sealed-secrets sealed-secrets/sealed-secrets \
  -n kube-system
```

Create a secret and seal it:

```bash
# Create a regular secret (don't commit this!)
kubectl create secret generic api-keys \
  --from-literal=stripe-key=sk_test_123456 \
  --from-literal=sendgrid-key=SG.abc123 \
  --dry-run=client -o yaml > api-keys.yaml

# Seal the secret (safe to commit)
kubeseal --format=yaml < api-keys.yaml > api-keys-sealed.yaml

# Commit the sealed secret to Git
git add api-keys-sealed.yaml
git commit -m "Add API keys sealed secret"
```

The sealed secret can be safely stored in Git:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: api-keys
  namespace: default
spec:
  encryptedData:
    stripe-key: AgBxJ7tT... (encrypted)
    sendgrid-key: AgAaK9mP... (encrypted)
  template:
    metadata:
      name: api-keys
      namespace: default
```

Deploy this to all clusters via GitOps, and each cluster's Sealed Secrets controller will decrypt it into a regular Secret.

For multi-cluster with different encryption keys, create environment-specific sealed secrets:

```bash
# Get the public key from production-east cluster
kubeseal --fetch-cert \
  --controller-name=sealed-secrets \
  --controller-namespace=kube-system \
  > prod-east-pub-cert.pem

# Seal secret for specific cluster
kubeseal --format=yaml --cert=prod-east-pub-cert.pem \
  < api-keys.yaml > api-keys-prod-east-sealed.yaml
```

## Approach 4: Reflector for In-Cluster Secret Replication

Reflector copies secrets and configmaps across namespaces within a single cluster:

```bash
helm repo add emberstack https://emberstack.github.io/helm-charts
helm install reflector emberstack/reflector \
  -n kube-system
```

Create a source secret with reflection annotations:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-certificate
  namespace: cert-manager
  annotations:
    reflector.v1.k8s.emberstack.com/reflection-allowed: "true"
    reflector.v1.k8s.emberstack.com/reflection-allowed-namespaces: "app1,app2,app3"
    reflector.v1.k8s.emberstack.com/reflection-auto-enabled: "true"
type: kubernetes.io/tls
data:
  tls.crt: <base64-cert>
  tls.key: <base64-key>
```

Reflector automatically creates copies in the specified namespaces.

## Approach 5: Custom Secret Sync Controller

For advanced use cases, build a custom controller that syncs secrets between clusters:

```python
# secret-sync-controller.py
from kubernetes import client, config, watch
import base64
import boto3

class SecretSyncController:
    def __init__(self, clusters):
        self.clusters = {}
        for cluster_name, kubeconfig_path in clusters.items():
            config.load_kube_config(kubeconfig_path)
            self.clusters[cluster_name] = client.CoreV1Api()

    def sync_secret(self, secret, source_cluster, target_clusters):
        """Sync secret from source to target clusters"""
        source_api = self.clusters[source_cluster]

        # Get secret from source
        try:
            source_secret = source_api.read_namespaced_secret(
                name=secret,
                namespace='default'
            )
        except client.exceptions.ApiException as e:
            print(f"Error reading secret: {e}")
            return

        # Create secret in target clusters
        for target in target_clusters:
            target_api = self.clusters[target]

            # Remove cluster-specific metadata
            source_secret.metadata.resource_version = None
            source_secret.metadata.uid = None

            try:
                target_api.create_namespaced_secret(
                    namespace='default',
                    body=source_secret
                )
                print(f"Created secret {secret} in {target}")
            except client.exceptions.ApiException as e:
                if e.status == 409:  # Already exists
                    target_api.patch_namespaced_secret(
                        name=secret,
                        namespace='default',
                        body=source_secret
                    )
                    print(f"Updated secret {secret} in {target}")
                else:
                    print(f"Error creating secret: {e}")

    def watch_secrets(self, namespace='default'):
        """Watch for secret changes and sync"""
        w = watch.Watch()
        api = self.clusters['production-east']

        for event in w.stream(api.list_namespaced_secret, namespace=namespace):
            secret_name = event['object'].metadata.name
            event_type = event['type']

            # Check if secret should be synced
            annotations = event['object'].metadata.annotations or {}
            if annotations.get('sync.example.com/enabled') == 'true':
                targets = annotations.get('sync.example.com/targets', '').split(',')

                if event_type in ['ADDED', 'MODIFIED']:
                    self.sync_secret(secret_name, 'production-east', targets)

# Usage
controller = SecretSyncController({
    'production-east': '/path/to/prod-east-kubeconfig',
    'production-west': '/path/to/prod-west-kubeconfig',
    'staging': '/path/to/staging-kubeconfig'
})

controller.watch_secrets()
```

Deploy this as a pod in your management cluster.

## Secret Rotation Strategies

Implement automated secret rotation:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: default
spec:
  refreshInterval: 15m  # Check for updates every 15 minutes
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
    deletionPolicy: Retain
```

For Vault dynamic secrets:

```yaml
annotations:
  vault.hashicorp.com/agent-inject: "true"
  vault.hashicorp.com/role: "database"
  vault.hashicorp.com/agent-inject-secret-db: "database/creds/readonly"
  vault.hashicorp.com/secret-volume-path-db: "/vault/secrets"
  vault.hashicorp.com/agent-cache-enable: "true"
```

Vault automatically rotates these credentials and the sidecar updates them.

## Monitoring Secret Synchronization

Monitor secret sync health:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: secret-sync-alerts
  namespace: monitoring
spec:
  groups:
  - name: secrets
    rules:
    - alert: ExternalSecretSyncFailed
      expr: externalsecret_sync_calls_error > 0
      for: 5m
      annotations:
        summary: "External secret {{ $labels.name }} failed to sync"

    - alert: SecretNotSynced
      expr: time() - externalsecret_sync_calls_total > 3600
      for: 10m
      annotations:
        summary: "External secret {{ $labels.name }} hasn't synced in over 1 hour"
```

## Best Practices

Never commit unencrypted secrets to Git, even in private repositories. Use Sealed Secrets or similar encryption.

Implement secret rotation policies. Secrets should be rotated regularly, and your sync mechanism should handle this automatically.

Use namespace-specific service accounts with minimal permissions for secret access.

Monitor secret access and sync operations. Failed secret syncs can cause application outages.

Implement secret validation. Ensure fetched secrets have the expected format before making them available to applications.

Use different secrets for different environments. Never share production secrets with staging or development clusters.

## Conclusion

Synchronizing secrets across multiple Kubernetes clusters requires balancing security, automation, and operational simplicity. Whether you choose External Secrets Operator for dynamic fetching, Sealed Secrets for GitOps workflows, or Vault for advanced secret management, the key is implementing a solution that fits your security requirements and operational model.

Start with a simple approach like Sealed Secrets for GitOps or External Secrets Operator for basic secret fetching, then add sophistication like dynamic secrets and automated rotation as your security requirements mature.
