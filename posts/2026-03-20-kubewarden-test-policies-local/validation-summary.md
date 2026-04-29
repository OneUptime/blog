# Validation Summary: How to Test Kubewarden Policies Locally

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubewarden
- `kwctl`
- Kubernetes admission requests
- `bats`
- GitHub Actions
- `jq`

## Sources Consulted
- Kubewarden docs: Installing `kwctl` - https://docs.kubewarden.io/howtos/install-kwctl
- Kubewarden docs: `kwctl` CLI reference - https://docs.kubewarden.io/reference/kwctl-cli
- Kubewarden docs: Testing for policy authors - https://docs.kubewarden.io/tutorials/testing-policies/policy-authors
- Kubewarden docs: Common tasks / testing policies - https://docs.kubewarden.io/howtos/tasks
- Kubewarden docs: Mutating policies - https://docs.kubewarden.io/explanations/mutating-policies
- Local verification against `kwctl 1.31.0`: `kwctl --help`, `kwctl run --help`, and live runs of `pod-privileged:v0.2.5`, `safe-labels:v0.1.5`, and `user-group-psp:v0.1.5`

## Issues Found
- The manual `kwctl` install command used `kwctl-linux-amd64`, which now resolves to a 404 on the latest release path. I replaced it with the current documented `kwctl-linux-x86_64.zip` installation flow and added the required `unzip` dependency.
- The opening description said `kwctl` can run any policy without a Kubernetes cluster. That is too broad for context-aware policies, so I changed the wording to avoid overstating the capability.
- Step 1's admission request JSON was missing the required `userInfo` field, which causes `kwctl run` to fail when building the Kubernetes `AdmissionRequest`. I added a minimal valid `userInfo` object.
- Step 1 referred to the retired Kubewarden Policy Hub. I updated the wording to refer to an OCI registry reference instead.
- Step 2 used incorrect `safe-labels` settings (`required_labels`) and an outdated/non-verified policy version. I replaced the example with a tested `safe-labels:v0.1.5` configuration using the policy's actual `constrained_labels` setting and added a valid request file.
- Step 2 referenced `test-pod.json`, which was never defined. I replaced it with a concrete request file created in the example.
- Step 3 used an undefined local `annotated-policy.wasm` example. I switched it to a valid remote policy URI that `kwctl run` can execute directly.
- Step 4 used a non-existent `kwctl run --validate-settings` flag. I replaced it with a real settings-validation example that fails through the policy's `validate_settings` logic when given an invalid regular expression.
- Step 5 referenced undefined generic files for a mutating policy. I replaced them with a tested `user-group-psp:v0.1.5` example, including valid settings, a valid admission request, and patch extraction via `jq` and `base64`.
- The CI example reused the broken manual install command and assumed `bats` was already available. I updated it to install `bats` and `unzip`, then install `kwctl` using the current documented release artifact.

## Review Notes
- The post now matches current `kwctl` behavior verified with `kwctl 1.31.0`.
- `kwctl run` currently expects a Kubernetes `AdmissionRequest`-shaped JSON document for these examples, not just the bare Kubernetes object.
- Mutating policy responses currently expose a JSON Patch via the `patch` and `patchType` fields, which makes the `jq | base64 -d` inspection flow valid.
- Context-aware policies can require additional setup such as `--allow-context-aware` and access to a running cluster; this post remains focused on non-context-aware local testing.
