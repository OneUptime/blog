# How to Debug Terraform Plan Failures in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Tofu Controller, Terraform, Debugging, Troubleshooting, GitOps, Kubernetes

Description: Debug and troubleshoot Terraform plan failures in the Tofu Controller with Flux CD using logs, events, and manual runner pod inspection.

---

## Introduction

Terraform plan failures in the Tofu Controller manifest differently from failures in a local CLI workflow. Instead of seeing plan output directly in your terminal, you need to know where to look in Kubernetes: the controller logs, the Terraform resource status conditions, the runner pod logs, and the plan output secrets. Understanding this debugging workflow is essential for operating the Tofu Controller in production.

Common failure causes include authentication errors (expired credentials, missing permissions), variable resolution failures (missing Secrets or ConfigMaps), module errors (syntax errors, invalid variable values), and provider API rate limiting. Each has a distinct signature in the Tofu Controller's status conditions and logs.

This guide provides a systematic debugging workflow for Terraform plan failures.

## Prerequisites

- Tofu Controller installed via Flux
- A failing Terraform resource to debug
- `kubectl` CLI with access to the cluster

## Step 1: Check the Terraform Resource Status

Start with the high-level status of the failing resource.

```bash
# Get the overall status
kubectl get terraform my-failing-resource -n flux-system

# Example failing output:
# NAME                   READY   STATUS                        AGE
# my-failing-resource    False   Plan failed: exit code 1      5m

# Get detailed conditions
kubectl get terraform my-failing-resource \
  -n flux-system \
  -o jsonpath='{.status.conditions}' | jq .

# Example conditions output:
# [
#   {
#     "lastTransitionTime": "2026-03-13T10:00:00Z",
#     "message": "error: No value for required variable",
#     "reason": "TerraformPlanFailed",
#     "status": "False",
#     "type": "Ready"
#   }
# ]
```

## Step 2: Get the Full Plan Error from the Status

```bash
# Get the detailed plan error message
kubectl get terraform my-failing-resource \
  -n flux-system \
  -o jsonpath='{.status.plan.error}'

# Alternatively, describe the resource for human-readable output
kubectl describe terraform my-failing-resource -n flux-system
```

## Step 3: Find and Inspect the Runner Pod Logs

The Tofu Controller spawns runner pods to execute Terraform. These pods contain the full Terraform output.

```bash
# List runner pods (they are short-lived - look for recent completed/failed pods)
kubectl get pods -n flux-system | grep my-failing-resource

# Example output:
# runner-my-failing-resource-xxxxx   0/1   Error   0   5m

# Get the full logs from the runner pod
kubectl logs runner-my-failing-resource-xxxxx -n flux-system

# If the pod has already been cleaned up, look in the Terraform resource events
kubectl get events -n flux-system \
  --field-selector involvedObject.name=my-failing-resource \
  --sort-by='.lastTimestamp'
```

## Step 4: Debug Common Failure Types

### Authentication Failures

```bash
# Symptom in logs:
# Error: error configuring S3 Backend: no valid credential sources found

# Check if the credentials secret exists and has the correct keys
kubectl get secret terraform-aws-credentials -n flux-system -o yaml

# Verify the secret keys match what the Terraform resource references
kubectl get terraform my-failing-resource \
  -n flux-system \
  -o jsonpath='{.spec.runnerPodTemplate.spec.env}' | jq .

# Test credentials manually (create a debug pod)
kubectl run aws-debug \
  --image=amazon/aws-cli \
  --env="AWS_ACCESS_KEY_ID=$(kubectl get secret terraform-aws-credentials -n flux-system -o jsonpath='{.data.AWS_ACCESS_KEY_ID}' | base64 -d)" \
  --env="AWS_SECRET_ACCESS_KEY=$(kubectl get secret terraform-aws-credentials -n flux-system -o jsonpath='{.data.AWS_SECRET_ACCESS_KEY}' | base64 -d)" \
  --restart=Never \
  -it --rm \
  -- sts get-caller-identity
```

### Missing Variable Failures

