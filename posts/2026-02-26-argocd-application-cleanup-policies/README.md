# How to Implement Application Cleanup Policies with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Resource Cleanup, Cost Optimization

Description: Learn how to implement automated cleanup policies for ArgoCD applications to remove stale deployments, preview environments, and orphaned resources.

---

Kubernetes clusters accumulate cruft over time. Preview environments that were never cleaned up, feature branches that were merged months ago but still have running deployments, test namespaces consuming resources nobody uses. Without cleanup policies, your cluster costs grow steadily while useful capacity shrinks.

ArgoCD provides several mechanisms for implementing automated cleanup. In this guide, I will show you how to use them to keep your clusters lean.

## The Cost of Stale Resources

Every running pod, persistent volume, and load balancer has a cost. In cloud environments, a forgotten preview environment with a small Deployment, a Service with a load balancer, and a 10GB PVC can cost $50-100 per month. Multiply that by 50 stale environments and you are looking at $2,500-5,000 per month in waste.

## Strategy 1: ArgoCD Application Finalizers

ArgoCD applications can have finalizers that control what happens when the Application resource is deleted.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: preview-feature-123
  namespace: argocd
  finalizers:
    # This finalizer ensures that when the Application is deleted,
    # all managed resources in the cluster are also deleted
    - resources-finalizer.argocd.argoproj.io
spec:
  project: previews
  source:
    repoURL: https://github.com/myorg/app.git
    path: deploy/preview
    targetRevision: feature-123
  destination:
    server: https://kubernetes.default.svc
    namespace: preview-feature-123
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

With the `resources-finalizer.argocd.argoproj.io` finalizer, deleting the ArgoCD Application also deletes all Kubernetes resources it manages. Without this finalizer, deleting the Application only removes it from ArgoCD while leaving the resources running in the cluster.

## Strategy 2: TTL-Based Cleanup with ApplicationSets

Use ApplicationSets with Git generator to automatically create and remove applications based on branch lifecycle.

```yaml
# preview-appset.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: preview-environments
  namespace: argocd
spec:
  generators:
    - pullRequest:
        github:
          owner: myorg
          repo: myapp
          tokenRef:
            secretName: github-token
            key: token
        requeueAfterSeconds: 300
  template:
    metadata:
      name: "preview-{{branch_slug}}"
      finalizers:
        - resources-finalizer.argocd.argoproj.io
    spec:
      project: previews
      source:
        repoURL: https://github.com/myorg/myapp.git
        path: deploy/preview
        targetRevision: "{{head_sha}}"
      destination:
        server: https://kubernetes.default.svc
        namespace: "preview-{{branch_slug}}"
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

When a pull request is opened, the ApplicationSet creates an ArgoCD Application and deploys the preview environment. When the PR is merged or closed, the ApplicationSet removes the Application, and the finalizer cleans up all resources.

## Strategy 3: CronJob-Based Cleanup

For environments that should exist for a limited time regardless of branch status, use a CronJob to clean up stale applications.

```yaml
# cleanup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-app-cleanup
  namespace: argocd
spec:
  schedule: "0 2 * * *"  # Run daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-cleanup
          containers:
            - name: cleanup
              image: argoproj/argocd:v2.10.0
              command:
                - /bin/sh
                - -c
                - |
                  # Login to ArgoCD
                  argocd login argocd-server.argocd.svc.cluster.local \
                    --grpc-web --insecure \
                    --username admin \
                    --password "$ARGOCD_ADMIN_PASSWORD"

                  # Find applications older than 7 days in the previews project
                  MAX_AGE_DAYS=7
                  CUTOFF=$(date -d "$MAX_AGE_DAYS days ago" +%s 2>/dev/null || \
                           date -v-${MAX_AGE_DAYS}d +%s)

                  argocd app list -p previews -o json | \
                    jq -r --argjson cutoff "$CUTOFF" \
                    '.[] | select(.metadata.creationTimestamp | fromdateiso8601 < $cutoff) | .metadata.name' | \
                    while read APP; do
                      echo "Deleting stale application: $APP"
                      argocd app delete "$APP" --cascade --yes
                    done

                  echo "Cleanup complete"
              env:
                - name: ARGOCD_ADMIN_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: argocd-initial-admin-secret
                      key: password
          restartPolicy: OnFailure
