# Validation Summary: How to Publish Custom Kubewarden Policies to OCI Registries

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Kubewarden
- `kwctl`
- Kubernetes admission policies
- OCI registries and OCI artifacts
- WebAssembly (Wasm)
- Rust
- TinyGo / Go
- GitHub Actions
- Amazon ECR
- GitHub Container Registry (GHCR)
- Harbor
- Quay.io
- `regctl`

## Sources Consulted
- Kubewarden `kwctl` CLI reference: https://docs.kubewarden.io/reference/kwctl-cli
- Kubewarden policy metadata guide: https://docs.kubewarden.io/tutorials/writing-policies/metadata
- Kubewarden distributing policies guide: https://docs.kubewarden.io/explanations/distributing-policies
- Kubewarden OCI registry support reference: https://docs.kubewarden.io/reference/oci-registries-support
- Kubewarden common tasks guide: https://docs.kubewarden.io/howtos/tasks
- Kubewarden Rust tutorial (`wasm32-wasip1` target): https://docs.kubewarden.io/tutorials/writing-policies/rust/intro-rust
- GitHub Actions Rust workflow documentation: https://docs.github.com/en/actions/how-tos/writing-workflows/building-and-testing/building-and-testing-rust
- AWS CLI `ecr describe-repositories` reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/describe-repositories.html
- `regctl tag ls` CLI reference: https://regclient.org/cli/regctl/tag/ls/

## Issues Found
- The post listed Docker Hub as a target registry and provided Docker Hub push commands. Kubewarden's current registry support docs say Docker Hub does not currently support OCI artifacts for Kubewarden policies, so I replaced that example with Quay.io and updated the prerequisites accordingly.
- The prose described the destination broadly as any OCI-compatible registry and stated the artifact always included a settings schema. I tightened that wording to match the current Kubewarden documentation more precisely.
- The Rust build examples used the older `wasm32-wasi` target. Current Kubewarden Rust docs use `wasm32-wasip1`, so I updated both the standalone build steps and the CI example.
- The `kwctl annotate` examples used `--output`, but the current CLI reference requires `--output-path`. I updated the annotate commands in both the tutorial and the workflow.
- The verification step used `kwctl manifest`, but the current CLI exposes manifest generation as `kwctl scaffold manifest`. I updated the command to the supported subcommand form.
- The testing section used a nonexistent `kwctl run --validate-settings` flag. I replaced it with a supported `kwctl run` example that passes settings explicitly with `--settings-json`.
- The metadata example set `io.kubewarden.policy.version` to `0.1.0` while the post publishes the artifact as `v0.1.0`. Kubewarden metadata docs state the annotation should match the OCI tag, so I changed the metadata version to `v0.1.0`.
- The metadata example included `io.kubewarden.policy.rangeStart`, which is not documented in the current Kubewarden metadata guide. I removed it.
- The metadata comment referenced the retired Kubewarden Policy Hub. I removed that outdated reference.
- The ECR example claimed to create the repository only if it did not exist, but the original command always attempted creation. I changed it to check with `aws ecr describe-repositories` before calling `create-repository`.
- The GitHub Actions example downloaded `kwctl-linux-amd64`, but current installation docs publish the Linux artifact as `kwctl-linux-x86_64.zip`. I updated the install step to download and unzip the current release asset.
- The version-listing example used `kwctl pull --list-tags`, which is not part of the current `kwctl` CLI. I replaced it with `regctl tag ls`, which matches the post's existing prerequisite list.
- The YAML code fence for the metadata example closed as ````text` instead of `````, which would break Markdown rendering of subsequent sections. I corrected the fence.

## Review Notes
- The post is technically relevant and salvageable; the issues were command drift and ecosystem changes rather than conceptual problems.
- I did not execute `kwctl` locally because it is not installed in this workspace. Validation was done against current official documentation and authoritative CLI references.
