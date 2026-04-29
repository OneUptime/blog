# Validation Summary: How to Write Custom Kubewarden Policies in Swift

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubewarden
- Kubernetes admission control
- Swift
- WebAssembly / WASI
- waPC
- Swift Package Manager
- `kwctl`

## Sources Consulted
- Swift.org WebAssembly SDK guide: https://www.swift.org/documentation/articles/wasm-getting-started.html
- Swift.org SwiftPM CLI guide: https://www.swift.org/getting-started/cli-swiftpm/
- Kubewarden validating policies reference: https://docs.kubewarden.io/reference/spec/validating-policies
- Kubewarden `kwctl` CLI reference: https://docs.kubewarden.io/reference/kwctl-cli
- Kubewarden policy metadata reference: https://docs.kubewarden.io/tutorials/writing-policies/metadata
- Kubewarden Swift language page: https://docs.kubewarden.io/tutorials/writing-policies/swift
- Kubewarden Swift SDK repository: https://github.com/kubewarden/policy-sdk-swift
- Kubewarden Swift policy template repository: https://github.com/kubewarden/swift-policy-template
- waPC Swift guest SDK repository: https://github.com/wapc/wapc-guest-swift

## Issues Found
- The environment setup section used an outdated `swiftenv` + `SwiftWasm 5.9.0` + `carton` workflow. I replaced it with the current official Swift 6.3.1 plus WebAssembly Swift SDK installation flow from Swift.org.
- The `Package.swift` example referenced a non-existent `KubewardenSDK` product, pinned an old SDK version, and omitted the waPC guest dependency and `__guest_call` export required by Kubewarden's Swift template. I replaced it with a manifest that matches the published Kubewarden Swift SDK and waPC guest library.
- The main policy example used APIs such as `KubewardenHost.read()`, `KubewardenHost.acceptRequest()`, and `@_silgen_name("validate")` that do not exist in the published Kubewarden Swift SDK. I rewrote the example to use the real `wapc.registerFunction`, `protocol_version`, `SettingsValidator`, and `acceptRequest` / `rejectRequest` helpers exposed by `kubewardenSdk`.
- The security-context example referenced `securityContext` fields that were not defined in the sample `Pod` model. I replaced it with a consistent set of Codable types that match the example's access pattern.
- The build section used `carton build`, which is not the current carton workflow and is not how the official Kubewarden Swift template models policy entrypoints. I replaced it with a `swift build --swift-sdk ...` example and corrected the expected Wasm output path.
- The `kwctl annotate` example used `--output`, but the current CLI documents `--output-path` (or `-o`) for that command. I corrected the flag.
- The metadata example omitted the policy version annotation used by Kubewarden distribution examples. I added `io.kubewarden.policy.version: 0.1.0`.
- The conclusion overstated the maturity of the Swift path. I adjusted it to reflect that Kubewarden's Swift SDK is still more experimental than the Rust and Go SDKs.

## Review Notes
- The post is technically relevant and salvageable after correction.
- Kubewarden's published Swift resources are still based on the waPC guest model and older SDK code, while Swift's WebAssembly installation story has moved to the official Swift SDK workflow on Swift.org. The updated article reflects that split more accurately.
- I verified the commands and APIs against documentation and upstream repositories, but I did not execute a local build in this workspace because `swift` and `kwctl` are not installed here.
