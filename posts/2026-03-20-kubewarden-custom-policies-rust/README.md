# How to Write Custom Kubewarden Policies in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Kubernetes, Policy, Rust, WebAssembly

Description: A comprehensive guide to writing custom Kubewarden admission control policies in Rust, including scaffolding, request handling, testing, and publishing.

## Introduction

Rust is a popular language for writing Kubewarden policies due to its excellent WebAssembly support, performance characteristics, and memory safety guarantees. Kubewarden provides a Rust SDK that simplifies the boilerplate and lets you focus on your policy logic.

This guide walks through creating a complete Rust-based Kubewarden policy from scratch.

## Prerequisites

- Rust toolchain (rustup, cargo) installed
- WebAssembly target: `wasm32-wasip1`
- `kwctl` CLI tool installed
- Docker (optional, for building)
- Basic Rust programming knowledge

## Setting Up the Development Environment

```bash
# Install Rust

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Add WebAssembly target
rustup target add wasm32-wasip1

# Install kwctl (Kubewarden CLI) on Linux x86_64
# https://docs.kubewarden.io/howtos/install-kwctl
curl -LO https://github.com/kubewarden/kwctl/releases/latest/download/kwctl-linux-x86_64.zip
unzip kwctl-linux-x86_64.zip
chmod +x kwctl-linux-x86_64
sudo mv kwctl-linux-x86_64 /usr/local/bin/kwctl

# Install the policy scaffold tool
cargo install cargo-generate
```

## Creating a New Policy Project

```bash
# Generate a new policy from template
cargo generate \
  --git https://github.com/kubewarden/rust-policy-template \
  --branch main \
  --name my-custom-policy

cd my-custom-policy
```

The generated project structure:

```text
my-custom-policy/
├── Cargo.toml          # Rust dependencies
├── Makefile           # Build and test targets
├── metadata.yml       # Policy metadata
├── src/
│   ├── lib.rs         # Main policy code
│   └── settings.rs    # Policy settings validation
└── test_data/
    ├── ingress_creation.json
    ├── pod_creation.json
    └── pod_creation_invalid_name.json
```

## Writing the Policy Logic

### Understanding the Entry Point

```rust
// src/lib.rs - Main policy file
use guest::prelude::*;
use kubewarden_policy_sdk::wapc_guest as guest;

extern crate kubewarden_policy_sdk as kubewarden;

use kubewarden::{protocol_version_guest, validate_settings};

mod settings;
use settings::Settings;

#[no_mangle]
pub extern "C" fn wapc_init() {
    register_function("validate", validate);
    register_function("validate_settings", validate_settings::<Settings>);
    register_function("protocol_version", protocol_version_guest);
}

// Kubewarden calls the function registered as "validate"
fn validate(payload: &[u8]) -> CallResult {
    kubewarden::accept_request()
}
```

### Writing a Custom Policy: Block Images with "latest" Tag

```rust
// src/lib.rs - Complete policy to block "latest" image tags
use guest::prelude::*;
use kubewarden_policy_sdk::wapc_guest as guest;

use k8s_openapi::api::core::v1 as apicore;
use k8s_openapi::Resource;

extern crate kubewarden_policy_sdk as kubewarden;

use kubewarden::{protocol_version_guest, request::ValidationRequest, validate_settings};

mod settings;
use settings::Settings;

#[no_mangle]
pub extern "C" fn wapc_init() {
    register_function("validate", validate);
    register_function("validate_settings", validate_settings::<Settings>);
    register_function("protocol_version", protocol_version_guest);
}

fn validate(payload: &[u8]) -> CallResult {
    // Parse the incoming validation request
    let validation_request: ValidationRequest<Settings> = ValidationRequest::new(payload)?;

    if validation_request.request.kind.kind != apicore::Pod::KIND {
        return kubewarden::accept_request();
    }

    // Extract the Pod object from the request
    let pod = match serde_json::from_value::<apicore::Pod>(
        validation_request.request.object.clone()
    ) {
        Ok(pod) => pod,
        Err(_) => return kubewarden::accept_request(),
    };

    if validation_request
        .settings
        .allowed_namespaces
        .iter()
        .any(|ns| ns == &validation_request.request.namespace)
    {
        return kubewarden::accept_request();
    }

    // Check containers and init containers for "latest" tag
    let spec = match pod.spec {
        Some(spec) => spec,
        None => return kubewarden::accept_request(),
    };

    let mut containers = spec.containers;
    containers.extend(spec.init_containers.unwrap_or_default());

    for container in containers {
        if is_using_latest_tag(&container.image) {
            return kubewarden::reject_request(
                Some(format!(
                    "Container '{}' uses the 'latest' tag. Specify an explicit version tag instead.",
                    container.name
                )),
                None,
                None,
                None,
            );
        }
    }

    kubewarden::accept_request()
}

fn is_using_latest_tag(image: &Option<String>) -> bool {
    let Some(img) = image.as_deref() else {
        return false;
    };

    if img.contains('@') {
        return false;
    }

    if img.ends_with(":latest") {
        return true;
    }

    // If the last ':' appears before the last '/', it belongs to a registry port,
    // which means the image has no explicit tag and therefore defaults to "latest".
    match (img.rfind('/'), img.rfind(':')) {
        (_, None) => true,
        (Some(slash), Some(colon)) if colon < slash => true,
        _ => false,
    }
}
```

