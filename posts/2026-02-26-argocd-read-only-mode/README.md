# How to Run ArgoCD in Read-Only Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security, RBAC

Description: Learn how to configure ArgoCD in read-only mode to allow teams to view application status without being able to modify deployments or trigger syncs.

---

Not everyone who needs to see ArgoCD should be able to change things. Developers might need to check deployment status, support teams might need to see application health, and auditors might need to review configuration. All of these use cases call for read-only access. This guide covers multiple approaches to running ArgoCD in read-only mode.

## Why Read-Only Mode

In a production environment, you want to follow the principle of least privilege. Most users of ArgoCD only need to view information - they do not need to trigger syncs, modify applications, or change settings. Providing read-only access reduces the risk of accidental (or malicious) changes to your deployment pipeline.

Common read-only use cases:

- Developers checking if their code has been deployed
- Support teams verifying application health during incidents
- Security teams auditing deployment configurations
- Stakeholders viewing deployment dashboards
- Monitoring integrations that poll ArgoCD for status

## Approach 1: RBAC-Based Read-Only Access

The most flexible approach is to configure RBAC policies that grant read-only permissions. ArgoCD includes a built-in `readonly` role:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  # Set the default policy to read-only
  policy.default: role:readonly
  policy.csv: |
    # The built-in readonly role allows:
    # - View all applications
    # - View all projects
    # - View all repositories
    # - View all clusters
    # - View logs
    # But does NOT allow:
    # - Sync, create, update, or delete applications
    # - Modify projects
    # - Modify repositories
    # - Modify clusters

    # Grant admin access only to the ops team
    g, ops-team, role:admin

    # Everyone else gets read-only by default
```

This means anyone who authenticates but is not in the `ops-team` SSO group will only have read-only access.

### Custom Read-Only Roles

You can create more granular read-only roles. For example, a role that can only view specific projects:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:none
  policy.csv: |
    # Read-only access to all applications in the 'frontend' project
    p, role:frontend-viewer, applications, get, frontend/*, allow
    p, role:frontend-viewer, logs, get, frontend/*, allow

    # Read-only access to all applications in the 'backend' project
    p, role:backend-viewer, applications, get, backend/*, allow
    p, role:backend-viewer, logs, get, backend/*, allow

    # Read-only access to everything
    p, role:global-viewer, applications, get, */*, allow
    p, role:global-viewer, projects, get, *, allow
    p, role:global-viewer, repositories, get, *, allow
    p, role:global-viewer, clusters, get, *, allow
    p, role:global-viewer, logs, get, */*, allow

    # Map groups to roles
    g, frontend-devs, role:frontend-viewer
    g, backend-devs, role:backend-viewer
    g, management, role:global-viewer
    g, ops, role:admin
```

### Testing Read-Only RBAC

Verify that read-only users cannot perform write operations:

```bash
# Test as a read-only user
argocd account can-i get applications '*/*'
# Output: yes

argocd account can-i sync applications '*/*'
# Output: no

argocd account can-i delete applications '*/*'
# Output: no

argocd account can-i create applications '*/*'
# Output: no
```

You can also test with the admin RBAC validation tool:

```bash
# Validate that a specific role has read-only access
argocd admin settings rbac validate \
  --policy-file policy.csv \
  --subject role:frontend-viewer

# Test specific actions
argocd admin settings rbac can role:frontend-viewer sync applications 'frontend/*' \
  --policy-file policy.csv
```

## Approach 2: Anonymous Read-Only Access

For internal dashboards or monitoring, you can enable anonymous read-only access. This allows anyone with network access to view ArgoCD without authentication:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Enable anonymous access
  users.anonymous.enabled: "true"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  # Map anonymous users to the readonly role
  policy.default: role:readonly
```

**Warning**: Only enable anonymous access if ArgoCD is behind a VPN or firewall. Never expose anonymous access to the internet.

For more restrictive anonymous access, create a custom role:

```yaml
data:
  policy.default: role:anonymous-viewer
  policy.csv: |
    # Anonymous users can only view application status
    p, role:anonymous-viewer, applications, get, */*, allow
    # Cannot view logs or other sensitive information
```

## Approach 3: ArgoCD Core Mode (Server-Side Read-Only)

ArgoCD Core mode runs without the UI and API server, using only the application controller. You can run a separate read-only API server instance:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server-readonly
  namespace: argocd
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-server-readonly
  template:
    metadata:
      labels:
        app.kubernetes.io/name: argocd-server-readonly
    spec:
      containers:
        - name: argocd-server
          image: quay.io/argoproj/argocd:v2.13.0
          command:
            - argocd-server
            - --staticassets
            - /shared/app
            - --loglevel
            - info
          env:
            - name: ARGOCD_SERVER_DISABLE_AUTH
              value: "true"  # Only for internal network
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
```

Pair this with a strict RBAC policy that only allows read operations:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
```

## Approach 4: Read-Only API Tokens

For CI/CD integrations and monitoring tools that need to query ArgoCD, create read-only API tokens:

```bash
# Create a local account for monitoring
kubectl patch configmap argocd-cm -n argocd --type merge -p '
{
  "data": {
    "accounts.monitoring": "apiKey"
  }
}'

# Set RBAC for the monitoring account
kubectl patch configmap argocd-rbac-cm -n argocd --type merge -p '
{
  "data": {
    "policy.csv": "p, role:monitoring, applications, get, */*, allow\ng, monitoring, role:monitoring"
  }
}'

# Generate a read-only API token
argocd account generate-token --account monitoring
```

Use this token in your monitoring tool:

```bash
# Query application status with read-only token
curl -H "Authorization: Bearer <token>" \
  https://argocd.example.com/api/v1/applications

# Check specific application health
curl -H "Authorization: Bearer <token>" \
  https://argocd.example.com/api/v1/applications/my-app
```

## Hiding Sensitive Information

Even in read-only mode, ArgoCD might display sensitive information like repository URLs, cluster endpoints, or environment variables. You can configure what information is visible:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Hide repository credentials in the UI
  oidc.config: |
    # SSO configuration hidden from non-admin users
  # Restrict what information is shown in application details
  resource.exclusions: |
    - apiGroups:
        - ""
      kinds:
        - Secret
      clusters:
        - "*"
```

## Monitoring Read-Only Access

Track who is using read-only access and what they are viewing:

```bash
# Check ArgoCD server logs for read-only access
kubectl logs deployment/argocd-server -n argocd | \
  jq 'select(.msg | contains("GET"))'
```

## Conclusion

Read-only mode in ArgoCD is best implemented through RBAC policies. The built-in `readonly` role covers most use cases, but custom roles give you fine-grained control over what each team can see. For monitoring integrations, use dedicated API tokens with read-only permissions. Avoid anonymous access unless ArgoCD is behind a VPN. The goal is to give everyone the visibility they need without the ability to make changes they should not.

For more on RBAC configuration, see our guide on configuring RBAC policies in ArgoCD.
