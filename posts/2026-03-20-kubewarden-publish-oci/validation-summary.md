# Validation Summary: How to Publish Kubewarden Policies to an OCI Registry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubewarden
- `kwctl`
- OCI registries
- WebAssembly (Wasm)
- Kubernetes
- Sigstore Cosign
- Rust
- TinyGo
- GitHub Actions

## Sources Consulted
- Kubewarden `kwctl` CLI reference: https://docs.kubewarden.io/reference/kwctl-cli
- Kubewarden policy metadata reference: https://docs.kubewarden.io/tutorials/writing-policies/metadata
- Kubewarden policy distribution guide: https://docs.kubewarden.io/explanations/distributing-policies
- Kubewarden CRD reference: https://docs.kubewarden.io/reference/CRDs
- Kubewarden secure supply chain guide: https://docs.kubewarden.io/howtos/security-hardening/secure-supply-chain
- Sigstore Cosign signing with self-managed keys: https://docs.sigstore.dev/cosign/key_management/signing_with_self-managed_keys/
- Sigstore Cosign signing containers: https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Rust target documentation for `wasm32-wasip1`: https://doc.rust-lang.org/stable/rustc/platform-support/wasm32-wasip1.html
- Rust release notes documenting removal of `wasm32-wasi`: https://doc.rust-lang.org/stable/releases.html
- TinyGo WASI guide: https://tinygo.org/docs/guides/webassembly/wasi/
- Kubewarden Go raw policy tutorial: https://docs.kubewarden.io/tutorials/writing-policies/go/raw-policies

## Issues Found
- The Rust build example used `wasm32-wasi`, which has been removed from current Rust toolchains in favor of `wasm32-wasip1`. I updated both the `cargo build` target and the output path to the current target name.
- The `metadata.yaml` example omitted `executionMode`. Kubewarden policy metadata includes the execution mode, and `kubewarden-wapc` is the correct mode for the Rust/TinyGo-style policy flow shown in the post. I added `executionMode: kubewarden-wapc`.
- The `kwctl annotate` examples used `--output`, but the current CLI flag is `--output-path`. I corrected this in both the main tutorial and the GitHub Actions snippet.
- The verification example used `kwctl verify --github-owner my-org` even though the earlier signing example used a local Cosign key pair. That verification mode is for GitHub Actions keyless signatures, not key-based signatures. I changed the command to `kwctl verify --verification-key cosign.pub ...` so it matches the signing flow shown in the post.
- The Step 7 pull comment said the `kwctl pull` command both pulled and verified the policy. `kwctl pull` only performs signature verification when verification options are supplied. I corrected the comment so it accurately describes the command.
- The CI example signed with `env://COSIGN_PRIVATE_KEY` but did not provide `COSIGN_PASSWORD`, even though `cosign generate-key-pair` creates a password-protected private key by default. I added `COSIGN_PASSWORD` to the workflow environment.

## Review Notes
- `spec.module` in the `ClusterAdmissionPolicy` example is technically valid without the `registry://` prefix because Kubewarden defaults a missing prefix to `registry://`, but using the explicit prefix would make the source type clearer.
- The registry push examples use tag references. This is valid, but signing and deploying by immutable digest would be more reproducible in CI/CD pipelines.
