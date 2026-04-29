# How to Configure Kubewarden Context-Aware Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Kubernetes, Policy, Context-Aware, Security

Description: Learn how to write and deploy Kubewarden context-aware policies that can query the Kubernetes API to make decisions based on the current cluster state.

## Introduction

Standard Kubewarden policies evaluate resources in isolation - they look at the incoming request object and decide allow/deny based on that alone. Context-aware policies go further: they can query the Kubernetes API server to get additional information about the cluster state before making their decision.

This enables sophisticated policies like:
- Checking if a Service exists before creating a pod that references it
- Validating that a ConfigMap referenced by a pod actually exists
- Checking the current number of replicas of a Deployment
- Verifying namespace labels before allowing resource creation

## Prerequisites

- Kubewarden installed (v1.6+ for context-aware support)
- `kubectl` with cluster-admin access
- Kubewarden Rust or Go SDK

## Understanding Context-Aware Policy Execution

Context-aware policies require special configuration because they need additional RBAC permissions to query the Kubernetes API. This is handled by:

1. Declaring `contextAwareResources` in the policy metadata
2. Providing the same Kubernetes resources in the deployed `ClusterAdmissionPolicy`
3. Kubewarden grants that access through the PolicyServer ServiceAccount and RBAC rules

## Enabling Context-Aware in Policy Metadata

```yaml
# metadata.yml for a context-aware policy

rules:
  - apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
    operations:
      - CREATE
      - UPDATE
mutating: false
executionMode: kubewarden-wapc
# Declare which Kubernetes resources the policy will query
contextAwareResources:
  - apiVersion: "v1"
    kind: "Namespace"
  - apiVersion: "v1"
    kind: "ConfigMap"
  - apiVersion: "apps/v1"
    kind: "Deployment"
# Self-report the host capability calls used by the policy
hostCapabilities:
  - kubernetes/get_resource
```

## Writing a Context-Aware Policy in Rust

This example policy checks that a ConfigMap referenced in a pod's envFrom actually exists:

```rust
// src/lib.rs - Context-aware policy that validates ConfigMap references
use guest::prelude::*;
use kubewarden_policy_sdk::wapc_guest as guest;

extern crate kubewarden_policy_sdk as kubewarden;
use kubewarden::{
    host_capabilities::kubernetes::{get_resource, GetResourceRequest},
    protocol_version_guest,
    request::ValidationRequest,
    validate_settings,
};

use k8s_openapi::api::core::v1 as apicore;
use k8s_openapi::Resource;

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

    if validation_request.request.kind.kind != apicore::Pod::KIND {
        return kubewarden::accept_request();
    }

    let pod: apicore::Pod = match serde_json::from_value(validation_request.request.object.clone()) {
        Ok(pod) => pod,
        Err(_) => return kubewarden::accept_request(),
    };

    let namespace = validation_request.request.namespace.as_str();

    // Check each container's envFrom references
    if let Some(spec) = &pod.spec {
        for container in &spec.containers {
            if let Some(env_from_list) = &container.env_from {
                for env_from in env_from_list {
                    // Check ConfigMapRef
                    if let Some(cm_ref) = &env_from.config_map_ref {
                        let cm_name = &cm_ref.name;
                        if let Some(name) = cm_name {
                            // Query the Kubernetes API for the ConfigMap
                            if !configmap_exists(namespace, name)? {
                                return kubewarden::reject_request(
                                    Some(format!(
                                        "Container '{}' references ConfigMap '{}' \
                                         which does not exist in namespace '{}'",
                                        container.name, name, namespace
                                    )),
                                    None,
                                    None,
                                    None,
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    kubewarden::accept_request()
}

/// Query the Kubernetes API to check if a ConfigMap exists
fn configmap_exists(namespace: &str, name: &str) -> kubewarden::Result<bool> {
    // Use the Kubewarden host capability to query K8s API
    let request = GetResourceRequest {
        api_version: "v1".to_owned(),
        kind: "ConfigMap".to_owned(),
        namespace: Some(namespace.to_owned()),
        name: name.to_owned(),
        disable_cache: false,
        field_masks: None,
    };

    match get_resource::<apicore::ConfigMap>(&request) {
        Ok(_) => Ok(true),
        Err(e) => {
            // 404 means it doesn't exist, other errors are real errors
            if e.to_string().contains("404") || e.to_string().contains("not found") {
                Ok(false)
            } else {
                Err(e)
            }
        }
    }
}
```

