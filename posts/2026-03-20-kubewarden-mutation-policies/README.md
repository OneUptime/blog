# How to Configure Kubewarden Mutation Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Kubernetes, Policy, Mutation, Security

Description: Learn how to write and deploy Kubewarden mutation policies that automatically modify Kubernetes resources to enforce security defaults and organizational standards.

## Introduction

Kubewarden mutation policies automatically modify Kubernetes resources as they are created or updated, injecting security settings, adding labels, or adjusting configurations without requiring users to specify every detail. Unlike validation policies that simply allow or deny requests, mutation policies transform resources to comply with organizational standards automatically.

This guide covers creating, deploying, and testing Kubewarden mutation policies.

## Prerequisites

- Kubewarden installed on your cluster
- `kubectl` access with cluster-admin permissions
- `kwctl` installed locally for testing policies outside the cluster
- Basic understanding of Kubernetes admission requests and JSON patches

## Understanding Mutation Policies

Kubewarden mutating policies accept a request and return an accepted response containing a `mutated_object`. When the policy is enforced through Kubernetes admission, Kubewarden turns that mutation into the JSON patch Kubernetes expects. The policy must support mutation, and the policy definition must set `mutating: true`.

Common mutation use cases:
- Inject security context defaults
- Add required labels and annotations
- Set default resource requests and limits
- Add sidecar containers
- Set image pull policies

## Deploying a Hub Mutation Policy

### Auto-Inject Security Context

The `user-group-psp` policy can mutate pods to require non-root execution by setting `runAsNonRoot` when it is missing:

```yaml
# mutation-security-context.yaml

apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: mutate-add-security-context
spec:
  module: registry://ghcr.io/kubewarden/policies/user-group-psp:v1.1.3

  # CRITICAL: Set mutating to true for mutation policies
  mutating: true

  settings:
    run_as_user:
      rule: MustRunAsNonRoot
    run_as_group:
      rule: RunAsAny
    supplemental_groups:
      rule: RunAsAny

  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations:
        - CREATE
        - UPDATE
  mode: protect
```

### Auto-Adjust StorageClass Policy

```yaml
# mutation-pvc-storageclass.yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: mutate-pvc-storageclass
spec:
  module: registry://ghcr.io/kubewarden/policies/persistentvolumeclaim-storageclass-policy:v1.1.1

  mutating: true

  settings:
    deniedStorageClasses:
      - fast
    fallbackStorageClass: standard

  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["persistentvolumeclaims"]
      operations: ["CREATE"]
  mode: protect
```

## Writing a Custom Mutation Policy in Rust

```rust
// src/lib.rs - Mutation policy that adds security context defaults

use guest::prelude::*;
use k8s_openapi::api::core::v1 as apicore;
use kubewarden_policy_sdk::wapc_guest as guest;

extern crate kubewarden_policy_sdk as kubewarden;
use kubewarden::{
    protocol_version_guest,
    request::ValidationRequest,
    validate_settings,
};

mod settings;
use settings::Settings;

#[no_mangle]
pub extern "C" fn wapc_init() {
    register_function("validate", validate);
    register_function("validate_settings", validate_settings::<Settings>);
    register_function("protocol_version", protocol_version_guest);
}

fn validate(payload: &[u8]) -> CallResult {
    let validation_request: ValidationRequest<Settings> = ValidationRequest::new(payload)?;

    // Parse the Pod
    let mut pod: apicore::Pod = match serde_json::from_value(validation_request.request.object) {
        Ok(pod) => pod,
        Err(_) => return kubewarden::accept_request(),
    };

    // Apply mutations to add security defaults
    let mutated = apply_security_defaults(&mut pod);

    if mutated {
        // Return a mutation response with the modified pod
        let mutated_pod_json = serde_json::to_value(pod)?;

        return kubewarden::mutate_request(mutated_pod_json);
    }

    // No mutations needed, accept as-is
    kubewarden::accept_request()
}

fn apply_security_defaults(pod: &mut apicore::Pod) -> bool {
    let mut mutated = false;

    // Ensure pod spec exists
    let spec = match pod.spec.as_mut() {
        Some(s) => s,
        None => return false,
    };

    // Apply security context defaults to each container
    for container in &mut spec.containers {
        let sec_ctx = container.security_context.get_or_insert_with(Default::default);

        // Set allowPrivilegeEscalation to false if not specified
        if sec_ctx.allow_privilege_escalation.is_none() {
            sec_ctx.allow_privilege_escalation = Some(false);
            mutated = true;
        }

        // Set readOnlyRootFilesystem to true if not specified
        if sec_ctx.read_only_root_filesystem.is_none() {
            sec_ctx.read_only_root_filesystem = Some(true);
            mutated = true;
        }

        // Set runAsNonRoot to true if not specified
        if sec_ctx.run_as_non_root.is_none() {
            sec_ctx.run_as_non_root = Some(true);
            mutated = true;
        }
    }

    mutated
}
```

