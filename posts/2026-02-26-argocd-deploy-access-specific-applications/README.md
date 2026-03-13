# How to Grant Deploy Access to Specific Applications in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, RBAC, Deployments

Description: Learn how to configure ArgoCD RBAC to grant deploy and sync access to specific applications while keeping other apps locked down for different teams.

---

Giving a developer the ability to deploy a specific application without granting them access to every other application in your cluster is one of the most common RBAC requirements in ArgoCD. You want the frontend team to deploy their web app but not touch the payment service. You want the CI pipeline to sync a staging app but never the production one.

This guide walks through the exact RBAC configuration to grant deploy access to specific applications.

## What "Deploy Access" Means in ArgoCD

Deploying an application in ArgoCD involves several actions:

- **sync** - Trigger a sync operation to apply changes from Git to the cluster
- **action** - Perform resource actions like restarting a deployment or scaling replicas
- **override** - Override application parameters during sync
- **get** - View the application (required to see what you are deploying)

A typical deploy role includes all of these. You might also want to include `logs` access so deployers can check pod logs after deployment.

## Granting Sync Access to a Single Application

Here is the most specific RBAC policy - granting deploy access to exactly one application:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # Grant deploy access to a specific application
    p, role:web-deployer, applications, get, frontend/web-app, allow
    p, role:web-deployer, applications, sync, frontend/web-app, allow
    p, role:web-deployer, applications, action, frontend/web-app, allow
    p, role:web-deployer, logs, get, frontend/web-app, allow

    # Assign a user to this role
    g, web-developer@company.com, role:web-deployer

  policy.default: ""
