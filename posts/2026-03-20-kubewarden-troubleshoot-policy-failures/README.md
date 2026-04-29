# How to Troubleshoot Kubewarden Policy Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Kubernetes, Policy, Troubleshooting, Debugging

Description: A comprehensive guide to diagnosing and resolving common Kubewarden policy failures, including installation issues, policy activation problems, and unexpected denials.

## Introduction

Kubewarden policy failures can manifest in several ways: policies that fail to activate, policies that unexpectedly deny legitimate workloads, or policies that fail to block clearly non-compliant resources. Quickly identifying the root cause requires understanding Kubewarden's component architecture and knowing where to look for diagnostic information.

This guide provides a systematic approach to troubleshooting Kubewarden issues.

## Prerequisites

- Kubewarden installed on the cluster
- `kubectl` with cluster-admin access
- `kwctl` CLI for local policy testing

## Quick Diagnostics Overview

```bash
# 1. Check all Kubewarden pods are running

kubectl get pods -n kubewarden

# 2. Check PolicyServer status
kubectl get policyserver -n kubewarden

# 3. Check all policy statuses
kubectl get clusteradmissionpolicies
kubectl get admissionpolicies -A

# 4. Check recent policy events
kubectl get events -n kubewarden --sort-by='.lastTimestamp'

# 5. Check Kubewarden logs
kubectl logs -n kubewarden \
  deployment/kubewarden-controller \
  --all-pods=true \
  --tail=50
```

## Troubleshooting Policy Activation Issues

### Symptom: Policy Status Stuck in "pending"

```bash
# Check the policy status conditions
kubectl describe clusteradmissionpolicy my-policy | grep -A 20 "Conditions:"

# Look for error messages in controller logs
kubectl logs -n kubewarden \
  deployment/kubewarden-controller \
  --all-pods=true \
  | grep -Ei "error|failed|my-policy"
```

### Common Causes of Activation Failure

**1. Policy Wasm module not accessible**

```bash
# Validate the module reference locally
kwctl pull registry://ghcr.io/kubewarden/policies/pod-privileged:v0.2.0

# Check policy server logs for module download or verification errors
kubectl logs -n kubewarden \
  -l kubewarden/policy-server=default \
  --all-containers=true \
  --tail=100 \
  | grep -Ei "ghcr.io|error|failed|verify|pull"
```

**2. Invalid policy settings**

```bash
# Create a minimal admission request for local testing
cat <<EOF > /tmp/pod.json
{"apiVersion":"v1","kind":"Pod","metadata":{"name":"settings-check"},"spec":{"containers":[{"name":"pause","image":"registry.k8s.io/pause"}]}}
EOF

kwctl scaffold admission-request \
  --operation CREATE \
  --object /tmp/pod.json > /tmp/test-request.json

# Validate the settings before deploying
kwctl run \
  registry://ghcr.io/kubewarden/policies/container-resources:latest \
  --request-path /tmp/test-request.json \
  --settings-json '{"memory":{"defaultRequest":"5G","maxLimit":"1G"}}'

# Expected output for invalid settings: error message
```

**3. PolicyServer not running**

```bash
# Check the PolicyServer referenced by the policy
kubectl get policyserver default -n kubewarden

# Check PolicyServer pods
kubectl get pods -n kubewarden \
  -l kubewarden/policy-server=default

# Restart the PolicyServer if needed
kubectl delete pods -n kubewarden \
  -l kubewarden/policy-server=default
```

## Troubleshooting Unexpected Denials

### Getting the Denial Reason

```bash
# When a resource is denied, the error message tells you why
kubectl apply -f my-pod.yaml 2>&1

# Expected output with details:
# Error from server: error when creating "my-pod.yaml":
# admission webhook "clusterwide-no-privileged.kubewarden.admission" denied the request:
# Container 'app' is running as privileged
```

### Tracing a Denial to a Specific Policy

```bash
# Find which policy denied the request
# Look at the webhook name in the error message
# For ClusterAdmissionPolicy objects, the webhook name is typically:
# clusterwide-<policy-name>.kubewarden.admission

# Check recent namespace events around the failed request
kubectl get events -n my-namespace \
  --sort-by='.lastTimestamp'

# Check policy server logs for the denial
kubectl logs -n kubewarden \
  -l kubewarden/policy-server=default \
  --all-containers=true \
  --tail=100 \
  | grep -Ei "my-pod|deny|reject"
```

