# How to Configure Kubernetes Cluster Security Settings in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Security, RBAC, DevOps

Description: Learn how to configure security settings for Kubernetes clusters in Portainer including RBAC, network policies, and access controls.

## Introduction

Securing a Kubernetes cluster managed by Portainer involves configuring proper RBAC, network policies, and Portainer-specific access controls. This guide covers the security settings available in Portainer for Kubernetes clusters and best practices for hardening your cluster management.

## Prerequisites

- Portainer BE with Kubernetes environment
- Cluster-admin access
- Understanding of Kubernetes RBAC concepts

## Step 1: Configure Portainer Kubernetes Security Settings

In Portainer, navigate to your Kubernetes environment:

1. Click on the environment
2. Expand **Cluster**
3. Go to **Setup**

Available security-related settings:

```text
Cluster → Setup
Security:
  [ ] Restrict access to the default namespace
  [ ] Restrict secret contents access for non-admins (UI only)

Deployment Options (if per-environment overrides are enabled):
  [ ] Enforce code-based deployment
  [x] Allow web editor and custom template use
  [x] Allow specifying of a manifest via a URL
```

`Allow web editor and custom template use` and `Allow specifying of a manifest via a URL` are only available when code-based deployment is enforced for the environment.

## Step 2: Configure Namespace Access Control

In Portainer BE, grant teams access to specific namespaces after assigning them a role on the environment or environment group:

1. Go to **Namespaces** in the Kubernetes environment
2. Click **Manage access** for the namespace
3. Select the users or teams that should have access, then click **Create access**

```text
Namespace: production
Access granted to:
  Team: backend-team
  Team: frontend-team
  Team: devops-team

Effective permissions come from the team's Portainer role
on the environment or environment group, such as:
  backend-team   → Standard User
  frontend-team  → Read-Only User
  devops-team    → Namespace Operator
```

This restricts namespace access within Portainer. Kubernetes RBAC must be enabled for namespace access control to work.

## Step 3: Apply RBAC with Portainer

Portainer uses predefined Kubernetes RBAC roles and bindings for its built-in roles rather than creating arbitrary roles such as `portainer-rw` for Portainer team names. For example:

```text
Portainer role mappings for Kubernetes:
  Environment Administrator → cluster-admin
  Operator                  → portainer-operator, portainer-helpdesk,
                              and portainer-view on all non-system namespaces
  Standard User             → portainer-basic plus portainer-edit/portainer-view
                              on assigned namespaces
  Read-Only User            → portainer-basic plus portainer-view
                              on assigned namespaces
```

Use Portainer's role assignments and namespace access management instead of creating manual `Role` or `RoleBinding` objects for Portainer teams.

## Step 4: Implement Network Policies

Apply network policies to default-deny ingress in the namespace and then allow only the traffic you need:

```yaml
# deny-all-ingress.yaml - Default deny all ingress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}    # Applies to all pods
  policyTypes:
    - Ingress
```

```yaml
# allow-frontend-to-api.yaml - Allow specific traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api          # Apply to API pods
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend   # Only allow from frontend pods in the same namespace
      ports:
        - protocol: TCP
          port: 8080
```

Deploy via Portainer under **Applications → Create from code → Manifest → Web editor**.

## Step 5: Configure Pod Security

```yaml
# Pod Security Standards (Kubernetes 1.25+)
# Apply to a namespace via labels
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

For specific pod restrictions:

```yaml
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      image: myapp:latest
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop:
            - ALL
```

## Step 6: Audit Portainer Actions

Portainer Business Edition records activity performed through Portainer. View activity logs:

1. Go to **Logs → Activity** (BE feature)
2. Filter by user, action, or time range

```text
2024-01-15 10:00:01  admin         CREATE   deployment  production/myapp
2024-01-15 10:05:32  john.doe      DELETE   pod         staging/api-xxxx
2024-01-15 10:10:44  jane.smith    UPDATE   configmap   development/app-config
```

## Step 7: Restrict Service Account Tokens

Disable automatic service account token mounting:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp
  namespace: production
automountServiceAccountToken: false   # Disable auto-mounting
```

Or at the pod level:

```yaml
spec:
  automountServiceAccountToken: false
  serviceAccountName: myapp
```

## Step 8: Review Portainer Service Account Permissions

Portainer's Kubernetes installation creates the ServiceAccount and ClusterRoleBinding it needs. Use Portainer roles and namespace access to limit what users can do; if you reduce Portainer's own service-account permissions, features that create or update cluster resources can stop working.

```text
Use the official Portainer Helm chart or install manifest to create the
Portainer ServiceAccount and ClusterRoleBinding.

Limit end-user actions with:
  - Portainer environment roles
  - Namespace access management
  - Kubernetes NetworkPolicy and Pod Security controls
```

## Conclusion

Kubernetes security in Portainer operates on two levels: Portainer-native access control (environment roles and namespace access) and Kubernetes-native security (RBAC, NetworkPolicy, Pod Security). Use Portainer's environment roles and namespace access features to control who can work in which namespaces within Portainer, and implement Kubernetes RBAC and NetworkPolicy for fine-grained resource access control. Regular audit log reviews help detect unauthorized or accidental changes.
