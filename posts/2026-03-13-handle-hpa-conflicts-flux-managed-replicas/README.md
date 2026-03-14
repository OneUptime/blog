# How to Handle HPA Conflicts with Flux Managed Replicas

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Day 2 Operations, HPA, Autoscaling, Troubleshooting

Description: Resolve conflicts between HorizontalPodAutoscaler and Flux-managed replica counts so HPA can scale freely without Flux continuously reverting to the Git-declared replica count.

---

## Introduction

The most common day-two conflict in Flux-managed clusters is the replica count fight between HPA and Flux. The scenario is straightforward: you declare `replicas: 2` in a Deployment manifest managed by Flux, you create an HPA to scale that deployment between 2 and 20 replicas based on CPU usage, traffic spikes to 15 replicas — and then Flux reconciles and resets replicas back to 2.

This conflict exists because Flux uses server-side apply to manage the `spec.replicas` field. When Flux owns that field and HPA writes a different value, the next Flux reconciliation overwrites HPA's work. The solution is to relinquish Flux's ownership of `spec.replicas` so HPA can manage it freely.

This guide covers every method for resolving this conflict: removing `spec.replicas` from the manifest, using Kustomize to drop the field, and configuring Flux's field management correctly.

## Prerequisites

- Flux CD v2 managing Deployments in your cluster
- A HorizontalPodAutoscaler targeting a Flux-managed Deployment
- kubectl and Flux CLI installed
- Understanding of Kubernetes server-side apply concepts

## Step 1: Diagnose the Conflict

Confirm the conflict is happening:

```bash
# Check if HPA is scaling correctly
kubectl get hpa my-service -n team-alpha
# NAME         REFERENCE                   TARGETS   MINPODS   MAXPODS   REPLICAS
# my-service   Deployment/my-service       80%/70%   2         20        15

# Check Flux reconciliation
flux get kustomization my-service -n team-alpha
# MESSAGE: Applied revision: main/abc1234

# Check actual replicas immediately after reconciliation
kubectl get deployment my-service -n team-alpha -o jsonpath='{.spec.replicas}'
# 2  ← Flux reset it from 15 to 2

# Confirm Flux owns the replicas field
kubectl get deployment my-service -n team-alpha \
  -o jsonpath='{.metadata.managedFields}' | \
  jq '.[] | select(.manager == "gotk-sync-manager") | .fieldsV1."f:spec"'
# Shows f:replicas — Flux owns this field
```

## Step 2: Remove spec.replicas from the Deployment Manifest

The cleanest fix is to remove `spec.replicas` from your Git manifest entirely.

```yaml
# Before (causes conflict)
# deploy/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  replicas: 2          # <-- Remove this line
  selector:
    matchLabels:
      app: my-service
  template:
    # ...
```

```yaml
# After (no conflict)
# deploy/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  # replicas is intentionally omitted — HPA manages this field
  selector:
    matchLabels:
      app: my-service
  template:
    # ...
```

```bash
# Commit and push the change
git add deploy/deployment.yaml
git commit -m "fix: remove spec.replicas to allow HPA management"
git push

# Force Flux to reconcile
flux reconcile kustomization my-service -n team-alpha --with-source

# After reconciliation, Flux no longer owns spec.replicas
kubectl get deployment my-service -n team-alpha \
  -o jsonpath='{.metadata.managedFields}' | \
  jq '.[] | select(.manager == "gotk-sync-manager") | .fieldsV1."f:spec"'
# f:replicas is now absent from Flux's fields
```

## Step 3: Use Kustomize to Drop the Replicas Field

If you cannot modify the base manifest (e.g., it comes from an upstream source), use a Kustomize patch to remove the `replicas` field.

```yaml
# deploy/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - hpa.yaml
patches:
  # Remove spec.replicas from the Deployment to allow HPA to manage it
  - patch: |-
      - op: remove
        path: /spec/replicas
    target:
      kind: Deployment
      name: my-service
```

```bash
# Verify the patch removes the field before committing
kustomize build deploy/ | grep replicas
# Should return nothing — spec.replicas is stripped
```

## Step 4: Configure the HPA Correctly

Ensure the HPA is configured correctly now that Flux no longer fights it.

```yaml
# deploy/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-service
  namespace: team-alpha
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-service
  minReplicas: 2
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
      stabilizationWindowSeconds: 300   # Wait 5 minutes before scaling down
      policies:
        - type: Percent
          value: 25
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0    # Scale up immediately
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
```

## Step 5: Verify the Fix

```bash
# Simulate load to trigger HPA scaling
kubectl run load-generator --image=busybox --restart=Never \
  -n team-alpha -- \
  /bin/sh -c "while true; do wget -q -O- http://my-service:80/; done"

# Watch HPA scale up
kubectl get hpa my-service -n team-alpha -w

# Force Flux reconciliation while HPA has scaled to >2 replicas
flux reconcile kustomization my-service -n team-alpha

# Verify replicas did NOT get reset to 2 by Flux
kubectl get deployment my-service -n team-alpha -o jsonpath='{.spec.replicas}'
# Should show the HPA-managed count, not 2

# Clean up load generator
kubectl delete pod load-generator -n team-alpha
```

## Step 6: Monitor for Residual Conflicts

Set up an alert to catch if the conflict reappears.

```yaml
# monitoring/alerts/hpa-flux-conflict.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: hpa-flux-conflict
  namespace: monitoring
spec:
  groups:
    - name: hpa.conflict
      rules:
        - alert: HPAReplicasResetByFlux
          expr: |
            kube_horizontalpodautoscaler_status_current_replicas
            !=
            kube_deployment_spec_replicas
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "HPA replica count differs from Deployment spec — possible Flux conflict"
```

## Best Practices

- Always remove `spec.replicas` from Deployment manifests when HPA is in use — this is the canonical Kubernetes recommendation as well
- Define `minReplicas` in HPA to at least 2 to maintain high availability even during scale-down
- Use the HPA `behavior` block to configure scale-down stabilization windows and prevent flapping
- For Helm-based deployments, check if the chart sets `replicaCount` and override it to `null` in your values
- Consider KEDA for event-driven scaling based on queue depth, custom metrics, or external triggers
- Document in the deployment README that HPA is managing replicas to prevent future developers from adding `spec.replicas` back

## Conclusion

The HPA-Flux replica conflict is one of the most frequently encountered issues in Flux-managed clusters, and the fix is straightforward: remove `spec.replicas` from the Deployment manifest and let HPA own that field. Once Flux no longer declares the replica count, reconciliation and autoscaling coexist peacefully. The HPA scales the deployment up and down based on real-time metrics, and Flux manages every other aspect of the Deployment configuration through GitOps.