### Testing a Specific Resource Against Policies

```bash
# Render the resource as JSON and wrap it in an admission request
kubectl apply --dry-run=client -o json -f my-pod.yaml > /tmp/pod.json

kwctl scaffold admission-request \
  --operation CREATE \
  --object /tmp/pod.json > /tmp/test-request.json

# Test against the denying policy
kwctl run \
  registry://ghcr.io/kubewarden/policies/pod-privileged:v0.2.0 \
  --request-path /tmp/test-request.json
```

## Troubleshooting Policy Not Blocking

### Symptom: Policy Active But Not Blocking Non-Compliant Resources

```bash
# Check the policy's mode - monitor mode won't block
kubectl get clusteradmissionpolicy my-policy \
  -o jsonpath='{.spec.mode}'
# Should output "protect", not "monitor"

# Check the policy's rules match the resource being submitted
kubectl get clusteradmissionpolicy my-policy \
  -o jsonpath='{.spec.rules}'

# Verify the namespace isn't excluded
kubectl get clusteradmissionpolicy my-policy \
  -o jsonpath='{.spec.namespaceSelector}'
```

### Verify Webhook Configuration

```bash
# Check that the ValidatingWebhookConfiguration exists
kubectl get validatingwebhookconfigurations.admissionregistration.k8s.io -l kubewarden

# Verify the webhook is targeting the correct resources
kubectl describe validatingwebhookconfiguration \
  clusterwide-my-policy

# Check the webhook's namespace selector
kubectl get validatingwebhookconfiguration \
  clusterwide-my-policy \
  -o jsonpath='{.webhooks[0].namespaceSelector}'
```

## Troubleshooting PolicyServer Performance

### Symptom: Slow Admission Webhook Responses

```bash
# Check PolicyServer resource usage
kubectl top pods -n kubewarden

# Check PolicyServer Pods for OOMKilled restarts
kubectl describe pods -n kubewarden \
  -l kubewarden/policy-server=default \
  | grep -A 5 -B 2 OOMKilled

# Increase PolicyServer resources if needed
kubectl patch policyserver default -n kubewarden \
  --type=merge \
  -p '{"spec":{"limits":{"memory":"2Gi","cpu":"2"},"requests":{"memory":"2Gi","cpu":"2"}}}'
```

### Webhook Timeout Issues

```bash
# Check the webhook timeout configuration
kubectl get validatingwebhookconfiguration \
  -l kubewarden \
  -o jsonpath='{range .items[*]}{.metadata.name}: timeout={.webhooks[0].timeoutSeconds}{"\n"}{end}'

# Kubewarden uses 10 seconds by default
# Increase if policies are too slow
```

## Recovering from a Broken PolicyServer

If the PolicyServer crashes and blocks all admissions:

```bash
# EMERGENCY: Stop the controller first so it does not immediately recreate webhooks
kubectl scale deployment kubewarden-controller \
  --replicas=0 \
  -n kubewarden

# Delete Kubewarden webhook configurations
# This disables Kubewarden policies temporarily
# Only do this in a critical production incident
kubectl delete validatingwebhookconfigurations \
  -l app.kubernetes.io/part-of=kubewarden

kubectl delete mutatingwebhookconfigurations \
  -l app.kubernetes.io/part-of=kubewarden

# Fix the PolicyServer issue, then restore the controller
kubectl scale deployment \
  kubewarden-controller \
  --replicas=1 \
  -n kubewarden
```

## Enabling Debug Logging

```bash
# Enable debug logging on the PolicyServer
kubectl patch policyserver default -n kubewarden \
  --type=merge \
  -p '{"spec":{"env":[{"name":"KUBEWARDEN_LOG_LEVEL","value":"debug"}]}}'

# View debug logs
kubectl logs -n kubewarden \
  -l kubewarden/policy-server=default \
  --all-containers=true \
  --follow \
  | grep -Ei "debug|policy|deny|allow"
```

## Conclusion

Troubleshooting Kubewarden policy failures requires a layered approach: check component health first, then policy activation status, then examine specific denials or missed blocks. The combination of `kubectl describe`, event watching, log analysis, and `kwctl` local testing covers the vast majority of issues you will encounter. By maintaining good observability practices and understanding the relationship between PolicyServers, webhook configurations, and policy resources, you can quickly diagnose and resolve any Kubewarden issue.
