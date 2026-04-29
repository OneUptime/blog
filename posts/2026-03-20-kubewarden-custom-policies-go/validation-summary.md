# Validation Summary: How to Write Custom Kubewarden Policies in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubewarden
- Kubernetes admission control
- Go
- TinyGo
- WebAssembly / waPC
- `kwctl`

## Sources Consulted
- Kubewarden docs: Creating a new validation policy — https://docs.kubewarden.io/tutorials/writing-policies/go/scaffold
- Kubewarden docs: Policy metadata — https://docs.kubewarden.io/tutorials/writing-policies/metadata
- Kubewarden docs: Testing for policy authors — https://docs.kubewarden.io/tutorials/testing-policies/policy-authors
- Kubewarden docs: `kwctl` CLI reference — https://docs.kubewarden.io/reference/kwctl-cli
- Kubewarden docs: Custom Resource Definitions — https://docs.kubewarden.io/reference/CRDs
- Kubewarden `policy-sdk-go` source (`protocol/types.go`) — https://github.com/kubewarden/policy-sdk-go/blob/main/protocol/types.go
- Kubewarden `policy-sdk-go` module requirements (`go.mod`) — https://github.com/kubewarden/policy-sdk-go/blob/main/go.mod
- Kubewarden Go policy template — https://github.com/kubewarden/go-policy-template
- TinyGo install docs for Linux — https://tinygo.org/getting-started/install/linux/
- TinyGo install docs for macOS — https://tinygo.org/getting-started/install/macos/
- Kubernetes docs: Images — https://kubernetes.io/docs/concepts/containers/images/
- `k8s-objects` API docs for `Pod`, `Container`, and `EphemeralContainer` — https://pkg.go.dev/github.com/kubewarden/k8s-objects/api/core/v1

## Issues Found
1. **The prerequisite versions were outdated.** The post said Go 1.21+ and TinyGo 0.30+, but the current `policy-sdk-go` module requires Go 1.25 and the install commands pinned an old TinyGo release. I updated the prerequisites and installation commands to current versions documented by Kubewarden and TinyGo.

2. **The development setup referenced an obsolete or inappropriate scaffolding step.** The `go install github.com/kubewarden/kubewarden-controller/tools/create-policy@latest` command does not match the current Kubewarden Go authoring workflow. I removed it and replaced the project creation steps with explicit module initialization and dependency installation that match the code shown later in the post.

3. **The sample policy used an outdated SDK entrypoint style.** The original code used `kubewarden.Host.Read()` plus `//export validate` / `//export validate_settings`, which does not match the current Go SDK and template pattern. I rewrote the example to use `wapc.RegisterFunctions` and `validate(payload []byte) ([]byte, error)` / `validateSettings(payload []byte) ([]byte, error)`.

4. **The policy example was internally inconsistent and would not compile.** The text claimed to validate replica counts, the code actually inspected Pod image tags, the variable names referred to a Deployment while the type was `Pod`, and it treated `container.Image` as a pointer even though the TinyGo-friendly Kubernetes types expose it as a string. I made the whole example consistently enforce a “no latest tag” Pod policy and fixed the field handling to match the real types.

5. **The image-tag detection logic was too naive.** The original `containsColon` check would mis-handle images that include a registry port and no tag. I replaced it with logic that distinguishes tags from registry ports and handles digest-pinned images correctly, consistent with Kubernetes image naming behavior.

6. **The build and annotation commands were stale.** The original Makefile used `-gc=leaking` and `kwctl annotate --output`, but current Kubewarden examples and `kwctl` docs use `tinygo build -target wasi -no-debug` and `kwctl annotate --output-path`. I updated the Makefile accordingly.

7. **The metadata example used an outdated field.** The post used `contextAware: false`, while current Kubewarden metadata documentation uses `contextAwareResources`. I updated the metadata to the current format and added the current `policyType` and `backgroundAudit` fields.

8. **The `kwctl run` example used the wrong input shape.** The post built a full `ValidationRequest` wrapper and passed it via `--request-path`, but current `kwctl run` expects an admission request object and settings separately. I changed the example to generate the request with `kwctl scaffold admission-request` and to pass settings via `--settings-path`.

9. **The OCI push command was missing the required URI scheme.** `kwctl push` expects a `registry://` target. I fixed the push command to use a valid registry URI.

10. **The deployment settings were unrelated to the actual policy behavior.** The original `minReplicas` / `maxReplicas` settings did not correspond to the “no latest tag” policy. I replaced them with relevant `exemptImages` settings so the deployment example matches the code.

## Review Notes
- The tutorial is now technically consistent, but I verified it against official documentation and upstream source rather than by executing the commands locally because this workspace does not have `go`, `kwctl`, TinyGo, or Docker installed.
- Using `kwctl scaffold admission-request` is safer than hand-authoring request JSON here because the current `policy-sdk-go` protocol types contain some awkward field naming around `GroupVersionResource`.
- Kubewarden’s official recommendation still points many users at the `go-policy-template` repository. This post now shows a self-contained from-scratch setup instead, which is valid, but the template remains a good starting point for production work.
