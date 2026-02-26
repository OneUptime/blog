# How to Implement Namespace Auto-Cleanup with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Namespace Management, Automation

Description: Learn how to automatically clean up stale Kubernetes namespaces using ArgoCD with TTL policies, CronJobs, and Kyverno cleanup policies.

---

Namespaces in Kubernetes are like hotel rooms. Guests check in, do their work, and are supposed to check out when they are done. The problem is, nobody ever checks out. Development namespaces, feature branch previews, testing environments, and one-off debugging namespaces pile up until your cluster is running hundreds of forgotten workloads consuming real compute and money.

In this guide, I will show you multiple strategies for automatically cleaning up namespaces through ArgoCD.

## Identifying the Problem

Start by understanding the scope of namespace sprawl in your cluster.

```bash
# List all namespaces with their age and resource usage
kubectl get namespaces -o json | jq -r '.items[] |
  "\(.metadata.name)\t\(.metadata.creationTimestamp)\t\(.status.phase)"' | \
  sort -k2

# Count resources per namespace
for ns in $(kubectl get ns --no-headers -o custom-columns=":metadata.name"); do
  POD_COUNT=$(kubectl get pods -n "$ns" --no-headers 2>/dev/null | wc -l)
  echo "$ns: $POD_COUNT pods"
done | sort -t: -k2 -rn
```

## Strategy 1: ArgoCD ApplicationSet with PR Generator

The cleanest approach for preview environments is using an ApplicationSet with the Pull Request generator. Namespaces are created when PRs open and deleted when PRs close.

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
          labels:
            - preview
        requeueAfterSeconds: 300
  template:
    metadata:
      name: "preview-{{number}}"
      finalizers:
        - resources-finalizer.argocd.argoproj.io
    spec:
      project: previews
      source:
        repoURL: https://github.com/myorg/myapp.git
        path: deploy/preview
        targetRevision: "{{head_sha}}"
        helm:
          values: |
            namespace: preview-pr-{{number}}
            ingress:
              host: pr-{{number}}.preview.myorg.com
      destination:
        server: https://kubernetes.default.svc
        namespace: "preview-pr-{{number}}"
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

When the PR is merged or closed, the ApplicationSet removes the Application. The `resources-finalizer` deletes all resources in the namespace. However, the namespace itself persists since ArgoCD's finalizer deletes resources within the namespace but does not delete the namespace by default.

To also delete the namespace, include it as a managed resource.

```yaml
# In your Helm chart or Kustomize base, include the namespace
apiVersion: v1
kind: Namespace
metadata:
  name: "{{ .Values.namespace }}"
  labels:
    type: preview
    managed-by: argocd
```

## Strategy 2: Kyverno Cleanup Policies

Kyverno's cleanup policies can automatically delete namespaces based on age or conditions.

```yaml
# cleanup-old-preview-namespaces.yaml
apiVersion: kyverno.io/v2beta1
kind: ClusterCleanupPolicy
metadata:
  name: cleanup-preview-namespaces
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
  schedule: "0 3 * * *"  # Daily at 3 AM
```

Deploy this policy through ArgoCD so it is managed as code.

```yaml
# cleanup-policies-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cleanup-policies
  namespace: argocd
spec:
  project: platform
  source:
    repoURL: https://github.com/myorg/cluster-config.git
    path: cleanup-policies
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      selfHeal: true
```

## Strategy 3: CronJob-Based Cleanup

For more complex cleanup logic, use a CronJob deployed through ArgoCD.

