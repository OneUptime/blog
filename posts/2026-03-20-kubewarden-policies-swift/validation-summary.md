# Validation Summary: How to Write Custom Kubewarden Policies in Swift - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubewarden
- `kwctl`
- Swift
- Swift SDKs for WebAssembly
- WebAssembly / WASI
- Kubernetes admission control

## Sources Consulted
- Swift.org install docs for Linux: https://www.swift.org/install/linux/
- Swift.org WebAssembly SDK guide: https://www.swift.org/documentation/articles/wasm-getting-started.html
- Kubewarden Swift policy docs: https://docs.kubewarden.io/1.29/tutorials/writing-policies/swift
- Kubewarden `kwctl` CLI reference: https://docs.kubewarden.io/reference/kwctl-cli
- Kubewarden policy metadata docs: https://docs.kubewarden.io/tutorials/writing-policies/metadata
- Kubewarden Swift policy template: https://github.com/kubewarden/swift-policy-template
- Kubewarden Swift SDK: https://github.com/kubewarden/policy-sdk-swift
- Kubewarden `kwctl` repository README: https://github.com/kubewarden/kwctl

## Issues Found
- The post used an outdated manual SwiftWasm tarball install. I replaced it with the current official `swiftly` + swift.org WebAssembly SDK installation flow and current SDK verification steps.
- The `kwctl` install command referenced the old direct `kwctl-linux-amd64` download. I updated it to the current official `kwctl-linux-x86_64.zip` manual install flow and added a version check.
- The Swift package manifest referenced an SDK product and API shape that do not match Kubewarden’s actual Swift SDK. I replaced it with the current `kubewardenSdk` + `wapc` dependencies and the required linker export for `__guest_call`.
- The Swift example used a nonexistent `KubewardenPolicySDK.run(validate:)` style entrypoint plus typed request/response assumptions that are not how the official Swift SDK works. I rewrote the example to use the real waPC registration flow with `validate`, `protocol_version`, and `validate_settings`.
- The test request examples were not valid `kwctl` admission-request inputs. I changed them to create Pod objects first and then generate proper admission requests with `kwctl scaffold admission-request`.
- The packaging section tried to annotate a policy without first creating policy metadata and used the outdated `kwctl annotate --output` flag. I added a minimal `metadata.yaml`, changed the flag to `--output-path`, and updated the push target to the current `registry://...` URI form.
- The maturity guidance for Swift SDK support was too generic. I aligned it with the upstream Swift SDK repository state, which is still explicitly marked as work in progress.

## Review Notes
- Kubewarden’s current docs still describe Swift policy authoring as supported, but the official Swift SDK repository is marked work in progress. The post now reflects that more accurately.
- Kubewarden’s Swift docs recommend `wasm-strip` and `wasm-opt` before production use. The post keeps that guidance in best practices, but adding the explicit optimization commands later would improve the deployment section.
- Validation was documentation- and source-based. I did not execute the Swift build locally because the current workspace does not have `swift` installed.
