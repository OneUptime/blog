# How to Configure KEDA TriggerAuthentication for Secured Metric Sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KEDA, Security

Description: Set up KEDA TriggerAuthentication to securely authenticate with external metric sources using secrets, service accounts, and pod identity for production-grade autoscaling configurations.

---

KEDA scalers need credentials to access external metric sources like cloud queues, databases, and monitoring systems. TriggerAuthentication provides a secure way to manage these credentials using Kubernetes secrets, service accounts, or cloud provider identity mechanisms. Properly configured authentication ensures your autoscaling works reliably without exposing sensitive credentials.

Instead of hardcoding API keys or passwords in ScaledObject manifests, TriggerAuthentication references secure credential stores. This separation of concerns makes configurations more maintainable and aligns with security best practices for Kubernetes deployments.

## Understanding TriggerAuthentication

TriggerAuthentication is a Kubernetes custom resource that defines how KEDA should authenticate with external systems. It can reference Kubernetes secrets, use pod identity providers like AWS IAM roles, or leverage environment variables from the target deployment.

ScaledObjects reference TriggerAuthentication resources, keeping credential configuration separate from scaling logic. This allows reusing authentication configurations across multiple scalers and simplifies credential rotation.

## Basic Secret-Based Authentication

Store credentials in Kubernetes secrets and reference them in TriggerAuthentication.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: rabbitmq-credentials
  namespace: workers
type: Opaque
stringData:
  username: "admin"
  password: "secure-password"
  host: "rabbitmq.messaging.svc.cluster.local"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: rabbitmq-trigger-auth
  namespace: workers
spec:
  secretTargetRef:
  - parameter: username
    name: rabbitmq-credentials
    key: username
  - parameter: password
    name: rabbitmq-credentials
    key: password
  - parameter: host
    name: rabbitmq-credentials
    key: host
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: rabbitmq-consumer
  minReplicaCount: 2
  maxReplicaCount: 50

  triggers:
  - type: rabbitmq
    authenticationRef:
      name: rabbitmq-trigger-auth
    metadata:
      queueName: work-queue
      queueLength: "10"
```

The ScaledObject references the TriggerAuthentication, which retrieves credentials from the secret at runtime.

## AWS IAM Roles for Service Accounts

Use IRSA on EKS for credential-free AWS authentication.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: keda-operator-sa
  namespace: keda
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/KedaOperatorRole
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: aws-sqs-irsa-auth
  namespace: workers
spec:
  podIdentity:
    provider: aws-eks
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: sqs-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: sqs-worker
  minReplicaCount: 0
  maxReplicaCount: 100

  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: aws-sqs-irsa-auth
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789012/my-queue
      queueLength: "15"
      awsRegion: us-east-1
      identityOwner: operator  # Use KEDA operator's service account
```

The KEDA operator assumes the IAM role configured in its service account, eliminating the need for static AWS credentials.

## Azure Workload Identity

Configure Azure AD workload identity for AKS clusters.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: keda-operator-sa
  namespace: keda
  annotations:
    azure.workload.identity/client-id: "12345678-1234-1234-1234-123456789012"
  labels:
    azure.workload.identity/use: "true"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: azure-queue-auth
  namespace: workers
spec:
  podIdentity:
    provider: azure-workload
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: azure-queue-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: queue-processor
  minReplicaCount: 1
  maxReplicaCount: 50

  triggers:
  - type: azure-queue
    authenticationRef:
      name: azure-queue-auth
    metadata:
      queueName: processing-queue
      queueLength: "20"
      accountName: mystorageaccount
```

Workload identity provides seamless Azure authentication without managing connection strings or keys.

## GCP Workload Identity

Use GCP workload identity for authentication with Google Cloud services.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: keda-operator-sa
  namespace: keda
  annotations:
    iam.gke.io/gcp-service-account: keda-operator@project-id.iam.gserviceaccount.com
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: gcp-pubsub-auth
  namespace: workers
spec:
  podIdentity:
    provider: gcp
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: pubsub-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: pubsub-worker
  minReplicaCount: 2
  maxReplicaCount: 100

  triggers:
  - type: gcp-pubsub
    authenticationRef:
      name: gcp-pubsub-auth
    metadata:
      subscriptionName: workers-subscription
      subscriptionSize: "10"
```

The Kubernetes service account is bound to a GCP service account, providing automatic credential management.

## Multiple Credential Types

Combine different credential sources in a single TriggerAuthentication.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: workers
type: Opaque
stringData:
  connection-string: "postgresql://user:pass@host:5432/db"
  api-key: "secret-api-key"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: multi-auth
  namespace: workers
spec:
  # Credentials from secret
  secretTargetRef:
  - parameter: connectionString
    name: database-credentials
    key: connection-string
  - parameter: apiKey
    name: database-credentials
    key: api-key

  # Environment variables from target deployment
  env:
  - parameter: region
    name: AWS_REGION
    containerName: worker

  # Pod identity
  podIdentity:
    provider: aws-eks
```

This supports complex scenarios where authentication requires multiple credential types.

## ClusterTriggerAuthentication for Cluster-Wide Auth

Use ClusterTriggerAuthentication for authentication configs shared across namespaces.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: shared-aws-credentials
  namespace: keda
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE"
  AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
---
apiVersion: keda.sh/v1alpha1
kind: ClusterTriggerAuthentication
metadata:
  name: shared-aws-auth
spec:
  secretTargetRef:
  - parameter: awsAccessKeyID
    name: shared-aws-credentials
    key: AWS_ACCESS_KEY_ID
  - parameter: awsSecretAccessKey
    name: shared-aws-credentials
    key: AWS_SECRET_ACCESS_KEY
---
# Reference from any namespace
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: sqs-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: worker
  minReplicaCount: 2
  maxReplicaCount: 50

  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: shared-aws-auth
      kind: ClusterTriggerAuthentication
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789012/prod-queue
      queueLength: "10"
      awsRegion: us-east-1
```

