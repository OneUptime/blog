# How to Write Custom Kubewarden Policies in Swift - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Swift, Policy as Code, Kubernetes, WebAssembly, Admission Control, SUSE Rancher

Description: Learn how to write custom Kubewarden admission policies in Swift compiled to WebAssembly using SwiftWasm, enabling Swift developers to contribute to Kubernetes policy authoring.

---

Swift can compile to WebAssembly using the Swift SDKs for WebAssembly distributed on swift.org, making it possible to write Kubewarden policies using Swift's expressive syntax and strong type system.

---

## Prerequisites

```bash
# Install Swift via swiftly
curl -O https://download.swift.org/swiftly/linux/swiftly-$(uname -m).tar.gz && \
  tar zxf swiftly-$(uname -m).tar.gz && \
  ./swiftly init --quiet-shell-followup && \
  . "${SWIFTLY_HOME_DIR:-$HOME/.local/share/swiftly}/env.sh" && \
  hash -r

# Install Swift and the WebAssembly SDK
swiftly install 6.3.1
swiftly use 6.3.1
swift sdk install \
  https://download.swift.org/swift-6.3.1-release/wasm-sdk/swift-6.3.1-RELEASE/swift-6.3.1-RELEASE_wasm.artifactbundle.tar.gz \
  --checksum bd47baa20771f366d8beed7970afaa30742b2210097afd15f85427226d8f4cf2

# Verify the WebAssembly SDK is available
swift sdk list

# Install kwctl for testing
curl -LO https://github.com/kubewarden/kwctl/releases/latest/download/kwctl-linux-x86_64.zip
unzip kwctl-linux-x86_64.zip
sudo install -m 0755 kwctl-linux-x86_64 /usr/local/bin/kwctl

# Verify kwctl is available
kwctl --version
```

---

## Step 1: Set Up the Policy Project

```bash
mkdir label-enforcement-policy
cd label-enforcement-policy

# Create the Swift package layout
mkdir -p Sources/LabelEnforcementPolicy

# Add required dependencies to Package.swift
cat > Package.swift << 'EOF'
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "LabelEnforcementPolicy",
    dependencies: [
        .package(
            name: "wapc",
            url: "https://github.com/wapc/wapc-guest-swift.git",
            from: "0.0.2"
        ),
        .package(
            name: "kubewardenSdk",
            url: "https://github.com/kubewarden/policy-sdk-swift.git",
            from: "0.1.6"
        ),
    ],
    targets: [
        .target(
            name: "LabelEnforcementPolicy",
            dependencies: ["wapc", "kubewardenSdk"],
            linkerSettings: [
                .unsafeFlags([
                    "-Xlinker",
                    "--export=__guest_call",
                ])
            ]
        )
    ]
)
EOF
```

---

## Step 2: Write the Policy Logic

```swift
// Sources/LabelEnforcementPolicy/main.swift
import Foundation
import kubewardenSdk
import wapc

public struct Settings: Codable, Validatable {
    public var debugDescription: String { "Settings()" }

    public func validate() throws {
    }
}

// Policy validates that all pods have required labels
public func validate(payload: String) -> String {
    guard
        let data = payload.data(using: .utf8),
        let jsonObject = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
        let request = jsonObject["request"] as? [String: Any],
        let object = request["object"] as? [String: Any],
        let metadata = object["metadata"] as? [String: Any]
    else {
        return rejectRequest(message: "Invalid admission request payload", code: nil)
    }

    let requiredLabels = ["app", "version", "team"]
    let labels = metadata["labels"] as? [String: Any] ?? [:]
    let missingLabels = requiredLabels.filter { labels[$0] == nil }

    if !missingLabels.isEmpty {
        return rejectRequest(
            message: "Pod is missing required labels: \(missingLabels.joined(separator: ", "))",
            code: nil
        )
    }

    return acceptRequest()
}

@_cdecl("__guest_call")
func __guest_call(operation_size: UInt, payload_size: UInt) -> Bool {
    return wapc.handleCall(operation_size: operation_size, payload_size: payload_size)
}

wapc.registerFunction(name: "validate", fn: validate)
wapc.registerFunction(name: "protocol_version", fn: protocolVersionCallback)

let settingsValidator = SettingsValidator<Settings>()
wapc.registerFunction(name: "validate_settings", fn: settingsValidator.validate)
```

