# How to Create Kubewarden Admission Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Kubernetes, Policy, Security, Admission Control

Description: Learn how to create namespace-scoped Kubewarden AdmissionPolicy resources to enforce security and compliance rules on Kubernetes resources within specific namespaces.

## Introduction

Kubewarden AdmissionPolicies are namespace-scoped resources that intercept and evaluate Kubernetes API requests before they are persisted. Unlike ClusterAdmissionPolicies (which are cluster-wide), AdmissionPolicies apply only to resources within the namespace where they are created, making them ideal for per-team or per-application policy enforcement.

This guide covers creating, configuring, and managing namespace-scoped AdmissionPolicies.

## Prerequisites

- Kubewarden installed on a Kubernetes v1.21.0+ cluster
- `kubectl` access with permission to create and manage `AdmissionPolicy` resources in the target namespace
- Basic understanding of Kubernetes admission webhooks

## Understanding AdmissionPolicy vs ClusterAdmissionPolicy

| Feature | AdmissionPolicy | ClusterAdmissionPolicy |
|---------|----------------|------------------------|
| Scope | Single namespace | All namespaces |
| Created by | Users with delegated namespace RBAC | Cluster admin or users with cluster-scoped RBAC |
| Typical use | Team/app policies | Platform-wide policies |
| Can target namespace resources | Yes | Yes |
| Can target cluster resources | No | Yes |

## Creating a Basic AdmissionPolicy

### Preventing Privileged Pods in a Namespace

```yaml
# no-privileged-pods-policy.yaml

apiVersion: policies.kubewarden.io/v1
kind: AdmissionPolicy
metadata:
  name: no-privileged-pods
  # Only applies within this namespace
  namespace: production
spec:
  # Wasm module URI from Kubewarden policy hub
  module: registry://ghcr.io/kubewarden/policies/pod-privileged:v1.0.8

  # Kubernetes resources this policy watches
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations:
        # Evaluate CREATE and UPDATE operations
        - CREATE
        - UPDATE

  # false = validation policy (doesn't modify resources)
  mutating: false

  # Fail closed if policy evaluation errors occur
  failurePolicy: Fail

  # Policy is active (not just monitoring)
  mode: protect
```

```bash
# Apply the policy
kubectl apply -f no-privileged-pods-policy.yaml

# Check the policy status
kubectl get admissionpolicy no-privileged-pods -n production

# Wait for the policy to become active
kubectl wait admissionpolicy no-privileged-pods \
  -n production \
  --for=condition=PolicyActive \
  --timeout=60s
```

### Testing the Policy

```bash
# Try to create a privileged pod (should be DENIED)
kubectl apply -n production -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: privileged-test
spec:
  containers:
    - name: test
      image: nginx:latest
      securityContext:
        privileged: true  # This should be blocked!
EOF

# Expected output: Error from server: ...
# admission webhook denied the request

# Try to create a non-privileged pod (should SUCCEED)
kubectl apply -n production -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: normal-test
spec:
  containers:
    - name: test
      image: nginx:latest
EOF
```

## Creating Policies with Custom Settings

### Requiring Specific Labels

```yaml
# require-labels-policy.yaml
apiVersion: policies.kubewarden.io/v1
kind: AdmissionPolicy
metadata:
  name: require-team-label
  namespace: production
spec:
  module: registry://ghcr.io/kubewarden/policies/safe-labels:v1.0.7

  settings:
    # Policy-specific configuration
    mandatory_labels:
      - team
      - cost-center
      - app

  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations:
        - CREATE
  mutating: false
  failurePolicy: Fail
  mode: protect
```

### Enforcing Resource Requests and Limits

```yaml
# resource-limits-policy.yaml
apiVersion: policies.kubewarden.io/v1
kind: AdmissionPolicy
metadata:
  name: require-resource-limits
  namespace: development
spec:
  module: registry://ghcr.io/kubewarden/policies/container-resources:v1.3.1

  settings:
    # Require both requests and limits for CPU and memory
    memory:
      ignoreValues: true
    cpu:
      ignoreValues: true

  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations:
        - CREATE
        - UPDATE
  mutating: false
  failurePolicy: Fail
  mode: protect
```

## Using Monitor Mode for Non-Disruptive Testing

Before enforcing a policy, run it in monitor mode to see what would be blocked:

```yaml
# policy-monitor-mode.yaml
apiVersion: policies.kubewarden.io/v1
kind: AdmissionPolicy
metadata:
  name: monitor-privileged-pods
  namespace: production
spec:
  module: registry://ghcr.io/kubewarden/policies/pod-privileged:v1.0.8

  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations:
        - CREATE
        - UPDATE
  mutating: false

  # Monitor mode: policy evaluates but doesn't block
  # Violations are logged but requests are allowed
  mode: monitor
```

```bash
# Apply in monitor mode first
kubectl apply -f policy-monitor-mode.yaml

# Try creating a resource that would normally be rejected
kubectl apply -n production -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: monitor-privileged-test
spec:
  containers:
    - name: test
      image: nginx:latest
      securityContext:
        privileged: true
EOF

# If you have access to the Kubewarden namespace, inspect the policy-server logs
kubectl logs -n kubewarden deploy/policy-server-default \
  --since=5m | grep 'policy evaluation (monitor mode)'
```

## Switching Policy Mode

```bash
# Switch from monitor to protect mode
kubectl patch admissionpolicy monitor-privileged-pods \
  -n production \
  --type=merge \
  -p '{"spec":{"mode":"protect"}}'

# To go back to monitor mode, delete and recreate the policy with mode: monitor
kubectl delete admissionpolicy monitor-privileged-pods -n production
kubectl apply -f policy-monitor-mode.yaml
```

## Checking Policy Status

```bash
# List all admission policies in a namespace
kubectl get admissionpolicies -n production

# Get detailed policy status
kubectl describe admissionpolicy no-privileged-pods -n production

# Check conditions
kubectl get admissionpolicy no-privileged-pods -n production \
  -o jsonpath='{.status.conditions}' | python3 -m json.tool
```

Policy status conditions:
- `PolicyActive`: The policy webhook has been created
- `PolicyServerConfigurationUpToDate`: The policy configuration has been rolled out to the assigned PolicyServer
- `PolicyUniquelyReachable`: Only the latest PolicyServer replica set is serving this policy

## Deleting a Policy

```bash
# Delete the admission policy
kubectl delete admissionpolicy no-privileged-pods -n production

# Verify deletion
kubectl get admissionpolicies -n production
```

## Conclusion

Kubewarden AdmissionPolicies provide namespace-scoped policy enforcement that can be delegated to namespace owners via RBAC without granting full cluster-admin privileges. By combining validation and mutation policies in monitor mode first, then switching to protect mode, you can safely roll out new policies without disrupting existing workloads. The granular namespace scoping makes AdmissionPolicies ideal for implementing team-specific security requirements while maintaining a shared cluster infrastructure.
