# How to Use VPA in Initial Mode to Set Requests Only at Pod Creation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, VPA, Resource Management

Description: Configure Vertical Pod Autoscaler in Initial mode to apply resource recommendations only when pods are first created, avoiding disruptive updates while optimizing initial resource allocations.

---

Vertical Pod Autoscaler's Auto mode continuously updates pod resources by evicting and recreating pods with new resource requests. This can be disruptive for stateful workloads or services that cannot tolerate frequent restarts. Initial mode provides a middle ground by applying VPA recommendations only when pods are first created, either during deployment or after manual deletion.

This mode is perfect for workloads that need optimized initial resources but should not be automatically restarted for resource adjustments. It combines the benefits of VPA's resource analysis with the stability of fixed resource allocations once pods are running.

## Understanding Initial Mode

In Initial mode, VPA watches your workload and calculates recommended resources just like in Auto mode. However, instead of evicting running pods to apply new recommendations, VPA only injects the recommended values into pods when they are first created. Existing pods keep their current resource requests until they are recreated for other reasons.

This means you get the benefit of VPA's analysis for sizing new pods correctly, while avoiding the disruption of forcing pod restarts to update resource requests on running pods.

## Basic Initial Mode Configuration

Configure VPA to use Initial update mode.

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: database-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: database

  updatePolicy:
    updateMode: "Initial"  # Only update at pod creation

  resourcePolicy:
    containerPolicies:
    - containerName: postgres
      minAllowed:
        cpu: 500m
        memory: 1Gi
      maxAllowed:
        cpu: 8000m
        memory: 32Gi
      controlledResources: ["cpu", "memory"]
```

New database pods will use VPA's recommended resources, but existing pods remain unchanged until manually restarted or recreated.

## Using Initial Mode for StatefulSets

StatefulSets benefit particularly from Initial mode since pod identity and data locality make restarts expensive.

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: kafka-vpa
  namespace: streaming
spec:
  targetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: kafka

  updatePolicy:
    updateMode: "Initial"

  resourcePolicy:
    containerPolicies:
    - containerName: kafka
      minAllowed:
        cpu: 2000m
        memory: 4Gi
      maxAllowed:
        cpu: 16000m
        memory: 64Gi
```

When scaling the StatefulSet up or performing rolling updates, new pods get VPA's latest recommendations automatically.

## Initial Mode with Deployments

Use Initial mode for Deployments that should not be disrupted but benefit from optimized resource sizing.

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-server-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server

  updatePolicy:
    updateMode: "Initial"

  resourcePolicy:
    containerPolicies:
    - containerName: api
      minAllowed:
        cpu: 500m
        memory: 512Mi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi
```

During rolling updates or manual replica scaling, new pods receive optimized resource requests based on VPA's analysis.

## Combining Initial Mode with Manual Updates

Check VPA recommendations and manually trigger updates when appropriate.

```bash
# Check current VPA recommendations
kubectl describe vpa api-server-vpa -n production

# View recommended resources
kubectl get vpa api-server-vpa -n production -o json | \
  jq '.status.recommendation.containerRecommendations[]'

# If recommendations look good, trigger rolling update
kubectl rollout restart deployment api-server -n production

# Monitor the rollout
kubectl rollout status deployment api-server -n production
```

This gives you control over when resource changes are applied while still benefiting from VPA's analysis.

## Setting Up for Scheduled Updates

Combine Initial mode with scheduled rolling updates.

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: worker-vpa
  namespace: workers
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker

  updatePolicy:
    updateMode: "Initial"

  resourcePolicy:
    containerPolicies:
    - containerName: worker
      minAllowed:
        cpu: 250m
        memory: 256Mi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi
---
# CronJob to apply updates during maintenance window
apiVersion: batch/v1
kind: CronJob
metadata:
  name: vpa-update-worker
  namespace: workers
spec:
  schedule: "0 2 * * 0"  # Sunday at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: vpa-updater
          restartPolicy: Never
          containers:
          - name: updater
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - kubectl rollout restart deployment worker -n workers
```

This applies VPA recommendations weekly during a maintenance window.

## Monitoring Resource Drift

Track when running pods diverge from VPA recommendations.

