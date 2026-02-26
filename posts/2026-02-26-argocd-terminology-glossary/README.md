# ArgoCD Terminology Glossary: Every Term Explained

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Reference

Description: A comprehensive glossary of ArgoCD terminology covering every key term, concept, and component with clear definitions and practical context.

---

ArgoCD has its own vocabulary that can be confusing for newcomers. This glossary covers every important term you will encounter, from basic concepts to advanced features. Use it as a reference whenever you come across an unfamiliar term in the ArgoCD documentation, logs, or UI.

## Core Concepts

### Application

The fundamental unit in ArgoCD. An Application defines a mapping between a source (Git repository path) and a destination (Kubernetes cluster and namespace). It tells ArgoCD what to deploy and where.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/repo.git
    path: apps/my-app
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

### AppProject (Project)

A logical grouping of Applications that defines boundaries and access control. Projects restrict which Git repositories, Kubernetes clusters, namespaces, and resource types an Application can use. The `default` project allows everything.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
spec:
  sourceRepos:
  - 'https://github.com/myorg/*'
  destinations:
  - server: https://production-cluster.example.com
    namespace: '*'
```

### ApplicationSet

A template-based approach for generating multiple Applications from a single definition. ApplicationSets use generators (Git, List, Cluster, Matrix, Merge) to dynamically create Applications. Useful for managing many similar deployments across environments or clusters.

### Desired State

The set of Kubernetes resources defined in your Git repository after processing through Helm, Kustomize, or plain YAML. This is what ArgoCD believes should exist in the cluster. See [what desired state means in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-desired-state-explained/view).

### Live State

The actual current state of resources in the Kubernetes cluster, as reported by the Kubernetes API. ArgoCD compares this with the desired state to determine sync status.

### GitOps

A set of practices where Git serves as the single source of truth for declarative infrastructure and application configuration. Changes to infrastructure are made through Git commits, and automated processes ensure the target system matches what Git declares.

### Source of Truth

In GitOps with ArgoCD, the Git repository is the single source of truth. The cluster state should always converge toward what Git declares.

## Sync Terminology

### Sync

The process of applying the desired state from Git to the Kubernetes cluster. A sync operation creates, updates, or deletes resources to make the live state match the desired state.

### Sync Status

Indicates whether the live state matches the desired state. Possible values: **Synced** (they match), **OutOfSync** (they differ), **Unknown** (cannot determine).

### Sync Operation

A specific instance of a sync process. Each operation has a status (Succeeded, Failed, Running), a target revision, and a result. Operations are recorded in the Application's history.

### Sync Policy

Configuration that determines how and when syncs happen. Can be **manual** (user-triggered) or **automated** (ArgoCD syncs automatically when it detects differences).

### Auto-Sync

Automated sync that triggers when ArgoCD detects the live state does not match the desired state. Configured in the Application's sync policy.

### Self-Heal

A sync policy option that automatically reverts manual changes to the cluster. When enabled, if someone uses kubectl to modify a managed resource, ArgoCD detects the drift and restores the resource to match Git.

### Prune

The act of deleting resources from the cluster that no longer exist in Git. When you remove a manifest from your repository, pruning ensures the corresponding resource is deleted from the cluster. Must be explicitly enabled.

### Sync Wave

A mechanism for controlling the order in which resources are synced. Resources are annotated with a wave number (`argocd.argoproj.io/sync-wave`), and lower waves are synced before higher waves. See [how to implement sync waves](https://oneuptime.com/blog/post/2026-01-25-sync-waves-argocd/view).

### Sync Window

A scheduled time period during which syncs are either allowed or denied. Configured at the Project level. Used to prevent deployments during off-hours or restrict changes to maintenance windows.

### Sync Option

A per-application or per-resource configuration that modifies sync behavior. Examples include `Validate=false`, `CreateNamespace=true`, `ServerSideApply=true`, and `PruneLast=true`.

## Health Terminology

### Health Status

Indicates whether the application's resources are functioning correctly. Possible values: **Healthy**, **Progressing**, **Degraded**, **Suspended**, **Missing**, **Unknown**.

### Health Check

A function that evaluates the health of a specific resource type. ArgoCD has built-in health checks for standard Kubernetes resources and supports custom health checks for CRDs.

### Degraded

A health status indicating that a resource has a problem. For example, a Deployment with failing pods or a Job that has failed.

### Progressing

A health status indicating that a resource is in the process of becoming healthy. For example, a Deployment that is rolling out new pods.

### Suspended

A health status indicating that a resource is intentionally paused. For example, a CronJob that is suspended or an Argo Rollout paused during analysis.

## Resource Terminology

### Resource Hook

A mechanism for running tasks at specific points during the sync lifecycle. Hooks are annotated with `argocd.argoproj.io/hook` and can be PreSync, Sync, PostSync, or SyncFail.

### PreSync Hook

A resource (typically a Job) that runs before the main sync operation. Common use case: database migrations.

### PostSync Hook

A resource that runs after all synced resources are healthy. Common use case: smoke tests or notifications.

### SyncFail Hook

A resource that runs when a sync operation fails. Common use case: alerting or cleanup after failed deployments.

### Hook Delete Policy

Controls when hook resources are cleaned up. Options: `HookSucceeded` (delete after success), `HookFailed` (delete after failure), `BeforeHookCreation` (delete before the next hook run).

### Finalizer

A Kubernetes mechanism used by ArgoCD to control deletion behavior. The `resources-finalizer.argocd.argoproj.io` finalizer ensures that deleting an Application also deletes its managed Kubernetes resources.

### Resource Tracking

How ArgoCD identifies which resources belong to which Application. Can use labels, annotations, or both. The tracking method affects how ArgoCD discovers and manages resources.

### Orphaned Resource

A Kubernetes resource that exists in a namespace monitored by an ArgoCD Project but is not managed by any Application. ArgoCD can detect and optionally warn about orphaned resources.

## Component Terminology

### API Server (argocd-server)

The ArgoCD component that handles all user-facing interactions. Serves the web UI, processes gRPC (CLI) and REST (UI/API) requests, handles authentication, and enforces RBAC. See [how the API server handles requests](https://oneuptime.com/blog/post/2026-02-26-argocd-api-server-explained/view).

### Application Controller (argocd-application-controller)

The core component that watches Application resources, compares desired and live state, executes syncs, and monitors health. Runs as a StatefulSet.

### Repo Server (argocd-repo-server)

The component responsible for cloning Git repositories and generating Kubernetes manifests using Helm, Kustomize, or custom tools. See [how the Repo Server works](https://oneuptime.com/blog/post/2026-02-26-argocd-repo-server-explained/view).

### Redis (argocd-redis)

The caching layer that stores application state, manifest cache, cluster state, and Git revision information. See [understanding ArgoCD's Redis cache](https://oneuptime.com/blog/post/2026-02-26-argocd-redis-cache-explained/view).

### Dex (argocd-dex-server)

An optional OpenID Connect identity broker that handles SSO authentication. Connects ArgoCD to identity providers like GitHub, LDAP, SAML, and OIDC.

### Config Management Plugin (CMP)

An extension mechanism that lets you use custom tools for manifest generation. CMPs run as sidecar containers alongside the Repo Server.

## Advanced Terminology

### App of Apps

A pattern where a parent Application manages child Applications. The parent Application's Git repository contains Application YAML definitions. When ArgoCD syncs the parent, it creates the child Applications, which then sync their own resources.

### ApplicationSet Controller

A separate controller (bundled with ArgoCD) that watches ApplicationSet resources and generates Application resources based on the defined generators and templates.

### Generator

A component within an ApplicationSet that produces a list of parameters. Types include Git generator, List generator, Cluster generator, Pull Request generator, Matrix generator, and Merge generator.

### Cluster Secret

A Kubernetes Secret in the ArgoCD namespace that contains credentials for accessing external Kubernetes clusters. Used for multi-cluster management.

### Refresh

The act of checking Git for new commits and updating the desired state. A **normal refresh** checks Git and regenerates manifests. A **hard refresh** invalidates the manifest cache and forces complete regeneration.

### Reconciliation

The continuous process where the Application Controller compares desired and live state for each Application and takes corrective action if needed. The reconciliation loop is the core of ArgoCD's operation.

### Sharding

A scaling technique where the Application Controller workload is distributed across multiple replicas. Each shard manages a subset of Applications.

### Diff

The computed difference between the desired state and the live state. ArgoCD normalizes both sides before computing the diff to avoid false positives from defaults and server-generated fields.

### Diff Customization

Configuration that tells ArgoCD to ignore specific differences during comparison. Used when controllers, operators, or webhooks legitimately modify resources.

### RBAC (Role-Based Access Control)

ArgoCD's permission system that controls what actions users and groups can perform on which resources. Uses a Casbin-based policy engine. See [how to configure RBAC](https://oneuptime.com/blog/post/2026-01-25-rbac-policies-argocd/view).

### SSO (Single Sign-On)

Authentication mechanism that allows users to log into ArgoCD using their existing identity provider credentials. Implemented through Dex or direct OIDC.

### Image Updater

A companion tool (ArgoCD Image Updater) that automatically detects new container image versions in registries and updates Git repositories, triggering ArgoCD syncs.

### Progressive Delivery

A deployment strategy that gradually rolls out changes using canary or blue-green deployments. Implemented through Argo Rollouts, a companion project to ArgoCD.

### Argo Rollouts

A Kubernetes controller and CRD that provides advanced deployment strategies (canary, blue-green, experimentation) to ArgoCD-managed applications.

### Webhook

An HTTP callback that notifies ArgoCD when Git repositories change. Faster than polling because ArgoCD learns about changes immediately instead of waiting for the next poll cycle.

### Target Revision

The Git reference (branch, tag, or commit SHA) that an Application tracks. ArgoCD generates the desired state from this revision.

### Repository Credentials

Authentication information (SSH keys, HTTPS tokens, GitHub App credentials) that ArgoCD uses to access private Git repositories.

### GnuPG Key

A cryptographic key used to verify Git commit signatures. ArgoCD can be configured to only sync commits that are signed with trusted GnuPG keys.

## Status Values Reference

| Status Type | Value | Meaning |
|-------------|-------|---------|
| Sync | Synced | Cluster matches Git |
| Sync | OutOfSync | Cluster differs from Git |
| Sync | Unknown | Cannot determine |
| Health | Healthy | All resources working |
| Health | Progressing | Resources starting up |
| Health | Degraded | Resources have errors |
| Health | Suspended | Resources intentionally paused |
| Health | Missing | Resources do not exist |
| Health | Unknown | Cannot determine |
| Operation | Succeeded | Sync completed successfully |
| Operation | Failed | Sync encountered errors |
| Operation | Running | Sync in progress |

## The Bottom Line

This glossary covers the terminology you will encounter while working with ArgoCD. Bookmark it and come back when you encounter an unfamiliar term. As you gain experience with ArgoCD, these terms will become second nature, and you will find yourself using them to communicate precisely about your GitOps workflows.