```bash
# Symptom in logs:
# Error: No value for required variable
# on variables.tf line 5:
#   variable "db_password" {}

# Check which varsFrom sources are configured
kubectl get terraform my-failing-resource \
  -n flux-system \
  -o jsonpath='{.spec.varsFrom}' | jq .

# Verify the referenced secrets/configmaps exist
kubectl get secret terraform-production-sensitive-vars -n flux-system
kubectl get configmap terraform-production-vars -n flux-system

# Check the specific keys in the secret
kubectl get secret terraform-production-sensitive-vars \
  -n flux-system \
  -o jsonpath='{.data}' | jq 'keys'
```

### State Lock Failures

```bash
# Symptom in logs:
# Error: Error acquiring the state lock
# Lock Info: ID: xxxxx, Operation: OperationTypePlan

# Check for orphaned state locks in DynamoDB
aws dynamodb scan \
  --table-name terraform-state-lock \
  --filter-expression "LockID = :key" \
  --expression-attribute-values '{":key": {"S": "my-org-terraform-state/production/vpc/terraform.tfstate"}}'

# Force-unlock the state (use with caution - ensure no other apply is running)
# This requires running terraform CLI locally with the same backend config
terraform force-unlock LOCK_ID
```

## Step 5: Enable Debug Logging

```yaml
# infrastructure/tofu-controller/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: tofu-controller
  namespace: flux-system
spec:
  interval: 10m
  chart:
    spec:
      chart: tofu-controller
      version: "0.16.x"
      sourceRef:
        kind: HelmRepository
        name: tofu-controller
        namespace: flux-system
  values:
    # Temporarily increase log verbosity for debugging
    # logLevel: info (normal), debug (verbose), trace (very verbose)
    logLevel: debug
```

```bash
# View controller debug logs
kubectl logs -n flux-system \
  -l app.kubernetes.io/name=tofu-controller \
  --tail=100 \
  | grep -E "(ERROR|WARN|terraform|plan)"
```

## Step 6: Force a Retry

After fixing the root cause, trigger a fresh reconciliation.

```bash
# Force reconciliation by updating the requestedAt annotation
kubectl annotate terraform my-failing-resource \
  -n flux-system \
  reconcile.fluxcd.io/requestedAt="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --overwrite

# Watch the new reconciliation attempt
kubectl get terraform my-failing-resource -n flux-system --watch
```

## Step 7: Create a Debugging Checklist

```bash
#!/bin/bash
# debug-terraform.sh - Run this for any failing Terraform resource
RESOURCE=$1
NAMESPACE=${2:-flux-system}

echo "=== Terraform Resource Status ==="
kubectl get terraform "${RESOURCE}" -n "${NAMESPACE}"

echo "=== Status Conditions ==="
kubectl get terraform "${RESOURCE}" -n "${NAMESPACE}" \
  -o jsonpath='{.status.conditions}' | jq .

echo "=== Recent Events ==="
kubectl get events -n "${NAMESPACE}" \
  --field-selector "involvedObject.name=${RESOURCE}" \
  --sort-by='.lastTimestamp' | tail -20

echo "=== VarsFrom Sources ==="
kubectl get terraform "${RESOURCE}" -n "${NAMESPACE}" \
  -o jsonpath='{.spec.varsFrom}' | jq .

echo "=== Runner Pods ==="
kubectl get pods -n "${NAMESPACE}" | grep "${RESOURCE}"
```

## Best Practices

- Check status conditions first (`kubectl describe terraform ...`) before diving into logs. The condition message usually identifies the failure category immediately.
- Set up Flux Alerts for `TerraformPlanFailed` events so the team is notified immediately rather than discovering failures during the next review cycle.
- Keep runner pod logs for failed executions by setting a longer pod grace period. By default, runner pods are cleaned up quickly, which can make debugging time-sensitive.
- Maintain a runbook for the most common failure types (authentication, state lock, provider rate limiting) so on-call engineers can resolve them without deep Terraform knowledge.
- Test variable injection by printing variable values at the start of your Terraform modules (using `output` or `terraform console`) in non-production environments before promoting to production.

## Conclusion

Terraform plan failures in the Tofu Controller are debuggable using a systematic workflow: start with resource status conditions, examine runner pod logs, identify the failure category, and apply the appropriate fix. Setting up proper alerting and maintaining a debugging runbook makes operational troubleshooting efficient and repeatable.