---

## Step 3: Build the WASM Policy

```bash
# Use the exact SDK ID reported by `swift sdk list`
SWIFT_SDK_ID="swift-6.3.1-RELEASE_wasm"

# Compile Swift to WASM
swift build \
  --swift-sdk "$SWIFT_SDK_ID" \
  -c release

# Locate the WASM binary
find .build -path '*/release/LabelEnforcementPolicy.wasm'
```

---

## Step 4: Test the Policy

```bash
POLICY_WASM="$(find .build -path '*/release/LabelEnforcementPolicy.wasm' | head -n 1)"

# Test: pod without required labels (should be rejected)
cat > pod-no-labels.json << EOF
{
  "apiVersion": "v1",
  "kind": "Pod",
  "metadata": {
    "name": "my-pod"
  },
  "spec": {
    "containers": [{"name": "app", "image": "nginx:1.24"}]
  }
}
EOF

kwctl scaffold admission-request \
  --operation CREATE \
  --object pod-no-labels.json > test-no-labels.json

kwctl run \
  "$POLICY_WASM" \
  --request-path test-no-labels.json \
  --settings-json '{}'
# Expected: rejected - missing labels

# Test: pod with all labels (should pass)
cat > pod-with-labels.json << EOF
{
  "apiVersion": "v1",
  "kind": "Pod",
  "metadata": {
    "name": "my-pod",
    "labels": {"app": "my-app", "version": "v1.0", "team": "platform"}
  },
  "spec": {
    "containers": [{"name": "app", "image": "nginx:1.24"}]
  }
}
EOF

kwctl scaffold admission-request \
  --operation CREATE \
  --object pod-with-labels.json > test-with-labels.json

kwctl run \
  "$POLICY_WASM" \
  --request-path test-with-labels.json \
  --settings-json '{}'
# Expected: accepted
```

---

## Step 5: Package and Deploy

```bash
POLICY_WASM="$(find .build -path '*/release/LabelEnforcementPolicy.wasm' | head -n 1)"

cat > metadata.yaml << EOF
rules:
  - apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
    operations: ["CREATE"]
mutating: false
contextAwareResources: []
executionMode: kubewarden-wapc
policyType: kubernetes
backgroundAudit: true
annotations:
  io.kubewarden.policy.title: Label enforcement
  io.kubewarden.policy.version: 0.1.0
  io.kubewarden.policy.description: Reject Pods that are missing required labels
  io.kubewarden.policy.author: your-name
  io.kubewarden.policy.url: https://github.com/my-org/label-enforcement
  io.kubewarden.policy.source: https://github.com/my-org/label-enforcement
  io.kubewarden.policy.license: Apache-2.0
  io.kubewarden.policy.severity: medium
  io.kubewarden.policy.category: Resource validation
  io.kubewarden.policy.ociUrl: ghcr.io/my-org/policies/label-enforcement
  io.artifacthub.displayName: Label enforcement
  io.artifacthub.resources: Pod
  io.artifacthub.keywords: kubernetes, kubewarden, swift, policy
EOF

# Annotate the policy
kwctl annotate \
  "$POLICY_WASM" \
  --metadata-path metadata.yaml \
  --output-path annotated-policy.wasm

# Push to registry
kwctl push annotated-policy.wasm \
  registry://ghcr.io/my-org/policies/label-enforcement:v0.1.0
```

---

## Best Practices

- Swift's WASM support is newer than Rust or Go - use it for teams already invested in Swift.
- The Kubewarden Swift SDK is still marked as work in progress, so prefer Rust or Go when you need the most mature Kubewarden SDKs.
- Always write unit tests in pure Swift (without WASM) before compiling - Swift tests run faster than WASM-based tests.
