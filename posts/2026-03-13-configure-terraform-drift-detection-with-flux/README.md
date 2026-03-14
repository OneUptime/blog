# How to Configure Terraform Drift Detection with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Tofu Controller, Terraform, Drift Detection, GitOps, Kubernetes, Compliance

Description: Enable Terraform drift detection using the Tofu Controller with Flux CD to automatically detect and correct infrastructure configuration drift.

---

## Introduction

Infrastructure drift occurs when the actual state of cloud resources diverges from their desired configuration. This happens when engineers make emergency changes directly in the cloud console, when cloud provider updates modify resource attributes, or when automated processes modify resource tags or settings. Without drift detection, these changes accumulate silently and eventually cause incidents.

The Tofu Controller provides continuous drift detection as a core feature. On each reconciliation interval, it runs `terraform plan` against the actual cloud state and compares the result to the Terraform state file. If drift is detected, it generates a plan and—depending on the `approvePlan` setting—either notifies the team or corrects the drift automatically.

This guide covers configuring drift detection, setting appropriate intervals, alerting on drift, and making exceptions for intended drift.

## Prerequisites

- Tofu Controller installed via Flux
- Terraform resources managing real cloud infrastructure
- A Flux Alert Provider configured for notifications

## Step 1: Enable Drift Detection (Default Behavior)

Drift detection is enabled by default in the Tofu Controller. The `interval` field controls how often drift is checked.

```yaml
# infrastructure/terraform/production/iam-policies.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: production-iam-policies
  namespace: flux-system
spec:
  # Short interval for high-risk resources: detect drift every 5 minutes
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/iam-policies
  workspace: production-iam
  # Auto-apply drift corrections for IAM policies (low risk, reversible)
  approvePlan: "auto"

  # Drift detection is ON by default
  # Set to true only to temporarily disable drift checking
  disableDriftDetection: false

  varsFrom:
    - kind: Secret
      name: terraform-aws-credentials
      optional: false
  vars:
    - name: environment
      value: production
```

## Step 2: Configure Different Intervals by Risk Level

```yaml
# Low-risk resources: detect and correct drift aggressively
# infrastructure/terraform/production/s3-policies.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: production-s3-policies
  namespace: flux-system
spec:
  interval: 5m   # Check every 5 minutes
  approvePlan: "auto"   # Auto-correct drift
  disableDriftDetection: false
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/s3-bucket-policies
  workspace: production-s3-policies
  varsFrom:
    - kind: Secret
      name: terraform-aws-credentials

---
# High-risk resources: detect drift but require manual approval to correct
# infrastructure/terraform/production/rds.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: production-rds
  namespace: flux-system
spec:
  interval: 30m   # Check every 30 minutes
  approvePlan: "manual"   # Alert on drift, require approval to fix
  disableDriftDetection: false
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/rds
  workspace: production-rds
  varsFrom:
    - kind: Secret
      name: terraform-aws-credentials
    - kind: Secret
      name: terraform-production-sensitive-vars
      varsKeys:
        - db_master_password
```

## Step 3: Use Terraform ignore_changes for Intentional Drift

Some attributes are intentionally managed outside Terraform (e.g., auto-scaling counts, database engine version from auto-upgrade). Use `lifecycle.ignore_changes` in the module to exclude them from drift detection.

```hcl
# modules/eks/main.tf

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.cluster_name}-nodes"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.subnet_ids

  scaling_config {
    desired_size = var.node_count
    min_size     = var.min_count
    max_size     = var.max_count
  }

  lifecycle {
    # The cluster autoscaler changes desired_size - ignore it to prevent
    # Terraform from fighting with the autoscaler
    ignore_changes = [
      scaling_config[0].desired_size,
      # Also ignore launch_template version - managed by node group updates
      launch_template[0].version,
    ]
  }
}
```

## Step 4: Temporarily Disable Drift Detection

During maintenance windows or active troubleshooting, you may want to pause drift detection.

```bash
# Pause drift detection by patching the Terraform resource
kubectl patch terraform production-rds \
  -n flux-system \
  --type='merge' \
  -p '{"spec":{"disableDriftDetection": true}}'

# Perform your maintenance...

# Re-enable drift detection when maintenance is complete
kubectl patch terraform production-rds \
  -n flux-system \
  --type='merge' \
  -p '{"spec":{"disableDriftDetection": false}}'
```

## Step 5: Alert on Drift Detection

```yaml
# clusters/my-cluster/notifications/drift-alerts.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: terraform-drift-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-infrastructure
  eventSeverity: warning
  eventSources:
    - kind: Terraform
      name: "*"
      namespace: flux-system
  # Match events that indicate drift was detected
  inclusionList:
    - ".*drift detected.*"
    - ".*Plan generated.*"
    - ".*resources to change.*"
```

## Step 6: Build a Drift Detection Dashboard

```bash
# Check drift status across all Terraform resources
kubectl get terraform -n flux-system \
  -o custom-columns=\
'NAME:.metadata.name,READY:.status.conditions[0].status,REASON:.status.conditions[0].reason,LAST_APPLIED:.status.lastAppliedRevision'

# Find resources with pending plans (potential drift)
kubectl get terraform -n flux-system \
  -o json | jq -r '.items[] | select(.status.plan.planId != .status.lastApplied) | .metadata.name'

# View the last plan for a specific resource
kubectl get terraform production-iam-policies \
  -n flux-system \
  -o jsonpath='{.status.plan.summary}'
```

## Best Practices

- Set drift detection intervals based on the risk profile of the resource. IAM policies and security groups warrant short intervals (5 minutes) because unauthorized changes are high-risk. Databases and compute resources can use longer intervals (30-60 minutes).
- Use `approvePlan: "auto"` for drift correction on stateless resources (IAM policies, S3 bucket configurations, DNS records). Use `approvePlan: "manual"` for stateful resources (databases, compute instances) so drift is flagged but not automatically corrected.
- Use Terraform `lifecycle.ignore_changes` to document and exclude attributes that are intentionally managed outside Terraform (e.g., autoscaler-managed replica counts, cloud-managed version patches).
- Send drift detection alerts to the infrastructure on-call channel, not the general engineering channel. Drift in production is an operational event that requires immediate investigation.
- Review the drift alert to determine whether it represents an unauthorized change (requiring immediate correction) or a legitimate change made outside Git (requiring the module to be updated to match).

## Conclusion

Terraform drift detection is now configured and actively monitoring your cloud infrastructure. The Tofu Controller reconciles infrastructure on the configured interval, detects deviations from the desired state, and either corrects them automatically or alerts the team for manual review. This creates a self-healing infrastructure platform that maintains configuration consistency even when changes are made outside the GitOps workflow.
