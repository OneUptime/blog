# How to Write Custom Kubewarden Policies in Swift

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Kubernetes, Policy, Swift, WebAssembly

Description: Learn how to write custom Kubewarden admission control policies in Swift using Swift's WebAssembly support and the Kubewarden Swift SDK.

## Introduction

Swift's growing WebAssembly support makes it possible to write Kubewarden admission control policies for teams familiar with Apple's ecosystem and Swift programming language. Swift can compile code to WASI-compatible WebAssembly, and Kubewarden's Swift SDK uses the waPC guest interface expected by the Kubewarden policy server.

This guide covers setting up Swift's WebAssembly SDK and writing a functional Kubewarden policy in Swift.

## Prerequisites

- Swift 6.3.1 or later with the matching WebAssembly Swift SDK installed
- `kwctl` CLI installed
- Basic Swift programming knowledge

## Setting Up the Swift WebAssembly Environment

```bash
# macOS example from swift.org
curl -O https://download.swift.org/swiftly/darwin/swiftly.pkg
installer -pkg swiftly.pkg -target CurrentUserHomeDirectory
~/.swiftly/bin/swiftly init --quiet-shell-followup
. "${SWIFTLY_HOME_DIR:-$HOME/.swiftly}/env.sh"
hash -r

# Install and select a matching Swift toolchain
swiftly install 6.3.1
swiftly use 6.3.1

# Install the WebAssembly Swift SDK
swift sdk install https://download.swift.org/swift-6.3.1-release/wasm-sdk/swift-6.3.1-RELEASE/swift-6.3.1-RELEASE_wasm.artifactbundle.tar.gz --checksum bd47baa20771f366d8beed7970afaa30742b2210097afd15f85427226d8f4cf2

# Verify installation and note the SDK ID from the output
swift sdk list
swift --version
```

## Creating a New Swift Policy Project

```bash
# Create the policy project
mkdir my-swift-policy && cd my-swift-policy

# Initialize Swift package
swift package init --type executable --name MyKubewardenPolicy

# Update Package.swift for WebAssembly
```

## Configuring Package.swift

```swift
// Package.swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "MyKubewardenPolicy",
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
        .executableTarget(
            name: "MyKubewardenPolicy",
            dependencies: [
                "kubewardenSdk",
                "wapc",
            ],
            linkerSettings: [
                .unsafeFlags([
                    "-Xlinker",
                    "--export=__guest_call",
                ])
            ]
        ),
    ]
)
```

## Writing the Policy

```swift
import Foundation
import kubewardenSdk
import wapc

// Sources/MyKubewardenPolicy/MyKubewardenPolicy.swift
// Policy: require all Pods to have specific annotations

struct PolicySettings: Codable, Validatable {
    let requiredAnnotations: [String]

    enum CodingKeys: String, CodingKey {
        case requiredAnnotations
    }

    init(requiredAnnotations: [String] = ["team", "app-version"]) {
        self.requiredAnnotations = requiredAnnotations
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        requiredAnnotations =
            try container.decodeIfPresent([String].self, forKey: .requiredAnnotations)
            ?? ["team", "app-version"]
    }

    var debugDescription: String {
        "\(self)"
    }

    func validate() throws {
        if requiredAnnotations.isEmpty {
            throw SettingsValidationError.validationFailure(
                message: "requiredAnnotations cannot be empty"
            )
        }
    }
}

struct ValidationPayload<Resource: Codable>: Codable {
    let request: AdmissionRequest<Resource>
    let settings: PolicySettings?
}

struct AdmissionRequest<Resource: Codable>: Codable {
    let object: Resource?
}

struct Pod: Codable {
    let metadata: PodMetadata?
}

struct PodMetadata: Codable {
    let annotations: [String: String]?
}

func validate(payload: String) -> String {
    do {
        let validationRequest = try JSONDecoder().decode(
            ValidationPayload<Pod>.self,
            from: Data(payload.utf8)
        )

        let settings = validationRequest.settings ?? PolicySettings()
        let annotations = validationRequest.request.object?.metadata?.annotations ?? [:]

        for requiredAnnotation in settings.requiredAnnotations {
            if annotations[requiredAnnotation] == nil {
                return rejectRequest(
                    message: "Pod is missing required annotation: '\(requiredAnnotation)'",
                    code: 403
                )
            }
        }

        return acceptRequest()
    } catch {
        return rejectRequest(message: "Policy validation error: \(error)", code: 500)
    }
}

@_cdecl("__guest_call")
func __guest_call(operation_size: UInt, payload_size: UInt) -> Bool {
    wapc.handleCall(operation_size: operation_size, payload_size: payload_size)
}

wapc.registerFunction(name: "validate", fn: validate)
wapc.registerFunction(name: "protocol_version", fn: protocolVersionCallback)

let settingsValidator = SettingsValidator<PolicySettings>()
wapc.registerFunction(name: "validate_settings", fn: settingsValidator.validate)
```

