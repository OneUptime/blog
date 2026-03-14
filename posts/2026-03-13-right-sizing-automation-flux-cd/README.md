# How to Implement Right-Sizing Automation with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Right-Sizing, VPA, Goldilocks, Cost Management, Automation, Resource Optimization

Description: Implement automated resource right-sizing recommendations in Flux CD workflows using VPA, Goldilocks, and GitOps pull request automation to continuously optimize Kubernetes compute costs.

---

## Introduction

Resource right-sizing - setting CPU and memory requests to match actual workload consumption - is one of the most impactful ongoing cost optimizations in Kubernetes. Studies consistently show that Kubernetes clusters are overprovisioned by 50-80% on average, meaning teams pay for two to five times the compute they actually use. The challenge is not identifying overprovisioned workloads; tools like Goldilocks and VPA do that well. The challenge is systematically applying those recommendations back into your manifests.

Flux CD's GitOps model provides the perfect integration point for right-sizing automation. By combining VPA recommendations with automated pull requests, you create a workflow where resource optimizations flow from runtime data through code review and into production - maintaining the safety and auditability of GitOps while capturing the efficiency benefits of automated right-sizing.

This guide implements a right-sizing automation pipeline using VPA, Goldilocks, and a custom reconciliation script that generates pull requests with resource updates for your Flux-managed workloads.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- VPA deployed in recommendation mode (see the Goldilocks guide)
- Goldilocks deployed and monitoring your namespaces
- A GitHub repository connected to Flux CD
- GitHub Actions or equivalent CI system
- kubectl and Flux CLI installed in your CI environment

## Step 1: Set Up VPA Objects for Recommendation Mode

Create VPA objects for each major workload that disable automatic updates but collect recommendations.

```yaml
# apps/api-server/vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-server-vpa
  namespace: backend
  labels:
    # Label to identify VPA objects managed for right-sizing automation
    right-sizing/managed: "true"
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  updatePolicy:
    # Recommendation only - never automatically update pods
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
      - containerName: "api-server"
        # Set bounds for recommendations
        minAllowed:
          cpu: 10m
          memory: 32Mi
        maxAllowed:
          cpu: "4"
          memory: 4Gi
        controlledResources:
          - cpu
          - memory
```

## Step 2: Create the Right-Sizing Recommendation Extractor

Build a script that reads VPA recommendations and generates Kubernetes patch files.

```bash
#!/bin/bash
# scripts/extract-vpa-recommendations.sh
# Extracts VPA recommendations and outputs as kustomize patches

set -euo pipefail

OUTPUT_DIR="${1:-./patches}"
NAMESPACE="${2:-backend}"

mkdir -p "$OUTPUT_DIR"

echo "Extracting VPA recommendations for namespace: $NAMESPACE"

# Get all VPAs with the right-sizing label
VPA_NAMES=$(kubectl get vpa -n "$NAMESPACE" \
  -l "right-sizing/managed=true" \
  -o jsonpath='{.items[*].metadata.name}')

for VPA_NAME in $VPA_NAMES; do
  # Extract the deployment name from VPA spec
  DEPLOYMENT=$(kubectl get vpa "$VPA_NAME" -n "$NAMESPACE" \
    -o jsonpath='{.spec.targetRef.name}')

  # Get the recommended CPU and memory values (target recommendation)
  CPU_RECOMMENDATION=$(kubectl get vpa "$VPA_NAME" -n "$NAMESPACE" \
    -o jsonpath='{.status.recommendation.containerRecommendations[0].target.cpu}')

  MEMORY_RECOMMENDATION=$(kubectl get vpa "$VPA_NAME" -n "$NAMESPACE" \
    -o jsonpath='{.status.recommendation.containerRecommendations[0].target.memory}')

  if [[ -z "$CPU_RECOMMENDATION" || -z "$MEMORY_RECOMMENDATION" ]]; then
    echo "Skipping $VPA_NAME - no recommendations available yet"
    continue
  fi

  echo "Deployment: $DEPLOYMENT"
  echo "  Recommended CPU: $CPU_RECOMMENDATION"
  echo "  Recommended Memory: $MEMORY_RECOMMENDATION"

  # Generate a kustomize patch file
  cat > "$OUTPUT_DIR/${DEPLOYMENT}-resources.yaml" << EOF
# Auto-generated right-sizing patch for $DEPLOYMENT
# VPA recommendation extracted: $(date -u +"%Y-%m-%d")
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $DEPLOYMENT
  namespace: $NAMESPACE
spec:
  template:
    spec:
      containers:
        - name: $DEPLOYMENT
          resources:
            requests:
              cpu: $CPU_RECOMMENDATION
              memory: $MEMORY_RECOMMENDATION
EOF

  echo "Generated patch: $OUTPUT_DIR/${DEPLOYMENT}-resources.yaml"
done
```