```

The format is `<project>/<application>`. In this case, the user can only deploy the `web-app` application that lives in the `frontend` project.

## Granting Sync Access to Multiple Specific Applications

When a team owns several applications, list each one explicitly:

```yaml
policy.csv: |
  # Frontend team can deploy their three applications
  p, role:frontend-deployer, applications, get, frontend/web-app, allow
  p, role:frontend-deployer, applications, get, frontend/admin-portal, allow
  p, role:frontend-deployer, applications, get, frontend/marketing-site, allow

  p, role:frontend-deployer, applications, sync, frontend/web-app, allow
  p, role:frontend-deployer, applications, sync, frontend/admin-portal, allow
  p, role:frontend-deployer, applications, sync, frontend/marketing-site, allow

  p, role:frontend-deployer, applications, action, frontend/web-app, allow
  p, role:frontend-deployer, applications, action, frontend/admin-portal, allow
  p, role:frontend-deployer, applications, action, frontend/marketing-site, allow

  p, role:frontend-deployer, logs, get, frontend/*, allow

  g, team-frontend, role:frontend-deployer
```

This is verbose but explicit. Each application is individually listed, making it clear exactly what the role can deploy.

## Using Wildcard Patterns for Application Groups

If your applications follow a naming convention, you can use glob patterns:

```yaml
policy.csv: |
  # Deploy any app starting with "staging-" in the myproject project
  p, role:staging-deployer, applications, get, myproject/staging-*, allow
  p, role:staging-deployer, applications, sync, myproject/staging-*, allow
  p, role:staging-deployer, applications, action, myproject/staging-*, allow

  # Deploy any app in the frontend project
  p, role:frontend-deployer, applications, get, frontend/*, allow
  p, role:frontend-deployer, applications, sync, frontend/*, allow
  p, role:frontend-deployer, applications, action, frontend/*, allow
```

Naming conventions like `staging-web-app`, `staging-api`, `prod-web-app`, `prod-api` make wildcard RBAC policies much cleaner.

## Separating View Access from Deploy Access

A good practice is to give broad view access but narrow deploy access:

```yaml
policy.csv: |
  # Everyone can view all applications
  p, role:viewer, applications, get, */*, allow
  p, role:viewer, logs, get, */*, allow

  # Frontend team can additionally deploy frontend apps
  p, role:frontend-deployer, applications, sync, frontend/*, allow
  p, role:frontend-deployer, applications, action, frontend/*, allow

  # Backend team can additionally deploy backend apps
  p, role:backend-deployer, applications, sync, backend/*, allow
  p, role:backend-deployer, applications, action, backend/*, allow

  # Assign both roles to teams
  g, team-frontend, role:viewer
  g, team-frontend, role:frontend-deployer

  g, team-backend, role:viewer
  g, team-backend, role:backend-deployer

  # QA team only gets viewer
  g, team-qa, role:viewer
```

This way, everyone has visibility into the whole system, but only the responsible team can deploy to their applications.

## Deploy Access Without Delete Permission

A common requirement is allowing syncs but preventing application deletion. Use explicit deny rules:

```yaml
policy.csv: |
  # Allow all app operations within the project
  p, role:safe-deployer, applications, get, myproject/*, allow
  p, role:safe-deployer, applications, sync, myproject/*, allow
  p, role:safe-deployer, applications, action, myproject/*, allow
  p, role:safe-deployer, applications, override, myproject/*, allow
  p, role:safe-deployer, logs, get, myproject/*, allow

  # Explicitly deny create and delete
  p, role:safe-deployer, applications, create, myproject/*, deny
  p, role:safe-deployer, applications, delete, myproject/*, deny
```

This role lets users sync existing applications but cannot create new ones or delete existing ones. Only platform admins should have create and delete permissions for production applications.

## CI/CD Pipeline Deploy Access

For automated pipelines, create a dedicated role with the minimum permissions needed:

```yaml
policy.csv: |
  # CI/CD bot can only sync specific apps
  p, role:ci-deployer, applications, get, production/api-service, allow
  p, role:ci-deployer, applications, sync, production/api-service, allow
  p, role:ci-deployer, applications, get, production/web-frontend, allow
  p, role:ci-deployer, applications, sync, production/web-frontend, allow

  # Assign to the CI service account
  g, ci-deploy-bot, role:ci-deployer
```

Generate a token for the CI bot:

```bash
# Create a local account for the CI bot
kubectl patch configmap argocd-cm -n argocd --type merge -p '
{
  "data": {
    "accounts.ci-deploy-bot": "apiKey"
  }
}'

# Generate an API token
argocd account generate-token --account ci-deploy-bot
```

Use this token in your CI pipeline to trigger syncs:

```bash
# In your CI pipeline
argocd app sync production/api-service --auth-token $ARGOCD_TOKEN
```

## Environment-Based Deploy Access

For teams that manage the same application across environments:

```yaml
policy.csv: |
  # Developers can deploy to staging
  p, role:dev-deployer, applications, get, */*, allow
  p, role:dev-deployer, applications, sync, staging/*, allow
  p, role:dev-deployer, applications, action, staging/*, allow

  # Release managers can deploy to production
  p, role:release-manager, applications, get, */*, allow
  p, role:release-manager, applications, sync, production/*, allow
  p, role:release-manager, applications, action, production/*, allow

  g, developers, role:dev-deployer
  g, release-managers, role:release-manager
```

This creates a clear promotion path: developers deploy to staging, and release managers deploy to production.

## Testing Your Deploy Access Policies

Always verify before applying:

```bash
# Can the frontend deployer sync the web-app?
argocd admin settings rbac can role:frontend-deployer sync applications 'frontend/web-app' \
  --policy-file policy.csv
# Output: Yes

# Can the frontend deployer delete the web-app?
argocd admin settings rbac can role:frontend-deployer delete applications 'frontend/web-app' \
  --policy-file policy.csv
# Output: No

# Can the frontend deployer sync a backend app?
argocd admin settings rbac can role:frontend-deployer sync applications 'backend/api' \
  --policy-file policy.csv
# Output: No
```

## Summary

Granting deploy access to specific applications in ArgoCD comes down to writing precise RBAC policies with the correct `<project>/<application>` patterns. Use exact application names for maximum restriction, glob patterns for team-level access, and always combine deploy access with explicit deny rules for dangerous operations like delete. Test every policy with `argocd admin settings rbac can` before applying it to your cluster.
