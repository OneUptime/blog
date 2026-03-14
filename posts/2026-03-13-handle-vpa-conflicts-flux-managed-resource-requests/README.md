# How to Handle VPA Conflicts with Flux Managed Resource Requests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Day 2 Operations, VPA, Resource Management, Troubleshooting

Description: Resolve conflicts between VerticalPodAutoscaler and Flux-managed resource requests so VPA can rightsize containers without Flux reverting the optimized values.

---

## Introduction

Vertical Pod Autoscaler (VPA) automatically adjusts container CPU and memory requests based on observed usage — a powerful tool for rightsizing workloads and reducing cluster waste. But VPA conflicts with GitOps in a fundamental way: Flux declares specific resource requests in Git, VPA modifies them at runtime, and Flux reconciles them back to the Git-declared values on the next cycle. The result is containers that are never correctly rightsized and VPA recommendations that are perpetually ignored.

Unlike the HPA conflict (where removing `spec.replicas` is the clean fix), the VPA conflict requires a more nuanced approach because resource requests are often important to define explicitly for scheduling purposes. The solution depends on which VPA update mode you use and what level of automation you want.

This guide covers all approaches: using VPA in Off mode to generate recommendations without applying them, using VPA in Initial mode for new pods only, configuring Flux field management to coexist with VPA, and creating a GitOps workflow for incorporating VPA recommendations.

## Prerequisites

- VPA installed in your cluster (metrics-server required)
- Flux CD v2 managing Deployments with resource requests
- kubectl and Flux CLI installed
- Prometheus for VPA metrics visualization (optional but recommended)

## Step 1: Diagnose the VPA-Flux Conflict

Understand whether VPA is being overridden by Flux:

```bash
# Check VPA recommendations
kubectl describe vpa my-service -n team-alpha
# Recommendation:
#   Container Recommendations:
#     Container Name: my-service
#     Lower Bound:     cpu: 10m, memory: 64Mi
#     Target:          cpu: 245m, memory: 312Mi
#     Upper Bound:     cpu: 500m, memory: 512Mi

# Check current container resources
kubectl get deployment my-service -n team-alpha \
  -o jsonpath='{.spec.template.spec.containers[0].resources}'
# {"limits":{"cpu":"500m","memory":"256Mi"},"requests":{"cpu":"100m","memory":"128Mi"}}
# These are the Git-declared values — VPA recommendations are ignored

# Check VPA status
kubectl get vpa my-service -n team-alpha -o jsonpath='{.status.conditions}'
```

## Step 2: Use VPA in Off Mode (Recommendation Only)

The safest approach: VPA generates recommendations, humans update Git, Flux applies.

```yaml
# deploy/vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-service
  namespace: team-alpha
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-service
  updatePolicy:
    updateMode: "Off"   # VPA only generates recommendations, never applies them
  resourcePolicy:
    containerPolicies:
      - containerName: my-service
        minAllowed:
          cpu: 50m
          memory: 64Mi
        maxAllowed:
          cpu: "2"
          memory: 2Gi
        controlledResources: ["cpu", "memory"]
```

Read recommendations and update Git:

```bash
# View VPA recommendations
kubectl get vpa my-service -n team-alpha -o json | \
  jq '.status.recommendation.containerRecommendations[] | {
    container: .containerName,
    target: .target,
    lower: .lowerBound,
    upper: .upperBound
  }'

# Update Git manifest with VPA-recommended values
# Then commit and let Flux apply the change
```

## Step 3: Use VPA in Initial Mode for Safe Auto-Application

Initial mode applies VPA recommendations only to newly created pods, not existing ones. This means Flux's reconciliation (which creates pods) will use VPA-modified resource requests.

```yaml
# deploy/vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-service
  namespace: team-alpha
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-service
  updatePolicy:
    updateMode: "Initial"   # Apply to new pods only, no disruption to running pods
  resourcePolicy:
    containerPolicies:
      - containerName: my-service
        minAllowed:
          cpu: 50m
          memory: 64Mi
        maxAllowed:
          cpu: "1"
          memory: 1Gi
```

