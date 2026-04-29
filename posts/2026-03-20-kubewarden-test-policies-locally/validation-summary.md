# Validation Summary: How to Test Kubewarden Policies Locally - Locally

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubewarden
- `kwctl`
- Kubernetes admission requests
- GitHub Actions
- Bash

## Sources Consulted
- Kubewarden `kwctl` CLI reference: https://docs.kubewarden.io/reference/kwctl-cli
- Kubewarden install guide for `kwctl`: https://docs.kubewarden.io/howtos/install-kwctl
- Kubewarden validating policies spec: https://docs.kubewarden.io/reference/spec/validating-policies
- Kubewarden testing guide for policy authors: https://docs.kubewarden.io/tutorials/testing-policies/policy-authors
- Kubewarden `pod-privileged-policy` README: https://github.com/kubewarden/pod-privileged-policy
- Kubewarden `host-namespaces-psp-policy` README: https://github.com/kubewarden/host-namespaces-psp-policy
- Kubewarden `trusted-repos-policy` README: https://github.com/kubewarden/trusted-repos-policy
- Kubewarden `kwctl` releases: https://github.com/kubewarden/kwctl/releases/latest

## Issues Found
- The installation commands used outdated release asset names and skipped the required unzip step. I updated them to the current `kwctl` release artifacts and install flow from the official docs.
- The request payload examples were wrapped in a top-level `request` object, but `kwctl run --request-path` expects the admission request object itself. I rewrote the payloads to match current `kwctl` input format.
- The payload examples were missing the `userInfo` field. Current `kwctl` rejects those requests before policy evaluation, so I added `userInfo` to the examples.
- The post implied policy settings belong inside the request payload. In current `kwctl`, settings are provided separately via `--settings-json` or `--settings-path`, so I corrected that explanation.
- The `pod-privileged:v0.2.0` example tag no longer resolves in GHCR. I updated the examples to a live tag, `v0.3.1`.
- The `host-namespaces-psp` settings used incorrect keys (`hostPID`, `hostIPC`, `hostNetwork`). I replaced them with the documented keys: `allow_host_pid`, `allow_host_ipc`, and `allow_host_network`.
- The `--validate-settings` flag is not part of the current `kwctl run` CLI. I replaced that section with current, working examples that exercise settings validation by running `kwctl run` with valid and invalid settings.
- The batch test script parsed the output incorrectly and referenced nonexistent request files. I fixed the output match to the actual JSON response format and aligned the test cases with files defined in the post.
- The `kwctl manifest` command is no longer a valid subcommand. I replaced it with `kwctl scaffold manifest`, which is the current documented command.
- The CI example used the same outdated install flow as the local install section. I updated the GitHub Actions snippet to the current release artifact and unzip/install steps.

## Review Notes
- `kwctl scaffold admission-request` in current `kwctl` only scaffolds `CREATE` requests, so manual JSON remains necessary for the UPDATE example.
- During live verification with `kwctl` 1.31.0, policy logs were emitted on stderr while the admission response remained JSON. The fixed shell test now matches the JSON response shape accordingly.
- Several Kubewarden policy repositories now note that development has moved into the `kubewarden/policies` monorepo starting with Kubewarden 1.32.0, but the policy references used in the corrected examples remain valid today.
