# How to Implement OpenShift GitOps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenShift, GitOps, ArgoCD, Kubernetes, DevOps

Description: Learn how to implement GitOps on OpenShift using OpenShift GitOps (Argo CD), including installation, app definitions, and safe sync strategies.

---

OpenShift GitOps is Red Hat's supported distribution of Argo CD. It gives you declarative deployments driven by Git, with auditability and easy rollbacks. This guide walks through a basic production-ready setup.

## What You Get with OpenShift GitOps

- A managed Argo CD instance
- Git as the source of truth
- Automated reconciliation and drift correction
- Fine-grained RBAC and multi-tenancy options

## Step 1: Install OpenShift GitOps

In the OpenShift console:

1. Go to **Operators → OperatorHub**
2. Install **OpenShift GitOps**
3. Accept the default namespace `openshift-gitops`

This installs a pre-configured Argo CD instance.

## Step 2: Access the Argo CD UI

Find the route:

```bash
oc get route -n openshift-gitops
```

Use the admin password from the secret:

```bash
oc get secret openshift-gitops-cluster -n openshift-gitops -o jsonpath='{.data.admin\.password}' | base64 -d
```

## Step 3: Create an Application

Define an Argo CD Application that points to your Git repo:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api
  namespace: openshift-gitops
spec:
  project: default
  source:
    repoURL: https://github.com/example/platform-configs.git
    targetRevision: main
    path: apps/api
  destination:
    server: https://kubernetes.default.svc
    namespace: api
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Step 4: Organize Your Git Repo

A simple GitOps layout:

```
platform-configs/
  apps/
    api/
      kustomization.yaml
      deployment.yaml
      service.yaml
```

Use Kustomize or Helm for configuration per environment.

## Step 5: Use Sync Options Safely

Recommended sync settings:

- `automated.prune: true` for cleanup
- `automated.selfHeal: true` for drift correction
- `syncOptions: [CreateNamespace=true]` if you want Argo CD to create namespaces

## Step 6: Add RBAC and Projects

Use AppProjects to isolate teams and namespaces. This helps control access to clusters, namespaces, and repos.

## Monitoring and Auditing

- Use the Argo CD UI for sync status and diff views
- Audit Git changes instead of ad hoc kubectl edits
- Alert on sync failures

## Conclusion

OpenShift GitOps gives you a supported, production-grade GitOps workflow. Install the operator, declare applications, and let the controller keep your cluster aligned with Git. That reduces drift, simplifies rollbacks, and improves deployment visibility.