```

## Strategy 4: Label-Based Expiration

Add expiration labels to applications and use a cleanup job that respects them.

```yaml
# Create applications with expiry labels
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: temp-testing-env
  namespace: argocd
  labels:
    cleanup-policy: "auto"
    expires-at: "2026-03-01"
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  # ...
```

```yaml
# Label-aware cleanup CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: label-based-cleanup
  namespace: argocd
spec:
  schedule: "0 * * * *"  # Every hour
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-cleanup
          containers:
            - name: cleanup
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  TODAY=$(date +%Y-%m-%d)

                  # Find applications with expired dates
                  kubectl get applications -n argocd \
                    -l cleanup-policy=auto \
                    -o json | \
                    jq -r --arg today "$TODAY" \
                    '.items[] | select(.metadata.labels["expires-at"] <= $today) | .metadata.name' | \
                    while read APP; do
                      echo "Deleting expired application: $APP (expired)"
                      kubectl delete application "$APP" -n argocd
                    done
          restartPolicy: OnFailure
```

## Strategy 5: Namespace Cleanup with Kyverno

Use Kyverno cleanup policies to automatically delete namespaces that have been idle for too long.

```yaml
# kyverno-namespace-cleanup.yaml
apiVersion: kyverno.io/v2beta1
kind: ClusterCleanupPolicy
metadata:
  name: cleanup-stale-preview-namespaces
spec:
  match:
    any:
      - resources:
          kinds:
            - Namespace
          selector:
            matchLabels:
              type: preview
  conditions:
    any:
      - key: "{{ time_since('', '{{target.metadata.creationTimestamp}}', '') }}"
        operator: GreaterThan
        value: "168h"  # 7 days
  schedule: "0 3 * * *"  # Run daily at 3 AM
```

## Strategy 6: Prune Orphaned Resources

Enable automatic pruning in ArgoCD to remove resources that are no longer defined in Git.

```yaml
spec:
  syncPolicy:
    automated:
      prune: true  # Delete resources not in Git
      selfHeal: true
    syncOptions:
      - PrunePropagationPolicy=foreground  # Wait for dependent resources
      - PruneLast=true  # Prune after all other resources are synced
```

The `PruneLast=true` option ensures that resources are only deleted after all other sync operations complete. This prevents issues where deleting a ConfigMap before creating the replacement causes downtime.

## RBAC for Cleanup Operations

Create a dedicated service account for cleanup operations with minimal permissions.

```yaml
# cleanup-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: argocd-cleanup
  namespace: argocd
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: argocd-cleanup-role
  namespace: argocd
rules:
  - apiGroups: ["argoproj.io"]
    resources: ["applications"]
    verbs: ["list", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: argocd-cleanup-binding
  namespace: argocd
subjects:
  - kind: ServiceAccount
    name: argocd-cleanup
    namespace: argocd
roleRef:
  kind: Role
  name: argocd-cleanup-role
  apiGroup: rbac.authorization.k8s.io
```

## Monitoring Cleanup Effectiveness

Track the number of stale applications and the resources they consume.

```bash
# Count preview applications by age
kubectl get applications -n argocd -l cleanup-policy=auto -o json | \
  jq '[.items[] | {
    name: .metadata.name,
    age_hours: ((now - (.metadata.creationTimestamp | fromdateiso8601)) / 3600 | floor),
    namespace: .spec.destination.namespace
  }] | sort_by(.age_hours) | reverse'
```

## Conclusion

Application cleanup in ArgoCD is essential for cost control and cluster hygiene. The most effective approach combines ApplicationSet PR generators for automatic preview lifecycle management, finalizers for cascade deletion, CronJobs for TTL-based cleanup, and pruning policies for orphaned resources. Start by adding finalizers to all temporary applications, then implement automated cleanup for preview environments, and finally add monitoring to track cleanup effectiveness. Your cluster costs will thank you.
