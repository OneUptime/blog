# How to Fix Dapr Secret Store Access Denied Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret Store, Security, Access Control, Kubernetes

Description: Resolve Dapr secret store 'access denied' errors by fixing RBAC policies, secret store scoping, and access control list configuration.

---

Dapr secret store access denied errors occur when your application or component tries to read a secret but lacks the necessary permissions. These errors can come from Kubernetes RBAC, Dapr's own access control lists, or the underlying secret store's permission system.

## Understanding Dapr Secret Access Flow

Dapr reads secrets through its secret store building block. When you reference a secret in a component, Dapr's sidecar retrieves it at initialization. When your app calls the secrets API, the sidecar retrieves it at runtime. Both can fail with access denied.

## Error Messages

```yaml
error getting secret: forbidden: secrets "myapp-secrets" is forbidden
ERR_SECRET_GET: error getting secret value: access denied
failed to get secret from secret store secretstore: permission denied
```

## Fixing Kubernetes RBAC

The default Dapr service account may not have permission to read specific secrets. Create a role and binding:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dapr-secret-reader
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list"]
  resourceNames: ["myapp-secrets", "db-credentials"]
```

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dapr-secret-reader-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: default
  namespace: production
roleRef:
  kind: Role
  name: dapr-secret-reader
  apiGroup: rbac.authorization.k8s.io
```

## Dapr Access Control for Secrets

Dapr can restrict which applications can access which secrets using the Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  secrets:
    scopes:
    - storeName: kubernetes
      defaultAccess: deny
      allowedSecrets: ["myapp-secrets", "db-password"]
```

Apply this configuration and reference it in your pod annotation:

```yaml
annotations:
  dapr.io/config: "appconfig"
```

## Secret Store Component RBAC for AWS

For AWS Secrets Manager, ensure the pod's IAM role has the right permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:myapp/*"
    }
  ]
}
```

## Testing Secret Access

Test that the Dapr service account can read the required secret:

```bash
# Test as the pod's service account
kubectl auth can-i get secrets/myapp-secrets \
  --as=system:serviceaccount:production:default \
  -n production
```

Call the Dapr secrets API directly from the pod:

```bash
kubectl exec -it <pod> -c <app-container> -- \
  curl http://localhost:3500/v1.0/secrets/kubernetes/myapp-secrets
```

## Summary

Dapr secret store access denied errors are caused by Kubernetes RBAC restrictions, Dapr's own secret scoping configuration, or cloud provider IAM policies. Grant the pod's service account read access to specific secrets via RBAC, configure Dapr's secret scopes in the Configuration resource to explicitly allow needed secrets, and validate access using `kubectl auth can-i`.
