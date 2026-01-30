# How to Build Kubernetes Service Accounts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Security, RBAC, Authentication

Description: Configure Kubernetes service accounts for pod identity, API access control, and workload authentication with RBAC roles and token management.

---

Service accounts are the identity mechanism for workloads running inside Kubernetes clusters. Unlike user accounts (which are for humans), service accounts provide an identity for processes running in pods. This guide walks through creating service accounts, configuring RBAC permissions, projecting tokens, and integrating with cloud provider workload identity systems.

## Understanding Service Accounts

Every pod in Kubernetes runs with a service account. If you don't specify one, the pod uses the `default` service account in its namespace. This default account typically has minimal permissions, but relying on it creates security risks and makes auditing difficult.

Service accounts enable:

- **Pod Identity**: Each workload gets a distinct identity for API calls
- **Access Control**: Fine-grained permissions through RBAC bindings
- **Audit Trails**: Clear attribution of API requests to specific workloads
- **Secret Management**: Controlled access to sensitive configuration
- **Cloud Integration**: Mapping to cloud IAM roles for external resource access

## Creating Service Accounts

### Basic Service Account

The simplest service account requires just a name and namespace.

```yaml
# service-account-basic.yaml
# Creates a minimal service account for application workloads
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app-sa
  namespace: production
  labels:
    app: my-app
    environment: production
```

Apply it with kubectl:

```bash
# Create the service account
kubectl apply -f service-account-basic.yaml

# Verify creation
kubectl get serviceaccount my-app-sa -n production

# View detailed information
kubectl describe serviceaccount my-app-sa -n production
```

### Service Account with Image Pull Secrets

When your pods need to pull images from private registries, attach image pull secrets to the service account.

```yaml
# service-account-with-pull-secrets.yaml
# Service account configured for private registry access
apiVersion: v1
kind: ServiceAccount
metadata:
  name: private-registry-sa
  namespace: production
  annotations:
    description: "Service account for workloads using private container images"
imagePullSecrets:
  - name: dockerhub-credentials
  - name: gcr-credentials
```

First create the registry credentials:

```bash
# Create Docker Hub credentials secret
kubectl create secret docker-registry dockerhub-credentials \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=myuser \
  --docker-password=mypassword \
  --docker-email=myemail@example.com \
  -n production

# Create GCR credentials secret
kubectl create secret docker-registry gcr-credentials \
  --docker-server=gcr.io \
  --docker-username=_json_key \
  --docker-password="$(cat gcr-key.json)" \
  -n production
```

## Binding Service Accounts to Pods

### Pod Specification

Assign a service account to a pod using the `serviceAccountName` field.

```yaml
# pod-with-service-account.yaml
# Pod explicitly configured to use a specific service account
apiVersion: v1
kind: Pod
metadata:
  name: api-server
  namespace: production
  labels:
    app: api-server
spec:
  serviceAccountName: my-app-sa
  containers:
    - name: api
      image: mycompany/api-server:v1.2.0
      ports:
        - containerPort: 8080
      # The service account token is automatically mounted at
      # /var/run/secrets/kubernetes.io/serviceaccount/
      volumeMounts:
        - name: config
          mountPath: /etc/config
          readOnly: true
  volumes:
    - name: config
      configMap:
        name: api-config
```

### Deployment with Service Account

For production workloads, you typically use Deployments.

```yaml
# deployment-with-service-account.yaml
# Deployment that assigns service account to all replica pods
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: production
  labels:
    app: backend-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      serviceAccountName: my-app-sa
      containers:
        - name: api
          image: mycompany/backend:v2.0.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          env:
            - name: POD_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
            - name: POD_SERVICE_ACCOUNT
              valueFrom:
                fieldRef:
                  fieldPath: spec.serviceAccountName
```

## RBAC Roles and RoleBindings

Service accounts have no permissions by default. You grant permissions through RBAC (Role-Based Access Control).