```bash
# Get VPA recommendations
VPA_CPU=$(kubectl get vpa api-server-vpa -n production -o json | \
  jq -r '.status.recommendation.containerRecommendations[0].target.cpu')

VPA_MEM=$(kubectl get vpa api-server-vpa -n production -o json | \
  jq -r '.status.recommendation.containerRecommendations[0].target.memory')

echo "VPA recommends: CPU=$VPA_CPU, Memory=$VPA_MEM"

# Get current pod resources
kubectl get pods -n production -l app=api-server -o json | \
  jq '.items[] | {
    pod: .metadata.name,
    cpu: .spec.containers[0].resources.requests.cpu,
    memory: .spec.containers[0].resources.requests.memory
  }'

# Compare to identify drift
```

Significant drift indicates it may be time to manually apply VPA recommendations.

## Gradual Rollout of VPA Recommendations

Apply recommendations gradually to limit risk.

```bash
#!/bin/bash
# gradual-vpa-update.sh

NAMESPACE="production"
DEPLOYMENT="api-server"
TOTAL_REPLICAS=$(kubectl get deployment $DEPLOYMENT -n $NAMESPACE -o json | \
  jq '.spec.replicas')

# Update one pod at a time
for i in $(seq 1 $TOTAL_REPLICAS); do
  echo "Updating pod $i of $TOTAL_REPLICAS"

  # Delete one pod to trigger recreation with new resources
  POD=$(kubectl get pods -n $NAMESPACE -l app=api-server -o name | head -1)
  kubectl delete $POD -n $NAMESPACE

  # Wait for pod to be ready
  kubectl wait --for=condition=Ready pods -l app=api-server -n $NAMESPACE --timeout=120s

  # Wait before next update
  sleep 30
done

echo "All pods updated with VPA recommendations"
```

This script gradually applies VPA recommendations pod by pod.

## Using Initial Mode During Development

Configure different VPA modes for different environments.

```yaml
# Production: Initial mode for stability
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  updatePolicy:
    updateMode: "Initial"
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: 500m
        memory: 512Mi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi
---
# Staging: Auto mode for testing
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa
  namespace: staging
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  updatePolicy:
    updateMode: "Auto"  # Aggressive updates for testing
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2000m
        memory: 4Gi
```

Use Auto mode in lower environments to validate recommendations before applying them manually in production.

## Transitioning from Off to Initial Mode

Start with Off mode to observe recommendations, then switch to Initial.

```yaml
# Phase 1: Observation
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  updatePolicy:
    updateMode: "Off"  # Only generate recommendations
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: 250m
        memory: 256Mi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi
```

After validating recommendations for a few weeks, switch to Initial mode.

```yaml
# Phase 2: Controlled updates
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  updatePolicy:
    updateMode: "Initial"  # Apply on pod creation
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: 250m
        memory: 256Mi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi
```

## Handling Pod Churn

Even in Initial mode, track pod recreation patterns.

```bash
# Monitor pod age
kubectl get pods -n production -l app=api-server \
  -o custom-columns=NAME:.metadata.name,AGE:.metadata.creationTimestamp

# Check pod restart reasons
kubectl get events -n production --field-selector involvedObject.kind=Pod \
  --sort-by='.lastTimestamp' | \
  grep -E 'Created|Started'

# Track resource changes over time
kubectl get vpa api-server-vpa -n production -w
```

Understanding pod churn patterns helps you decide when to manually trigger updates.

## Best Practices

Use Initial mode for production workloads that cannot tolerate automatic restarts. This includes databases, stateful services, and applications with long startup times.

Establish a regular cadence for reviewing VPA recommendations and manually applying them. Weekly or monthly reviews work well for most workloads.

Set up alerts for when VPA recommendations diverge significantly from current pod resources. This indicates it may be time to manually apply updates.

Test VPA recommendations in staging or development environments using Auto mode before applying them in production with Initial mode.

Document why specific workloads use Initial mode instead of Auto mode. This helps team members understand the reasoning and maintain consistency.

## When to Use Initial vs Auto Mode

Use Initial mode for stateful workloads, services with persistent connections, applications with expensive startup costs, or production services requiring high availability.

Use Auto mode for stateless services, development or staging environments, batch processing workloads, or services specifically designed for frequent restarts.

Use Off mode during initial VPA deployment to observe recommendations before enabling any automatic updates.

## Conclusion

VPA's Initial mode provides optimized resource allocation for new pods while avoiding the disruption of automatic updates to running pods. This makes it ideal for production workloads that need efficient resource usage but cannot tolerate the pod churn from Auto mode.

By combining Initial mode with periodic manual updates or scheduled maintenance windows, you get the benefits of VPA's resource analysis while maintaining control over when changes are applied. This balanced approach helps you optimize resources without compromising stability or availability.
