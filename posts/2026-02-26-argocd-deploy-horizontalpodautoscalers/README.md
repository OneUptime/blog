# How to Deploy HorizontalPodAutoscalers with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, HPA, Autoscaling

Description: Learn how to deploy and manage HorizontalPodAutoscalers with ArgoCD for automatic scaling based on CPU, memory, and custom metrics while avoiding GitOps conflicts.

---

HorizontalPodAutoscalers (HPAs) automatically scale the number of pod replicas based on observed metrics like CPU utilization, memory usage, or custom application metrics. Managing HPAs through ArgoCD introduces a unique challenge: the HPA changes the replica count dynamically, but ArgoCD wants the replica count in Git to be the source of truth. Resolving this conflict is the key to making HPAs work in a GitOps workflow.

## The HPA vs GitOps Conflict

Here is the problem. Your Git manifest says `replicas: 3`. The HPA scales the Deployment to 7 replicas based on load. ArgoCD detects a diff between Git (3 replicas) and the cluster (7 replicas) and shows the application as "OutOfSync."

If automated sync is enabled, ArgoCD scales the Deployment back down to 3, and then the HPA scales it back up. You get a constant tug-of-war.

The solution: tell ArgoCD to ignore the replica count field when an HPA is managing it.

## Configuring ArgoCD to Ignore Replica Count

Add `ignoreDifferences` to your ArgoCD Application:

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
        - .spec.replicas
```

The `RespectIgnoreDifferences=true` sync option is critical. Without it, ArgoCD ignores the differences in the UI but still resets them during sync.

## Basic HPA with ArgoCD

Here is a complete setup with a Deployment and HPA:

```yaml
# apps/myapp/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3  # Initial/minimum replica count
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myapp:1.0.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
---
# apps/myapp/hpa.yaml
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
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 25
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
        - type: Pods
          value: 4
          periodSeconds: 60
      selectPolicy: Max
```

## Resource Requests Are Required

HPAs based on CPU and memory utilization require resource requests on all containers. Without requests, the HPA cannot calculate utilization percentages:

```yaml
# This will NOT work with CPU-based HPA
containers:
  - name: myapp
    image: myapp:1.0.0
    # No resources specified - HPA cannot calculate utilization

# This works
containers:
  - name: myapp
    image: myapp:1.0.0
    resources:
      requests:
        cpu: 200m
        memory: 256Mi
```

Use LimitRanges to ensure all containers have default resource requests. See our [LimitRanges guide](https://oneuptime.com/blog/post/2026-02-26-argocd-deploy-limitranges/view) for details.

## Custom Metrics HPA

For more sophisticated scaling, use custom application metrics. This requires a metrics adapter like Prometheus Adapter:

```yaml
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
  maxReplicas: 30
  metrics:
    # Scale based on requests per second
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "100"

    # Scale based on queue depth
    - type: Object
      object:
        describedObject:
          apiVersion: v1
          kind: Service
          name: rabbitmq
        metric:
          name: queue_messages_ready
        target:
          type: Value
          value: "1000"

    # Keep CPU as a fallback
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

Deploy the Prometheus Adapter configuration through ArgoCD as well:

```yaml
# platform/prometheus-adapter/config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: adapter-config
  namespace: monitoring
data:
  config.yaml: |
    rules:
      - seriesQuery: 'http_requests_total{namespace!="",pod!=""}'
        resources:
          overrides:
            namespace: {resource: "namespace"}
            pod: {resource: "pod"}
        name:
          matches: "^(.*)_total$"
          as: "${1}_per_second"
        metricsQuery: 'sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (<<.GroupBy>>)'
```

## Scaling Behavior Configuration

The `behavior` section controls how fast the HPA scales up and down. This is crucial for production stability:

```yaml
behavior:
  # Conservative scale-down to prevent flapping
  scaleDown:
    stabilizationWindowSeconds: 300  # Wait 5 minutes before scaling down
    policies:
      - type: Percent
        value: 10          # Remove at most 10% of pods per minute
        periodSeconds: 60
      - type: Pods
        value: 2           # Or at most 2 pods per minute
        periodSeconds: 60
    selectPolicy: Min       # Use the policy that removes fewer pods

  # Aggressive scale-up to handle traffic spikes
  scaleUp:
    stabilizationWindowSeconds: 0   # Scale up immediately
    policies:
      - type: Percent
        value: 100         # Double pods per minute
        periodSeconds: 60
      - type: Pods
        value: 10          # Or add 10 pods per minute
        periodSeconds: 60
    selectPolicy: Max       # Use the policy that adds more pods
```

## Sync Waves for HPA

Create the HPA after the Deployment it targets, and after the metrics infrastructure:

```yaml
# Wave -1: Metrics server / Prometheus Adapter
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prometheus-adapter
  annotations:
    argocd.argoproj.io/sync-wave: "-1"

---
# Wave 0: Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "0"

---
# Wave 1: HPA (after Deployment exists)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
  annotations:
    argocd.argoproj.io/sync-wave: "1"
```

## Global Ignore Configuration

Instead of adding `ignoreDifferences` to every Application that uses an HPA, configure it globally in ArgoCD:

```yaml
# In argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.compareoptions: |
    ignoreResourceStatusField: all
  resource.customizations.ignoreDifferences.apps_Deployment: |
    jqPathExpressions:
      - .spec.replicas
  resource.customizations.ignoreDifferences.apps_StatefulSet: |
    jqPathExpressions:
      - .spec.replicas
  resource.customizations.ignoreDifferences.apps_ReplicaSet: |
    jqPathExpressions:
      - .spec.replicas
```

This makes ArgoCD ignore replica count differences for all Deployments, StatefulSets, and ReplicaSets across all Applications.

## HPA Health Checks

ArgoCD considers an HPA healthy when:

- It has a target reference that exists
- Current replicas are within min and max bounds
- At least one metric is reportable

Customize the health check:

```yaml
# In argocd-cm ConfigMap
data:
  resource.customizations.health.autoscaling_HorizontalPodAutoscaler: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.currentReplicas ~= nil and
         obj.status.desiredReplicas ~= nil then
        if obj.status.currentReplicas == obj.status.desiredReplicas then
          hs.status = "Healthy"
          hs.message = "Scaled to " .. obj.status.currentReplicas .. " replicas"
        else
          hs.status = "Progressing"
          hs.message = "Scaling from " .. obj.status.currentReplicas ..
            " to " .. obj.status.desiredReplicas
        end
      else
        hs.status = "Progressing"
        hs.message = "Waiting for metrics"
      end
    else
      hs.status = "Progressing"
      hs.message = "Initializing"
    end
    return hs
```

## Environment-Specific HPA with Kustomize

```yaml
# base/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70

# overlays/production/hpa-patch.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
spec:
  minReplicas: 5
  maxReplicas: 50
```

## Combining HPA with PDB

Always pair HPAs with PodDisruptionBudgets:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp-pdb
spec:
  maxUnavailable: "25%"  # Use percentage to work with variable replica count
  selector:
    matchLabels:
      app: myapp
```

Using a percentage for `maxUnavailable` works well because the HPA changes the replica count. With 10 replicas, 25% allows 2 disruptions. With 20 replicas, it allows 5.

## Troubleshooting HPA Issues

```bash
# Check HPA status
kubectl get hpa -n production

# Check for metric availability issues
kubectl describe hpa myapp-hpa -n production

# Check if metrics server is working
kubectl top pods -n production

# Check custom metrics
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1" | jq .
```

## Summary

HorizontalPodAutoscalers work well with ArgoCD once you configure `ignoreDifferences` for the replica count field. This tells ArgoCD to let the HPA manage replica counts while ArgoCD manages everything else. Use the `RespectIgnoreDifferences` sync option to prevent syncs from overriding HPA decisions. Configure scaling behavior carefully - aggressive scale-up and conservative scale-down prevents both underprovisioning and flapping. Always pair HPAs with resource requests, PDBs, and topology spread constraints for a complete autoscaling setup.
