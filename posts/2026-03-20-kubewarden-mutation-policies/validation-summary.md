# Validation Summary: How to Configure Kubewarden Mutation Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubewarden
- Kubernetes admission policies and admission webhooks
- `kwctl`
- Rust
- JSON Patch / AdmissionRequest handling

## Sources Consulted
- Kubewarden mutating policy reference: https://docs.kubewarden.io/reference/spec/mutating-policies
- Kubewarden explanation of mutating policies: https://docs.kubewarden.io/explanations/mutating-policies
- Kubewarden `kwctl` CLI reference: https://docs.kubewarden.io/reference/kwctl-cli
- Kubewarden Rust build/distribution docs: https://docs.kubewarden.io/tutorials/writing-policies/rust/build-and-distribute
- Kubewarden Rust mutation policy tutorial: https://docs.kubewarden.io/1.10/writing-policies/rust/mutation-policy
- Rust SDK docs for `kubewarden-policy-sdk`: https://docs.rs/kubewarden-policy-sdk/latest/kubewarden_policy_sdk/
- Rust SDK docs for `ValidationRequest::new`: https://docs.rs/kubewarden-policy-sdk/latest/kubewarden_policy_sdk/request/struct.ValidationRequest.html
- Rust SDK docs for `mutate_request`: https://docs.rs/kubewarden-policy-sdk/latest/kubewarden_policy_sdk/fn.mutate_request.html
- Official `user-group-psp` policy repo and metadata: https://github.com/kubewarden/user-group-psp-policy
- Official `persistentvolumeclaim-storageclass-policy` repo and metadata: https://github.com/kubewarden/persistentvolumeclaim-storageclass-policy
- Official `safe-labels` policy repo: https://github.com/kubewarden/safe-labels-policy
- Kubernetes admission webhook ordering guidance: https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The post stated that Kubewarden mutation policies directly return a JSON patch. I corrected this to match the Kubewarden policy spec: policies return an accepted response with `mutated_object`, and Kubewarden converts that into the admission patch Kubernetes expects.
- The prerequisites omitted `kwctl`, even though the testing section depends on it. I added `kwctl` as a prerequisite.
- The first "hub mutation policy" example was incorrect. It referenced `pod-runtime-class` in the text, but used the `pod-privileged` module, which is a validating policy and does not add security context defaults. I replaced it with the current `user-group-psp` mutating policy and settings that actually add `runAsNonRoot` behavior.
- The second "hub mutation policy" example was incorrect. `safe-labels` is a validating policy, not a mutating one, and the `mandatory_labels` settings shape shown in the post was invalid for that policy. I replaced the example with the official `persistentvolumeclaim-storageclass-policy`, which is a real mutating policy.
- The Rust sample imported a nonexistent `mutation_response` item and used an outdated/manual request parsing pattern. I updated the snippet to use the current SDK flow with `ValidationRequest::new(...)` and `mutate_request(...)`, which matches the official docs and current SDK reference.
- The `kwctl` test request was not a valid `AdmissionRequest` or full `AdmissionReview`; it wrapped the payload in a top-level `request` object without the rest of the review envelope. I replaced it with a valid simplified `AdmissionRequest`.
- The `kwctl` command referenced `./build/mutation-policy.wasm`, which does not match the official Rust policy build docs. I changed it to `./policy.wasm`, the documented output of `make policy.wasm`.
- The policy-order example used placeholder modules that did not demonstrate a real Kubewarden mutate-then-validate workflow. I replaced them with a real `user-group-psp` example that uses mutation first and `validate_only: true` for the validating step.

## Review Notes
- The official per-policy repositories used here were archived on January 20, 2026 after Kubewarden moved policy development into the `kubewarden/policies` monorepo. The examples were updated using the current published versions available on April 29, 2026, but future maintenance should check the monorepo first.
- Kubernetes runs mutating admission before validating admission, but it does not guarantee a stable order among multiple mutating webhooks. The post's ordering section is correct for mutate-versus-validate sequencing, but future revisions could mention this caveat explicitly.
- The custom Rust example mutates `spec.containers`. If the post is expanded later, it may be worth noting that `initContainers` and `ephemeralContainers` would require additional handling if the same defaults should apply there too.
