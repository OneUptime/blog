# How to Write Custom Kubewarden Policies in Rust - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Rust, Policy as Code, Kubernetes, WebAssembly, Admission Control, SUSE Rancher

Description: Learn how to write custom Kubewarden admission control policies in Rust compiled to WebAssembly, including policy logic, settings validation, and testing with the kwctl tool.

---

Kubewarden policies are WebAssembly modules. Writing them in Rust gives you type safety, excellent performance, and access to the Kubewarden SDK for Kubernetes object inspection.

---

## Prerequisites

```bash
# Install Rust

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install cargo-generate
cargo install cargo-generate

# Add the WASI target
rustup target add wasm32-wasip1

# Install kwctl (Kubewarden CLI)
curl -LO https://github.com/kubewarden/kwctl/releases/latest/download/kwctl-linux-x86_64.zip
unzip kwctl-linux-x86_64.zip
chmod +x kwctl-linux-x86_64 && sudo mv kwctl-linux-x86_64 /usr/local/bin/kwctl
```

---

## Step 1: Create a New Policy Project

```bash
# Use the Kubewarden policy template
cargo generate --git https://github.com/kubewarden/rust-policy-template \
  --branch main \
  --name require-resource-limits

cd require-resource-limits
```

The generated project includes:
- `src/lib.rs` - policy logic
- `src/settings.rs` - configurable policy settings
- `metadata.yml` - policy metadata

---

## Step 2: Write the Policy Logic

```rust
// src/lib.rs
use lazy_static::lazy_static;
use guest::prelude::*;
use kubewarden_policy_sdk::wapc_guest as guest;
use k8s_openapi::api::core::v1 as apicore;
use k8s_openapi::Resource;
extern crate kubewarden_policy_sdk as kubewarden;
use kubewarden::{logging, protocol_version_guest, request::ValidationRequest, validate_settings};
use slog::{info, o, warn, Logger};

mod settings;
use settings::Settings;

lazy_static! {
    static ref LOG_DRAIN: Logger = Logger::root(
        logging::KubewardenDrain::new(),
        o!("policy" => "require-resource-limits")
    );
}

#[no_mangle]
pub extern "C" fn wapc_init() {
    register_function("validate", validate);
    register_function("validate_settings", validate_settings::<Settings>);
    register_function("protocol_version", protocol_version_guest);
}

fn validate(payload: &[u8]) -> CallResult {
    let validation_request: ValidationRequest<Settings> = ValidationRequest::new(payload)?;

    info!(LOG_DRAIN, "starting validation");
    if validation_request.request.kind.kind != apicore::Pod::KIND {
        warn!(LOG_DRAIN, "Policy validates Pods only. Accepting resource"; "kind" => &validation_request.request.kind.kind);
        return kubewarden::accept_request();
    }

    match serde_json::from_value::<apicore::Pod>(validation_request.request.object) {
        Ok(pod) => {
            for container in pod.spec.unwrap_or_default().containers {
                let resources = container.resources.unwrap_or_default();
                let limits = resources.limits.unwrap_or_default();

                if !limits.contains_key("cpu") {
                    return kubewarden::reject_request(
                        Some(format!("Container '{}' must define a CPU limit", container.name)),
                        None,
                        None,
                        None,
                    );
                }

                if !limits.contains_key("memory") {
                    return kubewarden::reject_request(
                        Some(format!(
                            "Container '{}' must define a memory limit",
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
        Err(_) => {
            warn!(LOG_DRAIN, "cannot unmarshal resource: this policy does not know how to evaluate this resource; accept it");
            kubewarden::accept_request()
        }
    }
}
```

---

## Step 3: Build the WASM Policy

```bash
# Build the policy as a WASM module
cargo build --target wasm32-wasip1 --release

# The WASM file is at:
ls target/wasm32-wasip1/release/require_resource_limits.wasm
```

---

## Step 4: Test the Policy Locally

```bash
# Create a test request for a pod without limits
cat > test-pod-no-limits.json << EOF
{
  "uid": "test-123",
  "kind": {"group":"","version":"v1","kind":"Pod"},
  "resource": {"group":"","version":"v1","resource":"pods"},
  "requestKind": {"group":"","version":"v1","kind":"Pod"},
  "requestResource": {"group":"","version":"v1","resource":"pods"},
  "name": "app",
  "namespace": "default",
  "operation": "CREATE",
  "userInfo": {
    "username": "alice",
    "groups": ["system:authenticated"]
  },
  "object": {
    "apiVersion": "v1",
    "kind": "Pod",
    "metadata": {"name": "app"},
    "spec": {
      "containers": [{"name": "app", "image": "nginx"}]
    }
  }
}
EOF

# Run the policy against the test request
kwctl run \
  -e kubewarden \
  --request-path test-pod-no-limits.json \
  target/wasm32-wasip1/release/require_resource_limits.wasm

# Expected: policy should REJECT (no limits defined)
```

---

## Step 5: Annotate and Push the Policy

```bash
# Annotate the WASM file with metadata
kwctl annotate \
  target/wasm32-wasip1/release/require_resource_limits.wasm \
  --metadata-path metadata.yml \
  --output-path annotated-policy.wasm

# Push to an OCI registry
kwctl push \
  annotated-policy.wasm \
  registry://ghcr.io/my-org/require-resource-limits:v0.1.0
```

---

## Best Practices

- Write unit tests in Rust for your policy logic using the Kubewarden test helpers.
- Keep policies focused on one concern - smaller policies are easier to understand and test.
- Use `settings.rs` to make policies configurable rather than hardcoding values.
- Run `kwctl inspect <policy>` to verify the policy metadata before deploying to production.
