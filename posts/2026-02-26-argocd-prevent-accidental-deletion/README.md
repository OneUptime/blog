# How to Prevent Accidental Application Deletion in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security, RBAC

Description: Learn how to protect ArgoCD applications from accidental deletion using RBAC policies, deletion protection annotations, finalizer strategies, and organizational safeguards.

---

Accidentally deleting a production ArgoCD application can cascade into a full outage within seconds. If the application has cascade delete enabled, every Deployment, Service, and Ingress it manages gets wiped out. Even with non-cascade delete, you lose ArgoCD's management and monitoring of that application.

This guide covers multiple layers of protection you can put in place to make accidental deletions nearly impossible.

## Layer 1: RBAC restrictions on delete operations

The most effective protection is preventing unauthorized users from deleting applications entirely. ArgoCD RBAC policies let you restrict the `delete` action:

```yaml
# argocd-rbac-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # Developers can view and sync but NOT delete
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, */*, allow
    p, role:developer, applications, delete, */*, deny

    # Team leads can delete in dev/staging but NOT production
    p, role:team-lead, applications, delete, default/dev-*, allow
    p, role:team-lead, applications, delete, default/staging-*, allow
    p, role:team-lead, applications, delete, default/prod-*, deny

    # Only platform admins can delete production applications
    p, role:platform-admin, applications, delete, */*, allow

    # Map SSO groups to roles
    g, dev-team, role:developer
    g, team-leads, role:team-lead
    g, platform-team, role:platform-admin

  policy.default: role:developer
```

Test the RBAC policy before applying:

```bash
# Verify a developer cannot delete
argocd admin settings rbac can role:developer delete applications 'default/prod-web'
# Output: No

# Verify a platform-admin can delete
argocd admin settings rbac can role:platform-admin delete applications 'default/prod-web'
# Output: Yes
```

## Layer 2: Protect applications from pruning in app-of-apps

In an app-of-apps setup, removing a child application manifest from Git can trigger automatic deletion. Protect against this:

```yaml
# Child application with deletion protection
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-payment-service
  namespace: argocd
  annotations:
    # Prevent this app from being pruned by the parent
    argocd.argoproj.io/sync-options: Prune=false
spec:
  project: production
  source:
    repoURL: https://github.com/myorg/payment-service.git
    targetRevision: main
    path: manifests
  destination:
    server: https://kubernetes.default.svc
    namespace: payment
```

With `Prune=false`, even if someone accidentally removes this application manifest from the parent app's Git repository, ArgoCD will not delete it during sync.

## Layer 3: Remove cascade finalizer from critical applications

Without the cascade finalizer, deleting the Application resource does not affect the running Kubernetes resources:

```yaml
# Application without cascade finalizer - safest for production
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-api-gateway
  namespace: argocd
  # No finalizers section = no cascade delete
  # Even if someone deletes this Application, the pods keep running
spec:
  project: production
  source:
    repoURL: https://github.com/myorg/api-gateway.git
    targetRevision: main
    path: manifests
  destination:
    server: https://kubernetes.default.svc
    namespace: api-gateway
```

This is a trade-off: you lose automatic cleanup when you genuinely want to delete the application, but you gain protection against accidental data loss.

## Layer 4: Kubernetes admission webhooks

Deploy a validating admission webhook that intercepts delete requests for ArgoCD Applications:

```yaml
# Validating webhook configuration
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: argocd-deletion-guard
webhooks:
  - name: guard.argocd.example.com
    rules:
      - apiGroups: ["argoproj.io"]
        apiVersions: ["v1alpha1"]
        operations: ["DELETE"]
        resources: ["applications"]
    clientConfig:
      service:
        name: argocd-deletion-guard
        namespace: argocd
        path: /validate
    admissionReviewVersions: ["v1"]
    sideEffects: None
    failurePolicy: Fail
    # Only protect applications with specific labels
    objectSelector:
      matchLabels:
        deletion-protection: "enabled"
```

Add the protection label to critical applications:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-database
  namespace: argocd
  labels:
    deletion-protection: "enabled"  # Webhook will intercept delete requests