```yaml
# namespace-cleanup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: namespace-cleanup
  namespace: kube-system
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: namespace-cleaner
          containers:
            - name: cleaner
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  echo "Starting namespace cleanup at $(date)"

                  # Configuration
                  MAX_AGE_HOURS=168  # 7 days
                  PROTECTED_NS="kube-system kube-public kube-node-lease default argocd monitoring production staging"

                  # Get all namespaces with cleanup labels
                  kubectl get namespaces -l auto-cleanup=true -o json | \
                    jq -r --argjson max_age "$MAX_AGE_HOURS" \
                    '.items[] |
                    select(
                      (now - (.metadata.creationTimestamp | fromdateiso8601)) / 3600 > $max_age
                    ) | .metadata.name' | while read NS; do
                      # Double-check it's not protected
                      if echo "$PROTECTED_NS" | grep -qw "$NS"; then
                        echo "SKIP: $NS is protected"
                        continue
                      fi

                      # Check if namespace has any running pods
                      POD_COUNT=$(kubectl get pods -n "$NS" --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)

                      # Check for ArgoCD applications targeting this namespace
                      ARGOCD_APPS=$(kubectl get applications -n argocd -o json | \
                        jq -r --arg ns "$NS" '.items[] | select(.spec.destination.namespace == $ns) | .metadata.name')

                      if [ -n "$ARGOCD_APPS" ]; then
                        echo "SKIP: $NS has active ArgoCD applications: $ARGOCD_APPS"
                        continue
                      fi

                      echo "DELETING: Namespace $NS (age > ${MAX_AGE_HOURS}h, $POD_COUNT running pods)"
                      kubectl delete namespace "$NS" --wait=false
                    done

                  echo "Cleanup complete at $(date)"
          restartPolicy: OnFailure
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: namespace-cleaner
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-cleaner
rules:
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["list", "delete"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["list"]
  - apiGroups: ["argoproj.io"]
    resources: ["applications"]
    verbs: ["list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: namespace-cleaner
subjects:
  - kind: ServiceAccount
    name: namespace-cleaner
    namespace: kube-system
roleRef:
  kind: ClusterRole
  name: namespace-cleaner
  apiGroup: rbac.authorization.k8s.io
```

## Strategy 4: Label-Based TTL

Add a TTL label when creating namespaces, and let the cleanup job respect it.

```yaml
# Namespace with expiry
apiVersion: v1
kind: Namespace
metadata:
  name: testing-experiment-42
  labels:
    auto-cleanup: "true"
    ttl-hours: "48"
    created-by: "john.doe"
    purpose: "load-testing"
```

Modify the cleanup CronJob to read the TTL label.

```bash
# In the cleanup script
kubectl get namespaces -l auto-cleanup=true -o json | \
  jq -r '.items[] |
  {
    name: .metadata.name,
    created: .metadata.creationTimestamp,
    ttl_hours: (.metadata.labels["ttl-hours"] // "168" | tonumber),
    age_hours: ((now - (.metadata.creationTimestamp | fromdateiso8601)) / 3600)
  } | select(.age_hours > .ttl_hours) | .name'
```

## Strategy 5: Git-Driven Namespace Lifecycle

Manage all namespaces in Git. When a namespace definition is removed from Git, ArgoCD's pruning deletes it from the cluster.

```yaml
# namespaces-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cluster-namespaces
  namespace: argocd
spec:
  project: platform
  source:
    repoURL: https://github.com/myorg/cluster-config.git
    path: namespaces
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: true  # This is key - removes namespaces deleted from Git
      selfHeal: true
```

To remove a namespace, simply delete its YAML file from the Git repository. ArgoCD handles the rest.

## Notification on Cleanup

Alert teams before their namespaces are cleaned up.

```yaml
# Pre-cleanup notification (add to CronJob)
# Run 24 hours before actual cleanup
WARN_AGE_HOURS=$((MAX_AGE_HOURS - 24))

kubectl get namespaces -l auto-cleanup=true -o json | \
  jq -r --argjson warn_age "$WARN_AGE_HOURS" \
  '.items[] | select(
    (now - (.metadata.creationTimestamp | fromdateiso8601)) / 3600 > $warn_age
  ) | "\(.metadata.name) \(.metadata.labels["created-by"] // "unknown")"' | \
  while read NS OWNER; do
    # Send Slack notification
    curl -X POST "$SLACK_WEBHOOK" \
      -H "Content-Type: application/json" \
      -d "{\"text\": \"Warning: Namespace $NS (owned by $OWNER) will be cleaned up in 24 hours. Extend TTL or move to a permanent project.\"}"
  done
```

## Conclusion

Namespace auto-cleanup is essential for keeping Kubernetes clusters manageable and cost-effective. The best approach depends on your workflow: ApplicationSets with PR generators handle preview environments naturally, Kyverno cleanup policies provide declarative TTL management, and CronJobs offer maximum flexibility for complex cleanup logic. Whatever approach you choose, manage the cleanup mechanism itself through ArgoCD so it is version-controlled and consistent. And always include a notification step so teams are not surprised when their namespaces disappear.
