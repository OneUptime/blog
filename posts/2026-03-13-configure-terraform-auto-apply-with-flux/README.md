# How to Configure Terraform Auto-Apply with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Tofu Controller, Terraform, Auto-Apply, GitOps, Kubernetes

Description: Enable automatic Terraform plan application using the Tofu Controller with Flux CD for fully automated GitOps-driven infrastructure provisioning.

---

## Introduction

Auto-apply is the GitOps-native way to operate Terraform. When a change is merged to the main branch, Flux detects it, the Tofu Controller generates a plan, and if the plan succeeds, the changes are applied automatically without human intervention. This removes the CI/CD Terraform pipeline entirely and replaces it with a continuously reconciling controller.

Auto-apply works best for infrastructure that changes frequently, has well-tested modules, and where the blast radius of an error is limited. For non-production environments, development infrastructure, or stateless resources like S3 bucket policies, auto-apply delivers rapid iteration cycles. Combined with Flux's GitOps branching strategy, merges to main are the only mechanism that changes infrastructure-no ad-hoc `terraform apply` commands that bypass review.

This guide covers configuring auto-apply with appropriate safeguards including drift detection intervals, health checks, and automatic rollback patterns.

## Prerequisites

- Tofu Controller installed via Flux
- A Flux GitRepository source for your Terraform modules
- AWS/cloud provider credentials configured
- `kubectl` CLI installed

## Step 1: Configure Auto-Apply for a Non-Production Environment

```yaml
# infrastructure/terraform/staging/main.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: staging-infrastructure
  namespace: flux-system
spec:
  # Reconcile every 5 minutes - detect and fix drift frequently
  interval: 5m

  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system

  path: ./modules/staging-environment

  workspace: staging

  # "auto" applies plans automatically after generation
  approvePlan: "auto"

  # Generate a human-readable plan for audit purposes
  storeReadablePlan: human

  vars:
    - name: environment
      value: staging
    - name: instance_type
      value: t3.small
    - name: db_instance_class
      value: db.t3.micro
    - name: multi_az
      value: "false"  # Single-AZ for cost savings in staging
    - name: region
      value: us-east-1

  varsFrom:
    - kind: Secret
      name: terraform-aws-credentials-staging
      optional: false

  # Publish outputs for consumption by other resources
  writeOutputsToSecret:
    name: staging-infrastructure-outputs
    outputs:
      - vpc_id
      - rds_endpoint
      - eks_cluster_name
```

## Step 2: Configure Auto-Apply for Stateless Resources in Production

Some production resources are safe for auto-apply because they cannot cause data loss.

```yaml
# infrastructure/terraform/production/iam-policies.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: production-iam-policies
  namespace: flux-system
spec:
  # Frequent reconciliation catches IAM drift (manual console changes)
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/iam-policies
  workspace: production-iam
  # Safe for auto-apply: IAM policy changes are reversible
  approvePlan: "auto"
  vars:
    - name: environment
      value: production
  varsFrom:
    - kind: Secret
      name: terraform-aws-credentials-production
      optional: false
```

## Step 3: Implement Safeguards with the Terraform Module

Add Terraform safeguards in the module itself to prevent destructive auto-apply operations.

```hcl
# modules/production-environment/main.tf

# Lifecycle rules prevent accidental destruction of critical resources
resource "aws_db_instance" "main" {
  identifier     = "${var.environment}-database"
  instance_class = var.db_instance_class
  engine         = "postgres"
  engine_version = "15.4"

  # These lifecycle rules prevent the auto-apply from destroying
  # the database even if the manifest is changed in a way that
  # would trigger replacement
  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      # Ignore engine_version changes (managed by RDS auto-upgrade)
      engine_version,
      # Ignore password changes (managed separately via secrets rotation)
      password,
    ]
  }
}
```

## Step 4: Configure Drift Detection

Auto-apply with drift detection is the core of GitOps Terraform. The controller periodically checks whether actual infrastructure matches the Terraform state.

```yaml
# infrastructure/terraform/production/s3-buckets.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: production-s3-buckets
  namespace: flux-system
spec:
  # Short interval for aggressive drift detection
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/s3-buckets
  workspace: production-s3
  approvePlan: "auto"

  # Drift detection: if actual state differs from Terraform state,
  # a plan is generated and (with approvePlan: auto) applied immediately
  disableDriftDetection: false

  vars:
    - name: bucket_names
      value: '["assets", "backups", "logs"]'
    - name: environment
      value: production
```

## Step 5: Add Flux Alerts for Auto-Apply Events

```yaml
# clusters/my-cluster/notifications/auto-apply-alerts.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: terraform-apply-notification
  namespace: flux-system
spec:
  providerRef:
    name: slack-infrastructure
  eventSeverity: info
  eventSources:
    - kind: Terraform
      name: "*"
      namespace: flux-system
  # Notify on both successful applies and failures
  inclusionList:
    - ".*Apply succeeded.*"
    - ".*Apply failed.*"
    - ".*Drift detected.*"
```

## Step 6: Monitor Auto-Apply Status

```bash
# Watch all Terraform resources in real time
kubectl get terraform -n flux-system --watch

# Check the last applied plan and its result
kubectl get terraform staging-infrastructure \
  -n flux-system \
  -o jsonpath='{.status.lastAppliedRevision}'

# View the full status including any errors
kubectl describe terraform staging-infrastructure -n flux-system

# Force an immediate reconciliation
flux reconcile source git flux-system
kubectl annotate terraform staging-infrastructure \
  -n flux-system \
  reconcile.fluxcd.io/requestedAt="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

## Best Practices

- Use auto-apply for non-production environments without restriction. Use it in production only for stateless or low-risk resources (IAM policies, DNS records, S3 bucket configurations).
- Add Terraform `lifecycle { prevent_destroy = true }` to critical production resources as a second layer of protection against accidental destruction via auto-apply.
- Set `disableDriftDetection: false` and a short `interval` (5-10 minutes) to ensure manual changes made outside Git are quickly detected and corrected.
- Alert on every auto-apply event so the team has full visibility into what changed and when, even without approving each change.
- Use separate `Terraform` resources (and separate workspaces) for different risk tiers. Do not combine auto-apply stateless resources with manual-approval stateful resources in the same workspace.

## Conclusion

Terraform auto-apply through the Tofu Controller and Flux CD creates a truly continuous infrastructure reconciliation loop. Changes merged to the main branch are applied within minutes, drift from manual changes is detected and corrected automatically, and every apply event is logged and alerted. Combined with appropriate safeguards in your Terraform modules, auto-apply is a powerful and safe approach for managing cloud infrastructure.