## Testing Mutation Policies

```bash
# Create a simplified AdmissionRequest for a pod without security context
cat > test-mutation.json <<'EOF'
{
  "uid": "mutation-test-001",
  "kind": {"group": "", "version": "v1", "kind": "Pod"},
  "resource": {"group": "", "version": "v1", "resource": "pods"},
  "requestKind": {"group": "", "version": "v1", "kind": "Pod"},
  "requestResource": {"group": "", "version": "v1", "resource": "pods"},
  "name": "test-pod",
  "namespace": "default",
  "operation": "CREATE",
  "userInfo": {
    "username": "alice",
    "groups": ["system:authenticated"]
  },
  "object": {
    "apiVersion": "v1",
    "kind": "Pod",
    "metadata": {"name": "test-pod", "namespace": "default"},
    "spec": {
      "containers": [
        {"name": "app", "image": "nginx:1.25.0"}
      ]
    }
  },
  "oldObject": null,
  "dryRun": false,
  "options": {
    "kind": "CreateOptions",
    "apiVersion": "meta.k8s.io/v1"
  }
}
EOF

# Run the mutation policy
kwctl run --request-path test-mutation.json ./policy.wasm

# The response should contain a JSON patch
# showing the added security context fields
```

## Viewing Mutation Results

```bash
# Create a pod and check if mutations were applied
kubectl run test-pod --image=nginx:1.25.0 --dry-run=server -o json \
  | jq '.spec.containers[0].securityContext'

# Expected output (if mutation policy is active):
# {
#   "allowPrivilegeEscalation": false,
#   "readOnlyRootFilesystem": true,
#   "runAsNonRoot": true
# }
```

## Mutation vs Validation Policy Order

Kubewarden processes mutation policies before validation policies. This means:
1. Mutation policies modify the resource
2. Validation policies evaluate the (possibly mutated) resource

This allows you to:
- Mutate resources to comply with standards
- Validate that standards are met (after mutation)

```yaml
# First: mutate pods to add runAsNonRoot when needed
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: mutate-add-security-defaults
spec:
  module: registry://ghcr.io/kubewarden/policies/user-group-psp:v1.1.3
  mutating: true
  settings:
    run_as_user:
      rule: MustRunAsNonRoot
    run_as_group:
      rule: RunAsAny
    supplemental_groups:
      rule: RunAsAny
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mode: protect
---
# Then: validate the same rule without mutating
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: validate-security-context
spec:
  module: registry://ghcr.io/kubewarden/policies/user-group-psp:v1.1.3
  mutating: false
  settings:
    validate_only: true
    run_as_user:
      rule: MustRunAsNonRoot
    run_as_group:
      rule: RunAsAny
    supplemental_groups:
      rule: RunAsAny
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mode: protect
```

## Conclusion

Kubewarden mutation policies enable you to automatically enforce organizational standards without requiring every developer to know every security setting. By combining mutation policies that add defaults with validation policies that verify compliance, you create a system where the platform makes it easy to do the right thing while still catching cases where explicit insecure configurations are requested. This combination is more user-friendly than pure validation because it reduces friction for compliant workloads while maintaining security guarantees.
