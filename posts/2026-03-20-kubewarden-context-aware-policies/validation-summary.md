# Validation Summary: How to Configure Kubewarden Context-Aware Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubewarden
- Kubernetes admission control
- Kubewarden Rust Policy SDK
- `kwctl`
- Kubernetes RBAC

## Sources Consulted
- Kubewarden context-aware policies reference: https://docs.kubewarden.io/reference/spec/context-aware-policies
- Kubewarden Kubernetes host capabilities reference: https://docs.kubewarden.io/reference/spec/host-capabilities/kubernetes
- Kubewarden policy metadata guide: https://docs.kubewarden.io/tutorials/writing-policies/metadata
- Kubewarden `kwctl` CLI reference: https://docs.kubewarden.io/reference/kwctl-cli
- Kubewarden policy evaluation timeout reference: https://docs.kubewarden.io/reference/policy-evaluation-timeout
- Kubewarden CRD reference: https://docs.kubewarden.io/reference/CRDs
- Kubewarden Rust SDK docs: https://docs.rs/kubewarden-policy-sdk/latest/kubewarden_policy_sdk/
- Kubewarden Rust SDK source for Kubernetes host capabilities: https://github.com/kubewarden/policy-sdk-rust/blob/main/src/host_capabilities/kubernetes.rs
- Kubewarden Rust SDK source for `ValidationRequest`: https://github.com/kubewarden/policy-sdk-rust/blob/main/src/request.rs
- Kubewarden controller context-aware policy metadata example: https://github.com/kubewarden/kubewarden-controller/blob/main/crates/context-aware-test-policy/metadata.yml

## Issues Found
- The prerequisites said context-aware policies were supported from Kubewarden `v1.0+`. The current official docs state context-aware policies are available from Kubewarden `v1.6.0`, so I corrected the minimum version.
- The post said enabling context awareness required setting `contextAware: true` in policy metadata. Current metadata and scaffolding are driven by `contextAwareResources`; the old boolean is legacy backward-compatibility only. I updated the explanation and metadata example accordingly.
- The metadata example omitted the `hostCapabilities` self-report for `kubernetes/get_resource`. I added it so the metadata matches the policy behavior and current annotation expectations.
- The Rust policy example used an outdated request parsing flow and an obsolete `get_resource` call shape. I updated it to use `ValidationRequest::new(payload)`, `GetResourceRequest`, typed `get_resource` calls, and the current request namespace field shape.
- The namespace-label helper example incorrectly treated `get_resource` as returning a JSON string. I updated it to use the current typed `Namespace` return flow from the Rust SDK.
- The `kwctl run` example used a nonexistent `--kubernetes-namespace` flag and omitted the current `--allow-context-aware` flag. I corrected the command to match the current `kwctl` CLI.
- The timeout example used an outdated annotation-based command. I replaced it with a current `kubectl patch` example that sets `spec.timeoutEvalSeconds` and `spec.timeoutSeconds`.

## Review Notes
- The legacy `contextAware` metadata boolean still exists for backward compatibility, but current Kubewarden metadata, inspection, and scaffolding treat a policy as context-aware based on `contextAwareResources`.
- `get_resource` responses are cached by default for five seconds. If a policy needs a fresh read from the Kubernetes API server, the SDK request can set `disable_cache: true`.
