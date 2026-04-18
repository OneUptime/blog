# How to View and Filter Secrets in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Secret, Security, Management

Description: Learn how to browse, search, and manage Kubernetes Secrets in Portainer while maintaining security best practices.

## Viewing Secrets in Portainer

1. Select your Kubernetes environment.
2. Go to **ConfigMaps & Secrets** or **Configurations**.
3. Click the **Secrets** tab.

You'll see all Secrets listed with their name, namespace, type, and creation timestamp. Secret **values are not displayed** by default for security.

## Filtering Secrets by Namespace

Select a namespace from the dropdown at the top of the list to scope the view:

```bash
# List secrets in a specific namespace

kubectl get secrets --namespace=production

# List across all namespaces (values not shown)
kubectl get secrets --all-namespaces

# Filter by type
kubectl get secrets --all-namespaces --field-selector=type=Opaque
```

## Common Secret Types You'll See

| Type | Description |
|------|-------------|
| `Opaque` | Generic key-value secrets |
| `kubernetes.io/service-account-token` | Auto-created for service accounts |
| `kubernetes.io/dockerconfigjson` | Registry pull credentials |
| `kubernetes.io/tls` | TLS certificates |
| `helm.sh/release.v1` | Helm release data |

## Filtering Out System Secrets

Kubernetes automatically creates service account token secrets. Filter them out:

```bash
# Filter to only Opaque (user-created) secrets
kubectl get secrets --all-namespaces \
  --field-selector=type=Opaque

# Exclude Helm release secrets
kubectl get secrets --namespace=production | grep -v "helm.sh"
```

## Viewing Secret Metadata (Without Values)

```bash
# Describe a secret to see keys without values
kubectl describe secret app-secrets --namespace=production

# List only the key names in a secret
kubectl get secret app-secrets --namespace=production \
  -o json | jq '.data | keys'
```

## Accessing Secret Values (With Caution)

```bash
# Decode a specific secret value (authorized users only)
kubectl get secret app-secrets --namespace=production \
  -o jsonpath='{.data.password}' | base64 -d

# Get all decoded values (use with extreme caution)
kubectl get secret app-secrets --namespace=production \
  -o go-template='{{range $k,$v := .data}}{{$k}}={{$v | base64decode}}{{"\n"}}{{end}}'
```

## Auditing Secret Access

Enable Kubernetes audit logging to track who accesses Secrets:

```yaml
# audit-policy.yaml - Log all Secret access
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: RequestResponse
    resources:
      - group: ""
        resources: ["secrets"]
```

## Restricting Secret Access with RBAC

```bash
# Create a role that can only manage secrets in a specific namespace
kubectl create role secret-manager \
  --verb=get,list,create,update,delete \
  --resource=secrets \
  --namespace=production

# Bind the role to a user
kubectl create rolebinding secret-manager-binding \
  --role=secret-manager \
  --user=devops-user@company.com \
  --namespace=production
```

## Portainer Secret Masking

Portainer masks secret values in the UI by default. Only the keys are shown when viewing a Secret's detail page. This reduces the risk of accidental exposure during screen sharing or demos.

## Conclusion

Portainer's Secrets browser gives you visibility into what Secrets exist and their types, without exposing values. Use namespace filtering and CLI tools for deeper inspection. Always protect secret access with RBAC and enable audit logging in production clusters.
