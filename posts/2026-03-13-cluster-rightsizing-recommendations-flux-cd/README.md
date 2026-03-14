# Implementing Cluster Rightsizing Recommendations with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, Rightsizing, Resource-optimization, VPA, GitOps, FinOps

Description: Learn how to implement a GitOps-driven cluster rightsizing workflow using Flux CD, applying VPA recommendations and resource limit updates through pull requests for controlled, auditable optimization.

---

## Introduction

Cluster rightsizing - adjusting CPU and memory requests/limits to match actual workload consumption - is a key FinOps practice that reduces cloud waste and prevents OOM kills. However, directly applying VPA recommendations without review is risky. A GitOps approach where VPA recommendations are converted to pull requests against your fleet repository provides the benefits of automation with the safety of human review.

This guide shows how to build a rightsizing workflow: VPA generates recommendations, a script creates PRs with updated resource values, and Flux applies the approved changes.

## Prerequisites

- Flux v2 installed
- Vertical Pod Autoscaler (VPA) installed in recommendation mode
- `flux` CLI v2.0+
- A GitOps repository for your workload manifests
- `kubectl` with cluster access

## Step 1: Install VPA in Recommendation Mode

Deploy VPA without auto-apply mode, so it only generates recommendations without modifying pods.

```yaml
# vpa-recommendation-only.yaml
# VPA object that generates recommendations without auto-applying them
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: myapp-vpa
  namespace: myapp
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: myapp
  updatePolicy:
    updateMode: "Off"              # Off = generate recommendations only, never auto-apply
  resourcePolicy:
    containerPolicies:
      - containerName: "*"
        # Set bounds to prevent unreasonable recommendations
        minAllowed:
          cpu: 50m
          memory: 64Mi
        maxAllowed:
          cpu: 2
          memory: 2Gi
```

## Step 2: Script to Extract VPA Recommendations

Create a script that reads VPA recommendations and generates updated manifest patches.

```bash
#!/bin/bash
# scripts/extract-vpa-recommendations.sh
# Reads VPA recommendations and outputs Kustomize patches for GitOps review

NAMESPACE="${1:-default}"
OUTPUT_DIR="${2:-./rightsizing-patches}"
mkdir -p "${OUTPUT_DIR}"

# Get all VPA objects in the namespace
VPAS=$(kubectl get vpa -n "${NAMESPACE}" --no-headers -o custom-columns=NAME:.metadata.name)

for VPA in ${VPAS}; do
  # Extract the target workload name
  TARGET=$(kubectl get vpa "${VPA}" -n "${NAMESPACE}" \
    -o jsonpath='{.spec.targetRef.name}')

  # Get VPA recommendations
  CPU_REC=$(kubectl get vpa "${VPA}" -n "${NAMESPACE}" \
    -o jsonpath='{.status.recommendation.containerRecommendations[0].target.cpu}')
  MEM_REC=$(kubectl get vpa "${VPA}" -n "${NAMESPACE}" \
    -o jsonpath='{.status.recommendation.containerRecommendations[0].target.memory}')

  if [ -z "${CPU_REC}" ] || [ -z "${MEM_REC}" ]; then
    echo "No recommendation yet for ${VPA}, skipping"
    continue
  fi

  echo "VPA recommendation for ${TARGET}: CPU=${CPU_REC}, Memory=${MEM_REC}"

  # Generate a Kustomize patch file with the recommended resources
  cat > "${OUTPUT_DIR}/${TARGET}-rightsizing-patch.yaml" << EOF
# Auto-generated rightsizing patch from VPA recommendations
# Review and approve via PR before Flux applies this
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${TARGET}
  namespace: ${NAMESPACE}
spec:
  template:
    spec:
      containers:
        - name: ${TARGET}
          resources:
            requests:
              cpu: "${CPU_REC}"      # VPA recommended
              memory: "${MEM_REC}"   # VPA recommended
            limits:
              cpu: "$(echo ${CPU_REC} | awk '{print $1 * 2}')"  # 2x request for limits
              memory: "$(echo ${MEM_REC} | awk '{print $1 * 1.5}')"
EOF
  echo "Generated patch: ${OUTPUT_DIR}/${TARGET}-rightsizing-patch.yaml"
done
```

## Step 3: Apply Rightsizing via Flux Kustomization Patches

Add the generated patches to your Kustomization for Flux to apply.

```yaml
# apps/myapp/kustomization.yaml
# Apply rightsizing patches alongside the base manifests
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
patches:
  # Apply the VPA-recommended resource values
  # This file is created by the rightsizing PR workflow
  - path: myapp-rightsizing-patch.yaml
    target:
      kind: Deployment
      name: myapp
```

## Step 4: Automate PR Creation for Rightsizing Changes

Use a GitHub Actions workflow to automatically open PRs with rightsizing recommendations.

```yaml
# .github/workflows/rightsizing-pr.yml
# Weekly workflow to create PRs with VPA rightsizing recommendations
name: Weekly Rightsizing Recommendations

on:
  schedule:
    - cron: '0 10 * * 1'          # Every Monday at 10 AM UTC

jobs:
  rightsizing:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBECONFIG }}

      - name: Extract VPA recommendations
        run: |
          chmod +x scripts/extract-vpa-recommendations.sh
          ./scripts/extract-vpa-recommendations.sh production ./rightsizing-patches

      - name: Create PR if recommendations exist
        run: |
          if [ -n "$(ls -A ./rightsizing-patches)" ]; then
            cp ./rightsizing-patches/* apps/myapp/
            git config user.email "bot@example.com"
            git config user.name "Rightsizing Bot"
            git checkout -b rightsizing/$(date +%Y-%m-%d)
            git add apps/myapp/*-rightsizing-patch.yaml
            git commit -m "chore: apply VPA rightsizing recommendations $(date +%Y-%m-%d)"
            git push origin rightsizing/$(date +%Y-%m-%d)
            gh pr create --title "Rightsizing: Apply VPA recommendations" \
              --body "Auto-generated from VPA recommendations. Review resource changes before merging."
          fi
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Best Practices

- Always run VPA in `Off` mode first (recommendation-only) before enabling auto-apply.
- Review rightsizing PRs with the workload owner - they know the traffic patterns best.
- Set `maxAllowed` bounds on VPA objects to prevent recommendations larger than your node capacity.
- Apply rightsizing in staging first, observe for 24-48 hours, then apply to production.
- Track resource utilization before and after rightsizing using Prometheus metrics to measure cost savings.

## Conclusion

A GitOps-driven rightsizing workflow with Flux gives you the benefits of VPA's data-driven recommendations with the safety of human review before applying changes. By generating PRs rather than auto-applying recommendations, you maintain control while automating the measurement and proposal of resource optimizations - reducing both waste and OOM risk over time.
