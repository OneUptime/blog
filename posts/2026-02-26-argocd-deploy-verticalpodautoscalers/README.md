# How to Deploy VerticalPodAutoscalers with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, VPA, Autoscaling

Description: Learn how to deploy VerticalPodAutoscalers with ArgoCD to automatically right-size pod resource requests and limits based on actual usage patterns.

---

VerticalPodAutoscalers (VPAs) automatically adjust CPU and memory requests and limits for containers based on observed usage. While HPAs scale horizontally (more pods), VPAs scale vertically (bigger pods). VPA is particularly useful for workloads where the right resource allocation is hard to guess upfront, or where it changes over time as data grows.

## What VPA Does

VPA monitors container resource usage over time and recommends (or applies) optimal resource requests. It operates in three modes:

- **Off (Recommend only)**: VPA calculates recommendations but does not apply them. You read the recommendations and update your manifests manually.
- **Initial**: VPA sets resources when pods are created but does not update running pods.
- **Auto**: VPA evicts and recreates pods with updated resource requests.

For GitOps workflows, the "Off" mode is often the best choice because it preserves the Git-as-source-of-truth principle.

## Installing VPA

VPA is not included in standard Kubernetes distributions. Install it separately:

```bash
# Clone the VPA repository
git clone https://github.com/kubernetes/autoscaler.git

# Install VPA components
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-up.sh

# Verify installation
kubectl get pods -n kube-system | grep vpa
```

Or deploy VPA through ArgoCD using Helm:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: vpa
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://charts.fairwinds.com/stable
    chart: vpa
    targetRevision: 4.4.0
    helm:
      values: |
        recommender:
          enabled: true
        updater:
          enabled: true
        admissionController:
          enabled: true
  destination:
    server: https://kubernetes.default.svc
    namespace: kube-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## VPA in Recommendation Mode (GitOps-Friendly)

The safest approach for GitOps is to use VPA in "Off" mode. VPA observes and recommends, but you apply changes through Git:

```yaml
# apps/myapp/vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: myapp-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  updatePolicy:
    updateMode: "Off"  # Recommend only, do not auto-update
  resourcePolicy:
    containerPolicies:
      - containerName: myapp
        minAllowed:
          cpu: 50m
          memory: 64Mi
        maxAllowed:
          cpu: "4"
          memory: 8Gi
        controlledResources: ["cpu", "memory"]
```

Check recommendations:

```bash
kubectl get vpa myapp-vpa -n production -o yaml
```

The output includes recommendations:

```yaml
status:
  recommendation:
    containerRecommendations:
      - containerName: myapp
        lowerBound:
          cpu: 100m
          memory: 131072k
        target:
          cpu: 250m
          memory: 262144k
        uncappedTarget:
          cpu: 250m
          memory: 262144k
        upperBound:
          cpu: 500m
          memory: 524288k
```

Then update your Deployment manifests in Git based on these recommendations:

```yaml
# Update resources based on VPA target recommendation
containers:
  - name: myapp
    resources:
      requests:
        cpu: 250m      # Based on VPA target
        memory: 256Mi   # Based on VPA target
      limits:
        cpu: 500m      # Based on VPA upperBound
        memory: 512Mi   # Based on VPA upperBound
```

## VPA in Auto Mode with ArgoCD

If you want VPA to automatically update pods, you need to tell ArgoCD to ignore resource field differences:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/gitops
    targetRevision: main
    path: apps/myapp
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - RespectIgnoreDifferences=true
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jqPathExpressions:
        - .spec.template.spec.containers[].resources
```

The VPA in Auto mode:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: myapp-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
      - containerName: myapp
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: "2"
          memory: 4Gi
```

In Auto mode, VPA evicts pods and recreates them with updated resource values. This means brief disruptions, so always pair with PDBs.

## Resource Policy Configuration

Control what VPA can and cannot change:

```yaml
spec:
  resourcePolicy:
    containerPolicies:
      # Main application container - VPA manages
      - containerName: myapp
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: "4"
          memory: 8Gi
        controlledResources: ["cpu", "memory"]
        controlledValues: RequestsAndLimits  # Or RequestsOnly

      # Sidecar container - VPA does not touch
      - containerName: envoy-proxy
        mode: "Off"  # Do not modify this container's resources

      # Log collector - only manage memory
      - containerName: fluent-bit
        controlledResources: ["memory"]
        minAllowed:
          memory: 64Mi
        maxAllowed:
          memory: 512Mi
```

## VPA for Different Workload Types

### Databases

Databases benefit from VPA because their memory needs grow with data size:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: postgres-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: postgres
  updatePolicy:
    updateMode: "Off"  # Manual updates for databases
  resourcePolicy:
    containerPolicies:
      - containerName: postgres
        minAllowed:
          cpu: 500m
          memory: 1Gi
        maxAllowed:
          cpu: "8"
          memory: 32Gi
```

### Batch Jobs

VPA can optimize CronJob resource allocation:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: batch-vpa
spec:
  targetRef:
    apiVersion: batch/v1
    kind: CronJob
    name: data-processor
  updatePolicy:
    updateMode: "Initial"  # Set resources at pod creation
  resourcePolicy:
    containerPolicies:
      - containerName: processor
        minAllowed:
          cpu: 100m
          memory: 256Mi
        maxAllowed:
          cpu: "4"
          memory: 16Gi
```

### Microservices

For microservices, use VPA to find the right resource allocation after initial deployment:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-gateway-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  updatePolicy:
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
      - containerName: api-gateway
        minAllowed:
          cpu: 50m
          memory: 64Mi
        maxAllowed:
          cpu: "2"
          memory: 4Gi
```

## VPA and HPA Together

VPA and HPA can conflict because both try to adjust resources. The recommended approach:

1. Use HPA for horizontal scaling based on CPU/custom metrics
2. Use VPA in "Off" mode only for recommendations
3. Manually apply VPA recommendations to Git

If you must use both in active mode, configure them to manage different metrics:

```yaml
# HPA: Scales replica count based on custom metrics only
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 3
  maxReplicas: 20
  metrics:
    # Only custom metrics - NOT CPU or memory
    - type: Pods
      pods:
        metric:
          name: requests_per_second
        target:
          type: AverageValue
          averageValue: "100"
---
# VPA: Manages CPU and memory only
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: myapp-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
      - containerName: myapp
        controlledResources: ["cpu", "memory"]
```

## Automating VPA Recommendations to Git

You can build an automation pipeline that reads VPA recommendations and creates pull requests to update resource values in Git:

```yaml
# CronJob that reads VPA recommendations and creates PRs
apiVersion: batch/v1
kind: CronJob
metadata:
  name: vpa-recommendation-sync
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: sync
              image: alpine/git:latest
              command: [sh, -c]
              args:
                - |
                  # Read VPA recommendations
                  RECS=$(kubectl get vpa -A -o json)

                  # Clone GitOps repo
                  git clone https://github.com/myorg/gitops /repo
                  cd /repo

                  # Update resource values based on recommendations
                  # (custom script to parse VPA output and update YAML)
                  ./scripts/update-resources.sh "$RECS"

                  # Create branch and PR if changes exist
                  if git diff --quiet; then
                    echo "No changes"
                  else
                    git checkout -b vpa-updates-$(date +%s)
                    git add . && git commit -m "Update resources based on VPA recommendations"
                    git push origin HEAD
                    # Create PR via GitHub API
                  fi
          restartPolicy: OnFailure
```

## Summary

VerticalPodAutoscalers help right-size your pods based on actual usage patterns. For GitOps workflows with ArgoCD, the "Off" recommendation mode is the safest approach - it provides data-driven recommendations that you apply through Git. If you use Auto mode, configure `ignoreDifferences` in ArgoCD to prevent sync conflicts over resource values. Combine VPA recommendations with your existing resource management strategy including LimitRanges, ResourceQuotas, and HPAs for comprehensive resource optimization.