### Understanding RBAC Resources

| Resource | Scope | Purpose |
|----------|-------|---------|
| Role | Namespace | Define permissions within a single namespace |
| ClusterRole | Cluster | Define permissions cluster-wide or for cluster-scoped resources |
| RoleBinding | Namespace | Grant Role or ClusterRole permissions within a namespace |
| ClusterRoleBinding | Cluster | Grant ClusterRole permissions across all namespaces |

### Creating a Role

Roles define what actions are permitted on which resources.

```yaml
# role-pod-reader.yaml
# Role that allows reading pod information within the namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: production
rules:
  # Allow reading pods
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
  # Allow reading pod logs
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
  # Allow reading configmaps
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list"]
```

### Common Verbs Reference

| Verb | Description | HTTP Method |
|------|-------------|-------------|
| get | Read a single resource | GET |
| list | Read a collection of resources | GET |
| watch | Stream changes to resources | GET (with watch=true) |
| create | Create a new resource | POST |
| update | Replace an existing resource | PUT |
| patch | Partially modify a resource | PATCH |
| delete | Remove a resource | DELETE |
| deletecollection | Remove multiple resources | DELETE |

### RoleBinding

Connect the service account to the role.

```yaml
# rolebinding-pod-reader.yaml
# Binds the pod-reader role to the my-app-sa service account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: my-app-pod-reader
  namespace: production
subjects:
  # The service account to grant permissions to
  - kind: ServiceAccount
    name: my-app-sa
    namespace: production
roleRef:
  # The role to bind
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

### ClusterRole for Cluster-Wide Access

Some workloads need access across namespaces or to cluster-scoped resources.

```yaml
# clusterrole-node-reader.yaml
# ClusterRole for reading node information (cluster-scoped resource)
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-reader
rules:
  # Nodes are cluster-scoped, not namespaced
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch"]
  # Node metrics
  - apiGroups: ["metrics.k8s.io"]
    resources: ["nodes"]
    verbs: ["get", "list"]
```

### ClusterRoleBinding

Grant cluster-wide permissions to a service account.

```yaml
# clusterrolebinding-node-reader.yaml
# Grants node-reader permissions to monitoring service account
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: monitoring-node-reader
subjects:
  - kind: ServiceAccount
    name: monitoring-sa
    namespace: monitoring
roleRef:
  kind: ClusterRole
  name: node-reader
  apiGroup: rbac.authorization.k8s.io
```

### Role for Managing Deployments

A more comprehensive role for a CI/CD service account.

```yaml
# role-deployment-manager.yaml
# Role for CI/CD pipelines that need to manage deployments
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-manager
  namespace: production
