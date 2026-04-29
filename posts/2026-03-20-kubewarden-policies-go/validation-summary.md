# Validation Summary: How to Write Custom Kubewarden Policies in Go - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubewarden
- Go
- TinyGo
- WebAssembly
- waPC
- kwctl
- Kubernetes admission control

## Sources Consulted
- Kubewarden tutorial: Creating a new validation policy — https://docs.kubewarden.io/tutorials/writing-policies/go/scaffold
- Kubewarden reference: Validating policies — https://docs.kubewarden.io/reference/spec/validating-policies
- Kubewarden reference: Policy settings — https://docs.kubewarden.io/reference/spec/settings
- Kubewarden tutorial: Policy metadata — https://docs.kubewarden.io/tutorials/writing-policies/metadata
- Kubewarden reference: kwctl CLI — https://docs.kubewarden.io/reference/kwctl-cli
- Kubewarden official Go policy template: `main.go` — https://raw.githubusercontent.com/kubewarden/go-policy-template/main/main.go
- Kubewarden official Go policy template: `validate.go` — https://raw.githubusercontent.com/kubewarden/go-policy-template/main/validate.go
- Kubewarden official Go policy template: `settings.go` — https://raw.githubusercontent.com/kubewarden/go-policy-template/main/settings.go
- Kubewarden official Go policy template: `metadata.yml` — https://raw.githubusercontent.com/kubewarden/go-policy-template/main/metadata.yml
- Kubewarden official Go policy template: `Makefile` — https://raw.githubusercontent.com/kubewarden/go-policy-template/main/Makefile
- Kubewarden Go SDK protocol types — https://raw.githubusercontent.com/kubewarden/policy-sdk-go/main/protocol/types.go
- Kubewarden Go SDK README — https://raw.githubusercontent.com/kubewarden/policy-sdk-go/main/README.md
- Go release history — https://go.dev/doc/devel/release
- Go download manifest — https://go.dev/dl/?mode=json&include=all
- TinyGo WASI guide — https://tinygo.org/docs/guides/webassembly/wasi/
- TinyGo 0.39.0 release — https://github.com/tinygo-org/tinygo/releases/tag/v0.39.0
- Kubernetes container image naming, tags, and digests — https://kubernetes.io/docs/concepts/containers/images/

## Issues Found
- The prerequisites were outdated for the current Kubewarden Go SDK flow. I updated Go from `1.21.5` to `1.25.9` and TinyGo from `0.31.0` to `0.39.0` because the current Kubewarden Go template and SDK target Go 1.25 and build with TinyGo 0.39.0.
- Step 1 referenced `github.com/nicholasgasior/gsfmt`, which is unrelated to Kubewarden policy scaffolding. I removed it and kept a valid module initialization flow.
- The Go sample would not compile as written. It had an unused import, accessed `validationRequest.Request.Object.Raw` even though `Object` is `json.RawMessage`, and used an empty `main()` instead of registering the `validate` and `validate_settings` waPC entrypoints. I corrected the code to match the current Kubewarden Go SDK and official template pattern.
- The validation logic was incomplete for Kubernetes Pods. The original code only checked `spec.containers`, skipped `initContainers` and `ephemeralContainers`, and used a colon test that can mistake registry ports for image tags. I updated the example to inspect all Pod container types and to distinguish tags from digests more accurately.
- The build section omitted a dependency sync step after adding direct imports used by the sample. I added `go mod tidy` before `tinygo build`.
- The deployment section referenced `metadata.yaml` without creating it and used the outdated `kwctl annotate --output` flag. I added a valid `metadata.yaml` example, switched to `--output-path`, and made the `ClusterAdmissionPolicy.spec.module` value explicit with `registry://`.
- The `kwctl run` example used a less reliable argument order. I changed it to the documented form with `--request-path` before the policy path.

## Review Notes
- The `tinygo build -target wasi -no-debug .` build command remains correct for Kubewarden Go SDK policies.
- Current `kwctl` Linux installation docs prefer zipped artifacts, but the direct `kwctl-linux-amd64` URL used by the post still resolves as of 2026-04-29, so I did not change it.
- I could not execute a local build in this workspace because `go` and `docker` are not installed here. The review was completed by cross-checking against official documentation and Kubewarden’s own template/source files.
