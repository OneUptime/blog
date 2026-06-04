# Validation Summary: How to Configure OCI Runtime Hooks for Custom Container Lifecycle Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Open Container Initiative (OCI) Runtime Specification
- OCI runtime hooks
- containerd
- runc
- Kubernetes Container Runtime Interface (CRI)
- Go
- Python
- Bash
- Trivy
- Prometheus

## Sources Consulted
- OCI Runtime Specification configuration docs: https://github.com/opencontainers/runtime-spec/blob/main/config.md
- OCI Runtime Specification lifecycle docs: https://github.com/opencontainers/runtime-spec/blob/main/runtime.md
- OCI Runtime Specification Go bindings: https://github.com/opencontainers/runtime-spec/blob/main/specs-go/config.go
- containerd CRI configuration docs: https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- containerd runc options protobuf: https://github.com/containerd/containerd/blob/main/api/types/runc/options/oci.proto
- Kubernetes CRI API protobuf: https://github.com/kubernetes/cri-api/blob/master/pkg/apis/runtime/v1/api.proto
- Trivy report type definitions: https://github.com/aquasecurity/trivy/blob/main/pkg/types/report.go
- CRI-O hook configuration reference, for comparison with runtimes that support hook injection: https://github.com/cri-o/cri-o/blob/main/docs/crio.conf.5.md

## Issues Found
- The post showed a containerd `ConfigPath` setting under runc options as a hooks configuration file. containerd's runc options do not include `ConfigPath`, and OCI hooks are configured in the OCI bundle `config.json`. I replaced the invalid containerd configuration with an OCI runtime configuration example and clarified that Kubernetes/containerd needs a higher-level integration or custom runtime wrapper to inject hooks.
- The post treated `prestart` hooks as the primary current hook type. The OCI spec marks `prestart` as deprecated in favor of `createRuntime`, `createContainer`, and `startContainer`. I updated the lifecycle explanation and main example to use `createRuntime`.
- The hook namespace explanation said hooks execute in the runtime namespace generally. That is only true for `prestart`, `createRuntime`, `poststart`, and `poststop`; `createContainer` and `startContainer` execute in the container namespace. I corrected the explanation.
- The Go CreateRuntime example imported an unused package and referenced missing helper functions, so it would not compile. I added `readContainerSpec`, `isCapabilityDropped`, and `containsCapability`, removed the unused import, and updated the success message.
- The Python poststart example labeled the OCI root filesystem path as the image and referenced a non-standard `created` field in OCI `config.json`. I changed the payload to use `rootfs_path` and annotations.
- The Trivy security scan example ignored JSON decode/read errors, referenced an undefined `readSpec` helper, and modeled Trivy JSON output incorrectly. I added error handling, a `readSpec` helper, and corrected the Trivy `Results[].Vulnerabilities[]` parsing.
- The Prometheus `histogram_quantile` rule used raw bucket rates without aggregation by `le`. I changed it to aggregate with `sum by (le, hook_type)`.
- The troubleshooting command still referenced the old prestart hook binary. I updated it to the corrected CreateRuntime hook binary.

## Review Notes
The corrected examples are still illustrative. In Kubernetes, image reference annotations available inside the OCI spec depend on the runtime integration, so production hook-based image scanning should ensure the needed image reference is injected reliably before relying on it.