### Defining Policy Settings

```rust
// src/settings.rs - Policy configuration
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Default, Debug)]
#[serde(default)]
pub struct Settings {
    // Allow specific namespaces to use latest (e.g., development)
    pub allowed_namespaces: Vec<String>,
}

impl kubewarden_policy_sdk::settings::Validatable for Settings {
    fn validate(&self) -> Result<(), String> {
        // Settings are always valid in this case
        Ok(())
    }
}
```

## Building the Policy

```bash
# Build the Wasm binary
make policy.wasm

# The output is at:
# policy.wasm

# Annotate the policy with metadata
kwctl annotate \
  policy.wasm \
  --metadata-path metadata.yml \
  --output-path annotated-policy.wasm
```

## Testing the Policy

### Unit Tests

```rust
// src/lib.rs - Adding tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_using_latest_tag() {
        // Should detect "latest" tag
        assert!(is_using_latest_tag(&Some("nginx:latest".to_string())));
        // Should detect missing tag (defaults to latest)
        assert!(is_using_latest_tag(&Some("nginx".to_string())));
        // Should detect missing tag even when the registry includes a port
        assert!(is_using_latest_tag(&Some("registry.example.com:5000/nginx".to_string())));
        // Should allow specific versions
        assert!(!is_using_latest_tag(&Some("nginx:1.25.0".to_string())));
        // Should allow digest-based references
        assert!(!is_using_latest_tag(&Some("nginx@sha256:abc123".to_string())));
    }
}
```

```bash
# Run unit tests
cargo test
```

### Integration Tests with kwctl

```bash
# Create a test request (invalid - uses latest)
cat > test_data/pod-with-latest.json <<EOF
{
  "uid": "test-123",
  "kind": {"group": "", "version": "v1", "kind": "Pod"},
  "resource": {"group": "", "version": "v1", "resource": "pods"},
  "requestKind": {"group": "", "version": "v1", "kind": "Pod"},
  "requestResource": {"group": "", "version": "v1", "resource": "pods"},
  "name": "test-pod",
  "namespace": "default",
  "operation": "CREATE",
  "userInfo": {
    "username": "kubectl-user",
    "groups": ["system:authenticated"]
  },
  "object": {
    "apiVersion": "v1",
    "kind": "Pod",
    "metadata": {"name": "test-pod", "namespace": "default"},
    "spec": {
      "containers": [{"name": "app", "image": "nginx:latest"}]
    }
  }
}
EOF

# Test with kwctl
kwctl run \
  --request-path test_data/pod-with-latest.json \
  annotated-policy.wasm

# Expected: request rejected
```

## Publishing the Policy

```bash
# Push to an OCI registry
kwctl push \
  annotated-policy.wasm \
  registry://registry.example.com/kubewarden-policies/no-latest-tag:v0.1.0

# Verify the push
kwctl pull \
  registry://registry.example.com/kubewarden-policies/no-latest-tag:v0.1.0
```

## Deploying the Custom Policy

```yaml
# custom-policy-deployment.yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: no-latest-image-tag
spec:
  # Reference your custom policy from the OCI registry
  module: registry://registry.example.com/kubewarden-policies/no-latest-tag:v0.1.0

  settings:
    allowed_namespaces:
      - development

  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: protect
```

## Conclusion

Writing Kubewarden policies in Rust gives you the full power of a systems programming language with WebAssembly's security sandbox. The Kubewarden Rust SDK abstracts away the WebAssembly host interface complexity, letting you focus on your policy logic. With proper unit tests and kwctl integration tests, you can validate your policy's behavior before deploying it to production, ensuring reliable policy enforcement across your Kubernetes clusters.