rules:
  # Manage deployments
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  # Manage replica sets (created by deployments)
  - apiGroups: ["apps"]
    resources: ["replicasets"]
    verbs: ["get", "list", "watch"]
  # View pods
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
  # Manage services
  - apiGroups: [""]
    resources: ["services"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  # Manage configmaps and secrets
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
```

## Service Account Token Projection

Kubernetes 1.20+ uses bound service account tokens by default. These tokens are time-limited, audience-bound, and more secure than legacy tokens.

### Default Token Mount

By default, Kubernetes mounts a projected token at `/var/run/secrets/kubernetes.io/serviceaccount/`.

```bash
# Inside a pod, examine the mounted token
ls -la /var/run/secrets/kubernetes.io/serviceaccount/

# Output:
# ca.crt     - Cluster CA certificate
# namespace  - Current namespace
# token      - JWT token for API authentication
```

### Custom Token Projection

For advanced use cases, project tokens with custom audiences and expiration.

```yaml
# pod-with-projected-token.yaml
# Pod with custom projected service account token
apiVersion: v1
kind: Pod
metadata:
  name: custom-token-pod
  namespace: production
spec:
  serviceAccountName: my-app-sa
  containers:
    - name: app
      image: mycompany/app:v1.0.0
      volumeMounts:
        # Mount the projected token
        - name: custom-token
          mountPath: /var/run/secrets/tokens
          readOnly: true
  volumes:
    - name: custom-token
      projected:
        sources:
          - serviceAccountToken:
              # Token audience - who can accept this token
              audience: "https://my-api.example.com"
              # Token expiration in seconds (1 hour)
              expirationSeconds: 3600
              # Path within the mount
              path: api-token
          # Also include the CA cert for TLS verification
          - configMap:
              name: kube-root-ca.crt
              items:
                - key: ca.crt
                  path: ca.crt
```

### Multiple Audiences

Project tokens for different services with different audiences.

```yaml
# pod-multi-audience-tokens.yaml
# Pod with tokens for multiple external services
apiVersion: v1
kind: Pod
metadata:
  name: multi-service-pod
  namespace: production
spec:
  serviceAccountName: my-app-sa
  containers:
    - name: app
      image: mycompany/app:v1.0.0
      env:
        - name: VAULT_TOKEN_PATH
          value: /var/run/secrets/tokens/vault
        - name: DATABASE_TOKEN_PATH
          value: /var/run/secrets/tokens/database
      volumeMounts:
        - name: tokens
          mountPath: /var/run/secrets/tokens
          readOnly: true
  volumes:
    - name: tokens
      projected:
        sources:
          # Token for HashiCorp Vault
          - serviceAccountToken:
              audience: "vault.example.com"
              expirationSeconds: 600
              path: vault
          # Token for database proxy
          - serviceAccountToken:
              audience: "db-proxy.example.com"
              expirationSeconds: 1800
              path: database
```

## Disabling Auto-Mounting

Some pods don't need API access at all. Disable token mounting for better security.

### At Service Account Level

Disable auto-mounting for all pods using this service account.

```yaml
# service-account-no-automount.yaml
# Service account that doesn't automatically mount tokens
apiVersion: v1
kind: ServiceAccount
metadata:
  name: no-api-access-sa
  namespace: production
  annotations:
    description: "For pods that don't need Kubernetes API access"
automountServiceAccountToken: false
```

### At Pod Level

Override on a per-pod basis.

```yaml
# pod-no-automount.yaml
# Pod that explicitly disables token mounting
apiVersion: v1
kind: Pod
metadata:
  name: isolated-worker
  namespace: production
spec:
  serviceAccountName: my-app-sa
  # Override service account setting
  automountServiceAccountToken: false
  containers:
    - name: worker
      image: mycompany/worker:v1.0.0
      # No /var/run/secrets/kubernetes.io/serviceaccount/ mount
      securityContext:
        readOnlyRootFilesystem: true
        runAsNonRoot: true
        runAsUser: 1000
```

### Re-enable for Specific Pods

If the service account disables auto-mounting, re-enable for specific pods.

```yaml
# pod-enable-automount.yaml
# Pod that needs API access even though SA disables it by default
apiVersion: v1
kind: Pod
metadata:
  name: api-client
  namespace: production
spec:
  serviceAccountName: no-api-access-sa
  # Re-enable for this specific pod
  automountServiceAccountToken: true
  containers:
    - name: client
      image: mycompany/api-client:v1.0.0
```

## Workload Identity for Cloud Providers

Modern cloud providers support mapping Kubernetes service accounts to cloud IAM identities, eliminating the need for static credentials.

### AWS IAM Roles for Service Accounts (IRSA)

Associate an IAM role with a Kubernetes service account on EKS.

```yaml
# service-account-aws-irsa.yaml
# Service account mapped to AWS IAM role
apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-reader-sa
  namespace: production
  annotations:
    # This annotation links to the IAM role
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/S3ReaderRole
```

Create the IAM role with trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-west-2.amazonaws.com/id/EXAMPLED539D4633E53DE1B716D3041E"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.us-west-2.amazonaws.com/id/EXAMPLED539D4633E53DE1B716D3041E:sub": "system:serviceaccount:production:s3-reader-sa",
          "oidc.eks.us-west-2.amazonaws.com/id/EXAMPLED539D4633E53DE1B716D3041E:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
```

Pod using the IRSA-enabled service account:

```yaml
# pod-aws-irsa.yaml
# Pod that automatically gets AWS credentials via IRSA
apiVersion: v1
kind: Pod
metadata:
  name: s3-reader
  namespace: production
spec:
  serviceAccountName: s3-reader-sa
  containers:
    - name: reader
      image: amazon/aws-cli:latest
      command: ["sleep", "infinity"]
      # AWS SDK automatically uses the projected token
      # No AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY needed
```

### Google Cloud Workload Identity

Map GKE service accounts to Google Cloud service accounts.

```yaml
# service-account-gcp-workload-identity.yaml
# Service account linked to GCP service account
apiVersion: v1
kind: ServiceAccount
metadata:
  name: gcs-writer-sa
  namespace: production
  annotations:
    # Link to GCP service account
    iam.gke.io/gcp-service-account: gcs-writer@myproject.iam.gserviceaccount.com
```

Configure the GCP side:

```bash
# Allow the Kubernetes SA to impersonate the GCP SA
gcloud iam service-accounts add-iam-policy-binding \
  gcs-writer@myproject.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:myproject.svc.id.goog[production/gcs-writer-sa]"
```

Pod using GCP Workload Identity:

```yaml
# pod-gcp-workload-identity.yaml
# Pod with automatic GCP authentication
apiVersion: v1
kind: Pod
metadata:
  name: gcs-writer
  namespace: production
spec:
  serviceAccountName: gcs-writer-sa
  nodeSelector:
    iam.gke.io/gke-metadata-server-enabled: "true"
  containers:
    - name: writer
      image: google/cloud-sdk:latest
      command: ["sleep", "infinity"]
      # GCP SDK automatically authenticates via metadata server
```

### Azure Workload Identity

Configure AKS pods with Azure AD workload identity.

```yaml
# service-account-azure-workload-identity.yaml
# Service account with Azure workload identity
apiVersion: v1
kind: ServiceAccount
metadata:
  name: blob-reader-sa
  namespace: production
  annotations:
    azure.workload.identity/client-id: "00000000-0000-0000-0000-000000000000"
  labels:
    azure.workload.identity/use: "true"
```

Pod using Azure Workload Identity:

```yaml
# pod-azure-workload-identity.yaml
# Pod with Azure AD authentication
apiVersion: v1
kind: Pod
metadata:
  name: blob-reader
  namespace: production
  labels:
    azure.workload.identity/use: "true"
spec:
  serviceAccountName: blob-reader-sa
  containers:
    - name: reader
      image: mcr.microsoft.com/azure-cli:latest
      command: ["sleep", "infinity"]
      # Azure SDK uses injected environment variables and token
```

## Practical Example: Complete Application Setup

Here's a complete example setting up a service account for a web application that needs to read secrets and configmaps, plus access an external cloud storage service.

```yaml
# complete-app-rbac.yaml
# Full RBAC setup for a production application
---
# Service Account
apiVersion: v1
kind: ServiceAccount
metadata:
  name: webapp-sa
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/WebAppRole
  labels:
    app: webapp
---
# Role for application permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: webapp-role
  namespace: production
rules:
  # Read own configmaps
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch"]
    resourceNames: ["webapp-config", "webapp-features"]
  # Read own secrets
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get"]
    resourceNames: ["webapp-credentials", "webapp-tls"]
  # Read endpoints for service discovery
  - apiGroups: [""]
    resources: ["endpoints"]
    verbs: ["get", "list", "watch"]
---
# Bind role to service account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: webapp-rolebinding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: webapp-sa
    namespace: production
roleRef:
  kind: Role
  name: webapp-role
  apiGroup: rbac.authorization.k8s.io
---
# Deployment using the service account
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  namespace: production
  labels:
    app: webapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      serviceAccountName: webapp-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: webapp
          image: mycompany/webapp:v3.0.0
          ports:
            - containerPort: 8080
              name: http
          env:
            - name: KUBERNETES_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
          volumeMounts:
            - name: tokens
              mountPath: /var/run/secrets/tokens
              readOnly: true
            - name: config
              mountPath: /etc/webapp
              readOnly: true
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
      volumes:
        - name: tokens
          projected:
            sources:
              - serviceAccountToken:
                  audience: "https://api.mycompany.com"
                  expirationSeconds: 3600
                  path: api-token
        - name: config
          configMap:
            name: webapp-config
```

## Verifying and Debugging

### Check Service Account Permissions

Use `kubectl auth can-i` to verify permissions.

```bash
# Check if service account can list pods
kubectl auth can-i list pods \
  --as=system:serviceaccount:production:my-app-sa \
  -n production

# Check if service account can create deployments
kubectl auth can-i create deployments \
  --as=system:serviceaccount:production:my-app-sa \
  -n production

# List all permissions for a service account
kubectl auth can-i --list \
  --as=system:serviceaccount:production:my-app-sa \
  -n production
```

### Debug Token Issues

Examine the token from inside a pod.

```bash
# Read the token
cat /var/run/secrets/kubernetes.io/serviceaccount/token

# Decode the JWT payload (requires jq)
cat /var/run/secrets/kubernetes.io/serviceaccount/token | \
  cut -d. -f2 | \
  base64 -d 2>/dev/null | \
  jq .

# Test API access from inside pod
curl -s --cacert /var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
  -H "Authorization: Bearer $(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
  https://kubernetes.default.svc/api/v1/namespaces/production/pods
```

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| 403 Forbidden | Missing RBAC permissions | Create appropriate Role and RoleBinding |
| Token not found | automountServiceAccountToken: false | Enable token mounting or use projected volume |
| Token expired | Short-lived projected token | Increase expirationSeconds or handle refresh |
| Wrong audience | Token audience mismatch | Set correct audience in projected token |
| Cloud auth fails | Workload identity misconfigured | Check annotations and IAM trust policy |

## Security Best Practices

1. **Principle of Least Privilege**: Grant only the minimum permissions required. Start with nothing and add permissions as needed.

2. **Namespace Isolation**: Use namespace-scoped Roles instead of ClusterRoles when possible.

3. **Disable Auto-Mount**: Set `automountServiceAccountToken: false` for pods that don't need API access.

4. **Use Short-Lived Tokens**: Configure projected tokens with short expiration times.

5. **Audit Regularly**: Review service account permissions and remove unused accounts.

6. **Avoid Using Default SA**: Create dedicated service accounts for each application.

7. **Use Resource Names**: Restrict access to specific named resources when possible.

8. **Enable Audit Logging**: Track service account API usage for security monitoring.

```yaml
# Example of restrictive role with named resources
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: restricted-config-reader
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    # Only allow access to these specific configmaps
    resourceNames: ["app-config", "feature-flags"]
    verbs: ["get"]
  - apiGroups: [""]
    resources: ["secrets"]
    # Only allow access to these specific secrets
    resourceNames: ["app-credentials"]
    verbs: ["get"]
```

## Summary

Service accounts provide identity for Kubernetes workloads. Key takeaways:

- Create dedicated service accounts for each application
- Use RBAC to grant minimum required permissions
- Configure projected tokens with appropriate audiences and expiration
- Disable token auto-mounting when API access is not needed
- Use workload identity for cloud provider integration
- Regularly audit permissions and remove unused accounts

Proper service account configuration is foundational to Kubernetes security. Take time to set up appropriate permissions for each workload, and avoid the temptation to use overly permissive cluster-admin bindings for convenience.