```

A simple webhook implementation can require a specific header or annotation before allowing deletion, or require approval from a second person.

## Layer 5: Protect managed resources with prevent-delete annotation

ArgoCD supports a resource-level annotation that prevents specific resources from being pruned or deleted:

```yaml
# Deployment that ArgoCD will never delete
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-service
  namespace: production
  annotations:
    argocd.argoproj.io/sync-options: Prune=false
spec:
  replicas: 3
  selector:
    matchLabels:
      app: critical-service
  template:
    metadata:
      labels:
        app: critical-service
    spec:
      containers:
        - name: app
          image: myorg/critical-service:v1.2.3
```

You can also apply this at the application level for all resources:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-critical
  namespace: argocd
spec:
  syncPolicy:
    syncOptions:
      - Prune=false  # Never prune any resources in this application
```

## Layer 6: Git branch protection

Since ArgoCD applications are defined in Git, protecting the Git repository adds another safety layer:

```yaml
# GitHub branch protection rules (configure via GitHub UI or API)
# For your ArgoCD config repository:
# - Require pull request reviews before merging
# - Require at least 2 approvals for changes to apps/ directory
# - Require CODEOWNERS approval
# - Prevent force pushes
# - Restrict who can push to main
```

Create a CODEOWNERS file in your ArgoCD config repo:

```text
# ArgoCD config repo CODEOWNERS
# Production application changes require platform team approval
apps/prod-* @platform-team
apps/production/ @platform-team

# Any application deletion requires two approvals
# (enforce via branch protection rules)
```

## Layer 7: Deletion audit trail

While not prevention, having a clear audit trail deters careless deletions and helps with recovery:

```yaml
# Enable ArgoCD audit logging
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Enable server audit logging
  server.audit.enabled: "true"
```

Set up alerts for deletion events:

```yaml
# ArgoCD Notification trigger for application deletion
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  trigger.on-deleted: |
    - description: Application has been deleted
      send:
        - app-deleted
      when: app.metadata.deletionTimestamp != nil
  template.app-deleted: |
    message: |
      Application {{.app.metadata.name}} is being deleted by {{.app.status.operationState.operation.initiatedBy.username}}
      Project: {{.app.spec.project}}
      Cluster: {{.app.spec.destination.server}}
      Namespace: {{.app.spec.destination.namespace}}
  service.slack: |
    token: $slack-token
    channel: argocd-alerts
```

## Layer 8: ApplicationSet deletion protection

If you use ApplicationSets, configure them to prevent accidental deletion of generated applications:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: production-services
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/config.git
        revision: HEAD
        directories:
          - path: services/*
  template:
    metadata:
      name: 'prod-{{path.basename}}'
      namespace: argocd
    spec:
      project: production
      source:
        repoURL: https://github.com/myorg/config.git
        targetRevision: HEAD
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
  syncPolicy:
    preserveResourcesOnDeletion: true  # Keep generated apps if ApplicationSet is deleted
```

The `preserveResourcesOnDeletion: true` setting ensures that if the ApplicationSet itself is deleted, all the Applications it generated continue to exist.

## Combining layers for maximum protection

For production-critical applications, combine multiple layers:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-payment-gateway
  namespace: argocd
  labels:
    deletion-protection: "enabled"    # Layer 4: Webhook protection
    environment: production
  annotations:
    argocd.argoproj.io/sync-options: Prune=false  # Layer 2: Prune protection
  # No finalizers = no cascade delete             # Layer 3: No cascade
spec:
  project: production                              # Layer 1: RBAC via project
  source:
    repoURL: https://github.com/myorg/payment.git
    targetRevision: main
    path: manifests
  destination:
    server: https://kubernetes.default.svc
    namespace: payment
  syncPolicy:
    syncOptions:
      - Prune=false                               # Layer 5: Resource-level protection
```

## Summary

Preventing accidental ArgoCD application deletion requires defense in depth. Start with RBAC to restrict who can delete, add prune protection to prevent automated deletions, remove cascade finalizers from critical applications, and use Git branch protection to control changes to application definitions. Layer in admission webhooks for additional control, set up audit logging and notifications for visibility, and configure ApplicationSet preservation policies. No single layer is foolproof, but combining them makes accidental deletion of a production application extremely difficult.