ClusterTriggerAuthentication avoids duplicating authentication configuration across namespaces.

## Certificate-Based Authentication

Configure TLS certificates for secure connections.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-credentials
  namespace: workers
type: Opaque
stringData:
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    ...
    -----END CERTIFICATE-----
  client.crt: |
    -----BEGIN CERTIFICATE-----
    ...
    -----END CERTIFICATE-----
  client.key: |
    -----BEGIN PRIVATE KEY-----
    ...
    -----END PRIVATE KEY-----
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: kafka-tls-auth
  namespace: workers
spec:
  secretTargetRef:
  - parameter: tls
    name: tls-credentials
    key: enable
  - parameter: ca
    name: tls-credentials
    key: ca.crt
  - parameter: cert
    name: tls-credentials
    key: client.crt
  - parameter: key
    name: tls-credentials
    key: client.key
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-tls-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: kafka-consumer
  minReplicaCount: 3
  maxReplicaCount: 50

  triggers:
  - type: kafka
    authenticationRef:
      name: kafka-tls-auth
    metadata:
      bootstrapServers: kafka-1.example.com:9093,kafka-2.example.com:9093
      consumerGroup: secure-consumers
      topic: events
      lagThreshold: "50"
```

TLS certificates ensure encrypted communication with secured Kafka clusters.

## Environment Variable Authentication

Reference environment variables from the scaled deployment.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
  namespace: workers
spec:
  replicas: 1
  selector:
    matchLabels:
      app: worker
  template:
    metadata:
      labels:
        app: worker
    spec:
      containers:
      - name: worker
        image: worker:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: api-secret
              key: key
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: env-auth
  namespace: workers
spec:
  env:
  - parameter: databaseURL
    name: DATABASE_URL
    containerName: worker
  - parameter: apiKey
    name: API_KEY
    containerName: worker
```

This approach reuses credentials already configured in the deployment, avoiding duplication.

## Monitoring Authentication Issues

Debug authentication problems in KEDA.

```bash
# Check TriggerAuthentication status
kubectl get triggerauthentication -n workers

# View detailed auth configuration
kubectl describe triggerauthentication rabbitmq-trigger-auth -n workers

# Check KEDA operator logs for auth errors
kubectl logs -n keda deployment/keda-operator | grep -i auth

# Verify secret exists and has correct keys
kubectl get secret rabbitmq-credentials -n workers -o yaml

# Test authentication manually
kubectl run -it --rm debug \
  --image=alpine \
  --restart=Never \
  --env="USERNAME=$(kubectl get secret rabbitmq-credentials -n workers -o jsonpath='{.data.username}' | base64 -d)" \
  --env="PASSWORD=$(kubectl get secret rabbitmq-credentials -n workers -o jsonpath='{.data.password}' | base64 -d)" \
  -- sh
```

Common issues include missing secrets, incorrect secret keys, or insufficient permissions for pod identity providers.

## Rotating Credentials

Update credentials without disrupting scaling.

```bash
# Update secret with new credentials
kubectl create secret generic rabbitmq-credentials \
  --from-literal=username=admin \
  --from-literal=password=new-secure-password \
  --from-literal=host=rabbitmq.messaging.svc.cluster.local \
  --dry-run=client -o yaml | \
  kubectl apply -f -

# KEDA automatically picks up secret changes
# No need to restart or recreate ScaledObjects
```

KEDA watches secrets referenced in TriggerAuthentication and updates credentials automatically when secrets change.

## Best Practices

Use pod identity providers (IRSA, workload identity) instead of static credentials whenever possible. This eliminates credential management overhead and improves security.

Store all sensitive credentials in Kubernetes secrets with appropriate RBAC restrictions. Never commit secrets to version control.

Use ClusterTriggerAuthentication for shared authentication configurations to avoid duplication and simplify updates.

Document which authentication method each scaler uses and why. This helps troubleshooting and credential rotation planning.

Regularly rotate credentials and validate that KEDA picks up the changes. Test credential rotation procedures before production deployment.

Monitor KEDA logs for authentication failures. Set up alerts for repeated auth errors that indicate credential or permission problems.

## Security Considerations

Limit secret access using RBAC. Only the KEDA operator service account should read TriggerAuthentication secrets.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: keda-secret-reader
  namespace: workers
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["rabbitmq-credentials", "database-credentials"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: keda-secret-reader-binding
  namespace: workers
subjects:
- kind: ServiceAccount
  name: keda-operator
  namespace: keda
roleRef:
  kind: Role
  name: keda-secret-reader
  apiGroup: rbac.authorization.k8s.io
```

This prevents other workloads from accessing scaler credentials.

## Conclusion

KEDA TriggerAuthentication provides flexible, secure authentication for external metric sources. By leveraging Kubernetes secrets, service accounts, and cloud provider identity mechanisms, you can configure autoscaling that works reliably while maintaining security best practices.

The separation between authentication configuration and scaling logic makes systems more maintainable and simplifies credential rotation. Combined with proper RBAC and monitoring, TriggerAuthentication ensures your KEDA scalers have the access they need while keeping sensitive credentials protected.