## A More Practical Policy: Validate Security Context

```swift
// Replace the validate function and Pod model with the following

struct Pod: Codable {
    let spec: PodSpec?
}

struct PodSpec: Codable {
    let securityContext: PodSecurityContext?
    let containers: [Container]?
}

struct PodSecurityContext: Codable {
    let runAsNonRoot: Bool?
}

struct Container: Codable {
    let name: String
    let securityContext: ContainerSecurityContext?
}

struct ContainerSecurityContext: Codable {
    let privileged: Bool?
    let runAsUser: Int?
}

func validate(payload: String) -> String {
    do {
        let validationRequest = try JSONDecoder().decode(
            ValidationPayload<Pod>.self,
            from: Data(payload.utf8)
        )

        guard let pod = validationRequest.request.object else {
            return acceptRequest()
        }

        if let podSecurityContext = pod.spec?.securityContext,
           podSecurityContext.runAsNonRoot == false {
            return rejectRequest(
                message: "Pod security context explicitly allows running as root",
                code: 403
            )
        }

        for container in pod.spec?.containers ?? [] {
            if let securityContext = container.securityContext {
                if securityContext.privileged == true {
                    return rejectRequest(
                        message: "Container '\(container.name)' is privileged",
                        code: 403
                    )
                }

                if securityContext.runAsUser == 0 {
                    return rejectRequest(
                        message: "Container '\(container.name)' runs as root (UID 0)",
                        code: 403
                    )
                }
            }
        }

        return acceptRequest()
    } catch {
        return rejectRequest(message: "Policy validation error: \(error)", code: 500)
    }
}
```

## Building the Policy

```bash
# Build with the WebAssembly Swift SDK you installed from swift.org
swift build \
  --swift-sdk swift-6.3.1-RELEASE_wasm \
  -c release

# Locate the built Wasm file
find .build -name "MyKubewardenPolicy.wasm"

# Annotate with Kubewarden metadata
kwctl annotate \
  .build/wasm32-unknown-wasip1/release/MyKubewardenPolicy.wasm \
  --metadata-path metadata.yml \
  --output-path annotated-policy.wasm
```

## Policy Metadata

```yaml
# metadata.yml
rules:
  - apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
    operations:
      - CREATE
      - UPDATE
mutating: false
contextAware: false
executionMode: kubewarden-wapc
annotations:
  io.kubewarden.policy.title: require-pod-annotations
  io.kubewarden.policy.version: 0.1.0
  io.kubewarden.policy.description: Require specific annotations on all pods
  io.kubewarden.policy.author: Platform Team
  io.kubewarden.policy.severity: low
```

## Testing the Policy

```bash
# Test with kwctl
kwctl run \
  annotated-policy.wasm \
  --request-path tests/missing-annotations.json \
  --settings-json '{"requiredAnnotations": ["team", "app-version"]}'
```

## Publishing the Swift Policy

```bash
# Push to OCI registry
kwctl push \
  annotated-policy.wasm \
  registry.example.com/kubewarden/require-pod-annotations:v0.1.0
```

## Conclusion

Writing Kubewarden policies in Swift enables Apple platform developers and Swift enthusiasts to contribute to Kubernetes security governance using their preferred language. Kubewarden's Swift SDK is still more experimental than the Rust and Go SDKs, but Swift's type safety and improving Wasm support make it an interesting option for teams already invested in the Swift ecosystem.
