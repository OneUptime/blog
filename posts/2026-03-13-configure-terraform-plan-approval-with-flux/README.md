# How to Configure Terraform Plan Approval with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Tofu Controller, Terraform, Plan Approval, GitOps, Kubernetes

Description: Set up a manual plan approval workflow for Terraform resources with the Tofu Controller and Flux CD, enabling human review before infrastructure changes are applied.

---

## Introduction

Running `terraform apply` automatically on every commit is powerful but risky for production infrastructure. The Tofu Controller's manual approval workflow gives teams the best of both worlds: Terraform plans are generated automatically whenever code changes, but a human must explicitly approve the plan before it is applied to real infrastructure.

This approval model mirrors standard engineering change control processes. A developer opens a pull request, the Tofu Controller generates a plan against the production environment, a senior engineer reviews the plan diff, and-only after approval-the apply runs. The plan is cryptographically tied to the specific code revision that generated it, so what was reviewed is exactly what gets applied.

This guide walks through configuring manual plan approval, reviewing plans in the cluster, and approving them via `kubectl` annotations.

## Prerequisites

- Tofu Controller installed via Flux
- A `Terraform` resource targeting a real module
- `kubectl` CLI with access to the cluster

## Step 1: Configure a Terraform Resource for Manual Approval

```yaml
# infrastructure/terraform/production-database.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: production-database
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/rds
  workspace: production-rds

  # "manual" means: generate the plan automatically but DO NOT apply
  # until a human annotates the resource with the plan ID
  approvePlan: "manual"

  # Store a human-readable plan for review
  storeReadablePlan: human

  vars:
    - name: db_instance_class
      value: db.r6g.large
    - name: db_engine_version
      value: "15.4"
    - name: multi_az
      value: "true"
    - name: allocated_storage
      value: "500"

  varsFrom:
    - kind: Secret
      name: terraform-aws-credentials
      optional: false

  writeOutputsToSecret:
    name: production-database-outputs
    outputs:
      - db_endpoint
      - db_port
```

## Step 2: Trigger Plan Generation

When you commit a change to the Terraform module, Flux detects the change and the Tofu Controller automatically generates a plan. You do not need to do anything to trigger planning.

```bash
# After committing changes, watch for the plan to be generated
kubectl get terraform production-database -n flux-system --watch

# The STATUS column will show "Plan generated" when ready
# NAME                   READY   STATUS            AGE
# production-database    False   Plan generated    5m
```

## Step 3: Review the Generated Plan

```bash
# Get the plan ID from the resource status
PLAN_ID=$(kubectl get terraform production-database \
  -n flux-system \
  -o jsonpath='{.status.plan.lastApplied}')

# Read the human-readable plan output
kubectl get secret production-database-tfplan-human \
  -n flux-system \
  -o jsonpath='{.data.plan}' | base64 -d

# Alternatively, review the JSON plan for programmatic analysis
kubectl get terraform production-database \
  -n flux-system \
  -o jsonpath='{.status.plan.planJSON}' | jq .

# Check what the plan would change
kubectl get terraform production-database \
  -n flux-system \
  -o jsonpath='{.status.plan.summary}'
```

Example plan summary output:
```plaintext
Plan: 2 to add, 1 to change, 0 to destroy.
```

## Step 4: Approve the Plan

After reviewing the plan, approve it by annotating the resource with the plan ID. This creates a cryptographic binding between the reviewed plan and the apply operation.

```bash
# Get the current plan ID
PLAN_ID=$(kubectl get terraform production-database \
  -n flux-system \
  -o jsonpath='{.status.plan.planId}')

echo "Approving plan: ${PLAN_ID}"

# Approve the plan by annotating the resource
kubectl annotate terraform production-database \
  -n flux-system \
  infra.contrib.fluxcd.io/approvePlan="${PLAN_ID}"

# Watch the apply progress
kubectl get terraform production-database -n flux-system --watch
```

## Step 5: Reject a Plan

If you identify issues in the plan, discard it and the Tofu Controller will generate a fresh plan on the next reconciliation.

```bash
# To discard a plan, remove the approvePlan annotation
kubectl annotate terraform production-database \
  -n flux-system \
  infra.contrib.fluxcd.io/approvePlan-

# Force a new reconciliation to generate a fresh plan
kubectl annotate terraform production-database \
  -n flux-system \
  reconcile.fluxcd.io/requestedAt="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

## Step 6: Automate Approval Notifications

```yaml
# clusters/my-cluster/notifications/plan-ready-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: plan-ready-notification
  namespace: flux-system
spec:
  providerRef:
    name: slack-infrastructure
  # Alert when a plan is generated and waiting for approval
  eventSeverity: info
  eventSources:
    - kind: Terraform
      name: "*"
      namespace: flux-system
  # Filter for plan-generated events only
  inclusionList:
    - ".*Plan generated.*"
```

## Step 7: Implement RBAC for Plan Approval

Restrict who can approve plans using Kubernetes RBAC.

```yaml
# clusters/my-cluster/rbac/terraform-approver.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: terraform-plan-approver
rules:
  - apiGroups:
      - infra.contrib.fluxcd.io
    resources:
      - terraforms
    verbs:
      - get
      - list
      - watch
  # Only allow patching annotations (for plan approval)
  - apiGroups:
      - infra.contrib.fluxcd.io
    resources:
      - terraforms
    verbs:
      - patch
    resourceNames:
      - production-database
      - production-vpc
      - production-eks

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: terraform-plan-approvers
subjects:
  - kind: Group
    name: platform-team
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: terraform-plan-approver
  apiGroup: rbac.authorization.k8s.io
```

## Best Practices

- Always use `approvePlan: "manual"` for production Terraform resources. The cost of a brief review step is far less than the cost of an unreviewed destructive change.
- Include a link to the cluster and resource name in your Slack alert message so approvers can quickly navigate to the plan.
- Implement RBAC to restrict plan approval to senior engineers or a dedicated platform team. Not every developer should be able to approve production infrastructure changes.
- Archive plan outputs (the human-readable secret) to an external audit log before approving. This provides an immutable audit trail outside the cluster.
- Set a policy for how long a plan can sit waiting for approval before it is automatically discarded and regenerated. Plans older than the module version they are based on are invalid.

## Conclusion

The manual plan approval workflow gives your team full control over when Terraform changes are applied to production infrastructure. Plans are generated automatically on every code change but require explicit human approval before execution. The cryptographic binding between the reviewed plan ID and the apply operation ensures exactly what was reviewed is what gets applied, eliminating surprise changes.
