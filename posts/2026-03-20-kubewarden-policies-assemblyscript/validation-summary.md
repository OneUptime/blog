# Validation Summary: How to Write Custom Kubewarden Policies in AssemblyScript - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubewarden
- AssemblyScript
- Kubernetes admission control
- WebAssembly
- waPC
- `kwctl`
- Node.js / npm

## Sources Consulted
- Kubewarden docs: Writing policies in TypeScript/JavaScript https://docs.kubewarden.io/tutorials/writing-policies/typescript/intro-typescript
- Kubewarden docs (versioned historical AssemblyScript page): https://docs.kubewarden.io/1.15/tutorials/writing-policies/typescript
- Kubewarden docs: `kwctl` CLI reference https://docs.kubewarden.io/reference/kwctl-cli
- Kubewarden docs: Installing `kwctl` https://docs.kubewarden.io/howtos/install-kwctl
- Kubewarden docs: Policy metadata https://docs.kubewarden.io/tutorials/writing-policies/metadata
- Kubewarden docs: Custom Resource Definitions https://docs.kubewarden.io/reference/CRDs
- Official Kubewarden archived AssemblyScript example branch: https://github.com/kubewarden/pod-privileged-policy/tree/assemblyscript-implementation

## Issues Found
- The post claimed Kubewarden had an AssemblyScript SDK/scaffolding flow using `@kubewarden/as-policy-template`. This is incorrect. Current Kubewarden docs explicitly state there is no official AssemblyScript SDK, and the npm package lookup for `@kubewarden/as-policy-template` returns 404. I replaced the scaffold step with the official archived Kubewarden AssemblyScript example branch that the docs point to.
- The original AssemblyScript code did not match Kubewarden's actual policy interface. It used a plain exported `validate(payload: string): string` function, the wrong `assemblyscript-json` import path, and no waPC guest registration. I replaced it with a verified `@wapc/as-guest`-based implementation that registers `validate`, `validate_settings`, and `protocol_version`, and that compiles successfully.
- The build instructions were incorrect. `npm run build` and `build/release.wasm` do not match the example project. I corrected them to `npm run asbuild` and `build/optimized.wasm`, which I verified locally.
- The `kwctl` installation instructions were outdated. The post referenced a nonexistent `kwctl-linux-amd64` asset. Current official install docs use `kwctl-linux-x86_64.zip`, followed by unzip and renaming the extracted binary to `kwctl`. I updated the commands accordingly.
- The local test request format was wrong. `kwctl run --request-path` expects an admission request object, not a fully wrapped top-level `{ "request": ... }` payload. I replaced the sample with a valid short AdmissionRequest JSON and verified the policy rejects it as described.
- The `kwctl annotate` example used the wrong long flag (`--output`). Current `kwctl` uses `--output-path`. I corrected the command and verified the annotate/run flow with the current CLI.
- The deployment snippet used an OCI reference without the explicit `registry://` prefix. Kubewarden CRD docs default missing prefixes to `registry://`, but the official docs consistently show the explicit form. I updated the manifest to the documented form.

## Review Notes
- The corrected post is technically accurate, but AssemblyScript remains an experimental / historical path for Kubewarden policy authoring. The current first-class JavaScript/TypeScript workflow in Kubewarden uses Javy plus `kubewarden-policy-sdk`, not AssemblyScript.
- The AssemblyScript reference repository used in the post is archived. That makes the tutorial still usable as a low-level example, but it should not be treated as Kubewarden's primary or most future-proof authoring path.
