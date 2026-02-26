# How to Configure Project Roles in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, RBAC, Security

Description: Learn how to define project-level roles in ArgoCD AppProjects with fine-grained policies for CI/CD automation, team access control, and SSO group integration.

---

ArgoCD supports two levels of role-based access control: global RBAC policies defined in the `argocd-rbac-cm` ConfigMap, and project-level roles defined directly in AppProject specs. Project roles are particularly useful for CI/CD automation because they can generate JWT tokens for service accounts, and for team management because they can be mapped to SSO groups.

This guide covers how to define, configure, and use project roles effectively.

## Understanding Project Roles

A project role is defined within an AppProject and has:

- A name and description
- One or more policies that grant or deny specific actions
- Optional SSO group mappings
- The ability to generate JWT tokens for programmatic access

Project role policies follow the same Casbin format as global RBAC, but are scoped to the project:

```
p, proj:<project>:<role>, <resource>, <action>, <project>/<object>, <effect>
```

## Creating Basic Project Roles

### Read-Only Viewer

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: backend
  namespace: argocd
spec:
  description: "Backend team project"
  sourceRepos:
    - "https://github.com/my-org/backend-*"
  destinations:
    - server: "https://kubernetes.default.svc"
      namespace: "backend-*"

  roles:
    - name: viewer
      description: "Read-only access to all backend applications"
      policies:
        - p, proj:backend:viewer, applications, get, backend/*, allow
```

### Deployer Role

A role that can view and sync but not create or delete applications:

```yaml
roles:
  - name: deployer
    description: "Can view and sync applications"
    policies:
      - p, proj:backend:deployer, applications, get, backend/*, allow
      - p, proj:backend:deployer, applications, sync, backend/*, allow
```

### Admin Role

Full control over all applications in the project:

```yaml
roles:
  - name: admin
    description: "Full access to all backend applications"
    policies:
      - p, proj:backend:admin, applications, *, backend/*, allow
```

### CI/CD Pipeline Role

A role specifically for automated pipelines that only syncs specific applications:

```yaml
roles:
  - name: ci-deployer
    description: "CI/CD pipeline - can sync specific applications"
    policies:
      - p, proj:backend:ci-deployer, applications, get, backend/*, allow
      - p, proj:backend:ci-deployer, applications, sync, backend/api-service, allow
      - p, proj:backend:ci-deployer, applications, sync, backend/worker-service, allow
```

## Complete Project with Multiple Roles

Here is a fully configured project with roles for different access levels:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: payments
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  description: "Payments team project"

  sourceRepos:
    - "https://github.com/my-org/payments-*"
    - "https://github.com/my-org/shared-charts.git"

  destinations:
    - server: "https://kubernetes.default.svc"
      namespace: "payments-dev"
    - server: "https://kubernetes.default.svc"
      namespace: "payments-staging"
    - server: "https://kubernetes.default.svc"
      namespace: "payments-prod"

  namespaceResourceWhitelist:
    - group: ""
      kind: "*"
    - group: apps
      kind: "*"
    - group: networking.k8s.io
      kind: "*"

  clusterResourceWhitelist: []

  roles:
    # Full access for team leads
    - name: team-lead
      description: "Full access to payments applications"
      policies:
        - p, proj:payments:team-lead, applications, *, payments/*, allow
        - p, proj:payments:team-lead, logs, get, payments/*, allow
        - p, proj:payments:team-lead, exec, create, payments/*, allow
      groups:
        - my-org:payments-leads

    # Developers can view and sync to dev/staging
    - name: developer
      description: "Dev/staging access for developers"
      policies:
        - p, proj:payments:developer, applications, get, payments/*, allow
        - p, proj:payments:developer, applications, sync, payments/payments-*-dev, allow
        - p, proj:payments:developer, applications, sync, payments/payments-*-staging, allow
        - p, proj:payments:developer, logs, get, payments/*, allow
      groups:
        - my-org:payments-devs

    # CI/CD pipeline
    - name: ci-pipeline
      description: "Automated deployment pipeline"
      policies:
        - p, proj:payments:ci-pipeline, applications, get, payments/*, allow
        - p, proj:payments:ci-pipeline, applications, sync, payments/*, allow
        - p, proj:payments:ci-pipeline, applications, action/*, payments/*, allow

    # On-call engineer can view and restart
    - name: oncall
      description: "On-call engineer - view and restart"
      policies:
        - p, proj:payments:oncall, applications, get, payments/*, allow
        - p, proj:payments:oncall, applications, sync, payments/*, allow
        - p, proj:payments:oncall, applications, action/*, payments/*, allow
        - p, proj:payments:oncall, logs, get, payments/*, allow
      groups:
        - my-org:oncall-rotation
```

## Mapping SSO Groups to Project Roles

Project roles can be directly linked to SSO groups using the `groups` field:

```yaml
roles:
  - name: developer
    policies:
      - p, proj:backend:developer, applications, get, backend/*, allow
      - p, proj:backend:developer, applications, sync, backend/*, allow
    groups:
      # GitHub teams
      - my-org:backend-developers
      # Or Okta groups
      - Backend Developers
      # Or Azure AD group IDs
      - "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

When a user authenticates through SSO and their group claims include any of these groups, they automatically get the role's permissions.

### Multiple Groups per Role

```yaml
roles:
  - name: deployer
    policies:
      - p, proj:backend:deployer, applications, sync, backend/*, allow
    groups:
      - my-org:backend-developers
      - my-org:backend-sre
      - my-org:platform-engineers
```

## Policy Syntax Deep Dive

### Resources and Actions

Available resources and their actions:

| Resource | Actions |
|---|---|
| applications | get, create, update, delete, sync, override, action/* |
| logs | get |
| exec | create |

### Wildcard Patterns

```yaml
policies:
  # All actions on all applications in the project
  - p, proj:backend:admin, applications, *, backend/*, allow

  # Sync only applications matching a pattern
  - p, proj:backend:dev-deployer, applications, sync, backend/*-dev, allow

  # All resource actions on specific application
  - p, proj:backend:api-admin, applications, *, backend/api-service, allow
```

### Combining Allow and Deny

```yaml
roles:
  - name: restricted-deployer
    policies:
      # Allow syncing all apps
      - p, proj:backend:restricted-deployer, applications, sync, backend/*, allow
      # But deny syncing the production database app
      - p, proj:backend:restricted-deployer, applications, sync, backend/prod-database, deny
      # Allow viewing everything
      - p, proj:backend:restricted-deployer, applications, get, backend/*, allow
```

Deny rules always take precedence over allow rules.

## Using Project Roles for Log and Exec Access

ArgoCD can stream pod logs and open exec sessions. Control these per role:

```yaml
roles:
  - name: debugger
    description: "Can view logs and exec into pods"
    policies:
      - p, proj:backend:debugger, applications, get, backend/*, allow
      - p, proj:backend:debugger, logs, get, backend/*, allow
      - p, proj:backend:debugger, exec, create, backend/*, allow
    groups:
      - my-org:backend-sre

  - name: viewer
    description: "Can only view apps, no logs or exec"
    policies:
      - p, proj:backend:viewer, applications, get, backend/*, allow
    groups:
      - my-org:backend-viewers
```

## Managing Roles with the CLI

### List Project Roles

```bash
argocd proj role list backend
```

### Add a Role

```bash
argocd proj role create backend developer \
  --description "Developer access"
```

### Add Policies to a Role

```bash
argocd proj role add-policy backend developer \
  -a get -p allow -o "backend/*"

argocd proj role add-policy backend developer \
  -a sync -p allow -o "backend/*-dev"
```

### Add a Group to a Role

```bash
argocd proj role add-group backend developer my-org:backend-devs
```

### Remove a Group from a Role

```bash
argocd proj role remove-group backend developer my-org:backend-devs
```

## Interaction with Global RBAC

Project roles work alongside global RBAC policies. The effective permissions are the union of:

1. Global RBAC policies matching the user's role or group
2. Project role policies matching the user's SSO groups

If either grants a permission, the user has it (unless a deny rule exists).

```yaml
# Global RBAC (argocd-rbac-cm)
p, role:everyone, applications, get, */*, allow

# Project role (AppProject spec)
roles:
  - name: deployer
    policies:
      - p, proj:backend:deployer, applications, sync, backend/*, allow
    groups:
      - my-org:backend-devs
```

A user in `my-org:backend-devs` would have both `get` (from global) and `sync` (from project role) permissions on backend applications.

## Troubleshooting

**Role has no effect**: Verify the policy syntax follows the exact Casbin format. The project name in the policy must match the AppProject name:

```yaml
# Correct
- p, proj:backend:deployer, applications, sync, backend/*, allow

# Wrong - missing proj: prefix
- p, backend:deployer, applications, sync, backend/*, allow
```

**SSO group not recognized**: Check that the SSO provider sends group claims and the scope is configured:

```bash
# Check what groups ArgoCD sees for the current user
argocd account get-user-info
```

**Permission denied despite correct policy**: Check for conflicting deny rules in either global RBAC or the project role itself.

## Summary

Project roles provide fine-grained access control scoped to individual ArgoCD projects. Define roles for different access levels (viewer, developer, deployer, admin, CI pipeline), map SSO groups to roles for zero-touch access management, and use JWT tokens for CI/CD automation. The combination of project-level roles and global RBAC gives you a powerful, layered security model for multi-tenant ArgoCD environments.
