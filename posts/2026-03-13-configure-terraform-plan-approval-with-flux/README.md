# How to Configure Terraform Plan Approval with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Tofu Controller, Terraform, Plan Approval, GitOps, Kubernetes

Description: Set up a manual plan approval workflow for Terraform resources with the Tofu Controller and Flux CD, enabling human review before infrastructure changes are applied.

---

## Introduction

Running `terraform apply` automatically on every commit is powerful but risky for production infrastructure. The Tofu Controller's manual approval workflow gives teams the best of both worlds: Terraform plans are generated automatically whenever code changes, but a human must explicitly approve the plan before it is applied to real infrastructure.

This approval model mirrors standard engineering change control processes. A developer opens a pull request, the Tofu Controller generates a plan against the production environment, a senior engineer reviews the plan diff, and-only after approval-the apply runs. The generated plan is saved in the cluster and identified by a plan ID derived from the source revision, so the reviewed pending plan is the one that gets applied.

This guide walks through configuring manual plan approval, reviewing plans in the cluster, and approving them by updating the `Terraform` resource's `spec.approvePlan` field.

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

  # Empty or omitted approvePlan means: generate the plan automatically
  # but DO NOT apply until a human sets this field to the plan ID
  approvePlan: ""

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

# The STATUS column will show the approvePlan value when a plan is ready
# NAME                   READY     STATUS                                                           AGE
# production-database    Unknown   Plan generated: set approvePlan: "plan-main-b8e362c206" ...       5m
```

## Step 3: Review the Generated Plan

```bash
# Get the plan ID from the resource status
PLAN_ID=$(kubectl get terraform production-database \
  -n flux-system \
  -o jsonpath='{.status.plan.pending}')

# Read the human-readable plan output from the ConfigMap created by storeReadablePlan: human
kubectl get configmap tfplan-production-rds-production-database \
  -n flux-system \
  -o jsonpath='{.data.tfplan}'

# Alternatively, if you configure storeReadablePlan: json, review the JSON plan
kubectl get configmap tfplan-production-rds-production-database \
  -n flux-system \
  -o jsonpath='{.data.tfplan}' | jq .

# Check the pending plan ID that must be approved
kubectl get terraform production-database \
  -n flux-system \
  -o jsonpath='{.status.plan.pending}'
```

Example plan summary output:
```plaintext
Plan: 2 to add, 1 to change, 0 to destroy.
```

## Step 4: Approve the Plan

After reviewing the plan, approve it by setting `spec.approvePlan` to the plan ID shown in status. In a strict GitOps workflow, make this change in Git and let Flux reconcile it. For an imperative approval, patch the resource directly:

```bash
# Get the current plan ID
PLAN_ID=$(kubectl get terraform production-database \
  -n flux-system \
  -o jsonpath='{.status.plan.pending}')

echo "Approving plan: ${PLAN_ID}"

# Approve the plan by setting spec.approvePlan
kubectl patch terraform production-database \
  -n flux-system \
  --type=merge \
  -p "{\"spec\":{\"approvePlan\":\"${PLAN_ID}\"}}"

# Watch the apply progress
kubectl get terraform production-database -n flux-system --watch
```

## Step 5: Reject a Plan

If you identify issues in the plan, leave `spec.approvePlan` empty and commit the corrected Terraform change. When the source revision changes, the Tofu Controller clears the stale pending plan and generates a fresh one.

```bash
# Keep manual approval mode enabled
kubectl patch terraform production-database \
  -n flux-system \
  --type=merge \
  -p '{"spec":{"approvePlan":""}}'

# Force Flux to check for a new source revision after you push the fix
kubectl annotate terraform production-database \
  -n flux-system \
  reconcile.fluxcd.io/requestedAt="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

## Step 6: Automate Approval Notifications

```yaml
# clusters/my-cluster/notifications/plan-ready-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: plan-ready-notification
  namespace: flux-system
spec:
  providerRef:
    name: slack-infrastructure
  # Terraform is a third-party kind; patch the Flux Alert CRD to allow
  # Terraform event sources before applying this Alert.
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
  # Allow patching only the named Terraform resources for plan approval.
  # Kubernetes RBAC cannot restrict this permission to only spec.approvePlan.
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

- Always leave `approvePlan` empty or omit it for production Terraform resources that require manual approval. The cost of a brief review step is far less than the cost of an unreviewed destructive change.
- Include a link to the cluster and resource name in your Slack alert message so approvers can quickly navigate to the plan.
- Implement RBAC to restrict plan approval to senior engineers or a dedicated platform team. Not every developer should be able to approve production infrastructure changes.
- Archive plan outputs (the human-readable ConfigMap) to an external audit log before approving. This provides an immutable audit trail outside the cluster.
- Set a policy for how long a plan can sit waiting for approval before it is automatically discarded and regenerated. Plans older than the module version they are based on are invalid.

## Conclusion

The manual plan approval workflow gives your team full control over when Terraform changes are applied to production infrastructure. Plans are generated automatically on every code change but require explicit human approval before execution. The saved pending plan and the reviewed plan ID ensure the reviewed plan is what gets applied, eliminating surprise changes.