## Step 3: Automate Pull Request Creation with GitHub Actions

Create a GitHub Actions workflow that runs weekly, extracts VPA recommendations, and opens pull requests with resource updates.

```yaml
# .github/workflows/right-sizing-automation.yaml
name: Right-Sizing Automation
on:
  schedule:
    # Run every Sunday at 10 AM UTC
    - cron: "0 10 * * 0"
  workflow_dispatch:  # Allow manual trigger

jobs:
  right-sizing:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: v1.29.0

      - name: Configure kubeconfig
        env:
          KUBECONFIG_DATA: ${{ secrets.KUBECONFIG }}
        run: |
          mkdir -p ~/.kube
          echo "$KUBECONFIG_DATA" | base64 -d > ~/.kube/config

      - name: Extract VPA recommendations
        run: |
          bash scripts/extract-vpa-recommendations.sh ./generated-patches backend
          bash scripts/extract-vpa-recommendations.sh ./generated-patches frontend

      - name: Check for meaningful changes
        id: changes
        run: |
          if git diff --quiet; then
            echo "changed=false" >> $GITHUB_OUTPUT
          else
            echo "changed=true" >> $GITHUB_OUTPUT
          fi

      - name: Create pull request with recommendations
        if: steps.changes.outputs.changed == 'true'
        uses: peter-evans/create-pull-request@v6
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          branch: right-sizing/automated-recommendations
          title: "chore: apply right-sizing recommendations from VPA"
          body: |
            ## Right-Sizing Recommendations

            This PR contains automated resource right-sizing recommendations
            generated from VPA data collected over the past week.

            **Review before merging:**
            - Verify recommendations are within expected ranges
            - Check that requests are not set below observed peak usage
            - Test in staging before merging to production

            Generated by: Right-Sizing Automation workflow
            Date: ${{ github.run_started_at }}
          labels: |
            right-sizing
            automated
            cost-optimization
```

## Step 4: Add Flux Kustomization for VPA Objects

Ensure all VPA recommendation objects are deployed and maintained by Flux.

```yaml
# clusters/production/vpa-recommendations-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: vpa-recommendations
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Only reconcile VPA objects
  patches:
    - target:
        kind: VerticalPodAutoscaler
      patch: |
        - op: replace
          path: /spec/updatePolicy/updateMode
          value: "Off"  # Always keep in Off mode - we manage updates via GitOps
  dependsOn:
    - name: vpa
```

## Step 5: Track Right-Sizing Progress

Build visibility into your right-sizing adoption over time.

```bash
# Calculate potential savings by comparing current vs recommended resources
kubectl get vpa -A -l "right-sizing/managed=true" -o json | jq -r '
  .items[] |
  .metadata.name as $name |
  .status.recommendation.containerRecommendations[]? |
  "\($name): recommended_cpu=\(.target.cpu) recommended_memory=\(.target.memory)"
'

# Check how many VPAs have recommendations available
kubectl get vpa -A -o json | jq '[.items[] | select(.status.recommendation != null)] | length'

# Verify Flux is managing VPA objects
flux get kustomization vpa-recommendations

# Review open right-sizing PRs
gh pr list --label right-sizing
```

## Best Practices

- Always require human review of right-sizing pull requests before merging - automated recommendations can occasionally be too aggressive if workloads had unusual traffic during the measurement period.
- Apply recommendations to staging first; monitor for 48 hours before promoting to production to catch memory pressure issues that only manifest under real traffic.
- Set a minimum threshold for recommendation changes - only open a PR if the recommended values differ from current settings by more than 20% to avoid noise.
- Use the "lower bound" VPA recommendation rather than "target" for memory limits; target recommendations can be too close to peak usage, risking OOMKills.
- Include the VPA measurement window in the PR description so reviewers know whether the data reflects typical traffic or an anomaly.
- Archive right-sizing PRs in a changelog to build a record of savings achieved over time.

## Conclusion

Right-sizing automation closes the feedback loop between Kubernetes runtime data and your GitOps configuration. By systematically extracting VPA recommendations and converting them into pull requests, you create a process that continuously reduces resource overprovisioning while maintaining the safety guarantees of human code review. Over time, this compounds into significant cost savings as your Flux-managed workloads converge on resource settings that reflect actual usage rather than over-cautious initial estimates.