## Deploying a Context-Aware Policy

Context-aware policies require additional configuration:

```yaml
# context-aware-policy.yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: validate-configmap-refs
spec:
  module: registry://registry.example.com/policies/validate-configmap-refs:v0.1.0

  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]

  mutating: false

  # Required: specify the Kubernetes resources the policy will query
  # Kubewarden uses this to create the necessary RBAC permissions
  contextAwareResources:
    - apiVersion: "v1"
      kind: "ConfigMap"

  mode: protect
```

```bash
# Apply the context-aware policy
kubectl apply -f context-aware-policy.yaml

# Verify the RBAC was created
kubectl get clusterrole | grep kubewarden
kubectl get clusterrolebinding | grep kubewarden

# Check policy status
kubectl describe clusteradmissionpolicy validate-configmap-refs
```

## Testing Context-Aware Policies

Context-aware policies need a running Kubernetes API to test. Use kwctl with a context:

```bash
# kwctl needs the current kubeconfig context and explicit context-aware access
kwctl run \
  --allow-context-aware \
  registry://registry.example.com/policies/validate-configmap-refs:v0.1.0 \
  --request-path test-request.json

# The policy will query the actual cluster state during testing
```

## Example: Namespace Label Validation

A context-aware policy that checks the namespace labels before allowing a resource:

```rust
// Check namespace labels before allowing pod creation
fn validate_namespace_labels(namespace: &str, settings: &Settings) -> kubewarden::Result<()> {
    // Query the namespace from the Kubernetes API
    let ns: k8s_openapi::api::core::v1::Namespace = get_resource(&GetResourceRequest {
        api_version: "v1".to_owned(),
        kind: "Namespace".to_owned(),
        namespace: None, // Namespaces are cluster-scoped
        name: namespace.to_owned(),
        disable_cache: false,
        field_masks: None,
    })?;

    // Check if required labels are present
    let labels = ns
        .metadata
        .labels
        .as_ref()
        .ok_or_else(|| kubewarden::Error::Validation("Namespace has no labels".to_owned()))?;

    for required_label in &settings.required_namespace_labels {
        if !labels.contains_key(required_label.as_str()) {
            return Err(kubewarden::Error::Validation(format!(
                "Namespace '{}' is missing required label '{}'",
                namespace, required_label
            )));
        }
    }

    Ok(())
}
```

## Performance Considerations

Context-aware policies make API calls during admission, which adds latency. Watch the PolicyServer while testing and increase the timeouts if needed:

```bash
# Inspect PolicyServer logs while testing a context-aware policy
kubectl logs -n kubewarden \
  -l app=kubewarden-policy-server-default

# Increase the policy evaluation and webhook timeouts if the defaults are too low
kubectl patch clusteradmissionpolicy validate-configmap-refs \
  --type merge \
  -p '{"spec":{"timeoutEvalSeconds":10,"timeoutSeconds":20}}'
```

## Conclusion

Context-aware policies unlock a whole class of Kubewarden use cases that are impossible with stateless validation - checking referenced resources exist, validating cross-resource relationships, and enforcing namespace-level requirements. The key is declaring the Kubernetes resources your policy needs access to, which allows Kubewarden to reconcile the appropriate RBAC permissions on the PolicyServer ServiceAccount automatically. While context-aware policies add some admission latency due to API calls, for many use cases the additional validation capability is worth the tradeoff.