In Initial mode, VPA modifies the pod spec at admission time, not the Deployment spec. Flux owns the Deployment's resource fields but VPA overrides them at pod creation time through a mutating webhook — no conflict.

## Step 4: Build a GitOps Workflow for VPA Recommendations

Create a CI job that reads VPA recommendations and opens a PR to update resource requests.

```yaml
# .github/workflows/vpa-recommendations.yml
name: VPA Recommendation PR

on:
  schedule:
    - cron: "0 9 * * 1"   # Weekly on Monday morning

jobs:
  update-resources:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Read VPA recommendations
        run: |
          # Get all VPA recommendations from the cluster
          kubectl get vpa --all-namespaces -o json | \
            jq -r '.items[] |
              "\(.metadata.namespace) \(.metadata.name) " +
              "\(.status.recommendation.containerRecommendations[0].target.cpu) " +
              "\(.status.recommendation.containerRecommendations[0].target.memory)"' \
            > /tmp/vpa-recommendations.txt
          cat /tmp/vpa-recommendations.txt

      - name: Update deployment manifests
        run: |
          while read ns name cpu memory; do
            MANIFEST="deploy/${name}/deployment.yaml"
            if [ -f "$MANIFEST" ]; then
              # Update CPU request to VPA target
              yq e ".spec.template.spec.containers[0].resources.requests.cpu = \"${cpu}\"" \
                -i "$MANIFEST"
              # Update memory request to VPA target
              yq e ".spec.template.spec.containers[0].resources.requests.memory = \"${memory}\"" \
                -i "$MANIFEST"
              echo "Updated $MANIFEST: cpu=$cpu memory=$memory"
            fi
          done < /tmp/vpa-recommendations.txt

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v6
        with:
          title: "chore: apply VPA resource recommendations"
          body: |
            Automated PR to apply VPA rightsizing recommendations.

            Review these changes and merge to update resource requests
            for all services with VPA configured.
          branch: vpa/weekly-recommendations
          commit-message: "chore: apply VPA resource recommendations"
```

## Step 5: Exclude Resources from Flux Server-Side Apply

If using VPA in Auto or Recreate mode, exclude resource fields from Flux's field management:

```yaml
# Kustomization with ignore fields configuration
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-service
  namespace: team-alpha
  annotations:
    # This annotation tells Flux to not manage specific paths
    # Note: Flux doesn't support field exclusions natively in this way
    # Use the VPA Off or Initial mode instead
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: team-alpha-apps
  path: ./deploy
  prune: true
```

For full VPA Auto mode, the cleanest approach is to use Helm and set resource requests through VPA admission webhook rather than through the chart values.

## Step 6: Monitor VPA and Flux for OOM Events

```yaml
# monitoring/alerts/vpa-oom-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: vpa-oom-alerts
  namespace: monitoring
spec:
  groups:
    - name: vpa.oom
      rules:
        - alert: ContainerOOMKilled
          expr: |
            increase(kube_pod_container_status_restarts_total[15m]) > 0
            and
            kube_pod_container_status_last_terminated_reason{reason="OOMKilled"} == 1
          for: 0m
          labels:
            severity: warning
          annotations:
            summary: "Container {{ $labels.container }} OOMKilled — check VPA recommendations"
```

## Best Practices

- Always start with VPA in `Off` mode to collect recommendations for 7-14 days before considering Auto mode
- Use `minAllowed` and `maxAllowed` in the VPA resource policy to bound the recommendations within acceptable ranges
- Never use VPA Auto or Recreate mode alongside Flux without carefully testing the interaction — use Off or Initial mode
- The VPA + HPA combination requires special handling: do not use VPA on the same metric that HPA scales on
- Schedule a weekly review of VPA recommendations and open PRs to update resource requests in Git
- Monitor OOM events and CPU throttling metrics to identify containers where current Git-declared requests are too low

## Conclusion

VPA and Flux can coexist without conflict when you choose the right VPA update mode. Using `Off` mode for recommendations and manual Git updates maintains full GitOps compliance. Using `Initial` mode provides automated rightsizing for new pods without disruption and without conflicting with Flux's field ownership. The key is treating VPA recommendations as valuable input to your GitOps process rather than letting VPA and Flux fight over the same fields at runtime.
