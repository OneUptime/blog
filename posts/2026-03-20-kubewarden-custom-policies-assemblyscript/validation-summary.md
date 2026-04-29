# Validation Summary: How to Write Custom Kubewarden Policies in AssemblyScript

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Kubewarden
- Kubernetes admission control
- AssemblyScript
- WebAssembly
- `kwctl`

## Sources Consulted
- Kubewarden TypeScript/JavaScript tutorial: https://docs.kubewarden.io/tutorials/writing-policies/typescript/intro-typescript
- Kubewarden legacy TypeScript documentation noting there is no AssemblyScript SDK: https://docs.kubewarden.io/1.15/tutorials/writing-policies/typescript
- Kubewarden policy metadata reference: https://docs.kubewarden.io/tutorials/writing-policies/metadata
- Kubewarden validating policies specification: https://docs.kubewarden.io/reference/spec/validating-policies
- Kubewarden policy settings specification: https://docs.kubewarden.io/reference/spec/settings
- Kubewarden `kwctl` installation guide: https://docs.kubewarden.io/howtos/install-kwctl
- Kubewarden `kwctl` CLI documentation: https://raw.githubusercontent.com/kubewarden/kwctl/main/cli-docs.md
- npm package for `@kubewarden/policy-sdk`: https://www.npmjs.com/package/@kubewarden/policy-sdk
- Kubewarden JavaScript SDK repository: https://github.com/kubewarden/policy-sdk-js
- Kubewarden AssemblyScript example branch: https://github.com/kubewarden/pod-privileged-policy/tree/assemblyscript-implementation

## Issues Found
- The post states that Kubewarden provides an AssemblyScript SDK and instructs readers to install `@kubewarden/policy-sdk` for AssemblyScript development. Kubewarden's own documentation says there is no AssemblyScript SDK, and the published `@kubewarden/policy-sdk` package is the JavaScript/TypeScript SDK for the Javy-based workflow, not an AssemblyScript SDK. I marked the post `not-technically-relevant` instead of editing the README because this invalidates the article's core premise.
- The code samples import `@kubewarden/policy-sdk/assembly` and use APIs such as `ValidationRequest.fromBuffer`, `ValidationResponse.rejectSettings`, and `ValidationResponse.acceptSettings` that do not match the current official Kubewarden SDK surface. As written, the tutorial cannot compile or run successfully. I did not patch the README because correcting this would require a complete rewrite around a different implementation approach.
- The `kwctl` installation and CLI examples are outdated. Current official installation instructions use zipped release artifacts such as `kwctl-linux-x86_64.zip`, and the current `kwctl annotate` long flag is `--output-path`, not `--output`. I marked the post for removal because these are additional signs that the tutorial is not aligned with the current toolchain.
- The test request examples wrap the payload in a top-level `"request"` object, but current `kwctl run --request-path` examples and Kubewarden AssemblyScript examples use an `AdmissionRequest` JSON object as the input file, with `kwctl` constructing the outer `ValidationRequest` payload itself. This means the testing section is also incorrect as written.
- The metadata and deployment snippets mix older Kubewarden fields and conventions with current ones. For example, the current metadata reference documents `contextAwareResources` and `policyType`, while the article uses `contextAware: false` and omits `policyType`. This is another indication that the post is outdated beyond targeted repair.

## Review Notes
- Kubewarden still has an AssemblyScript example branch, but it is presented as an example in the absence of an official AssemblyScript SDK, not as a current first-class policy authoring workflow.
- A publishable replacement would need a full rewrite. The safer current direction would be a tutorial about Kubewarden's JavaScript/TypeScript support via Javy, or a clearly labeled legacy article about manual waPC-based AssemblyScript policies.
