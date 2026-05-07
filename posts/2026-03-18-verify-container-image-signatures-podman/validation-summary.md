# Validation Summary: How to Verify Container Image Signatures with Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Container image signature verification
- `policy.json` trust policy
- `registries.d` lookaside configuration
- `skopeo`
- GPG simple signing
- Red Hat container registries

## Sources Consulted
- Podman `podman push` docs: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman `podman image trust` docs: https://docs.podman.io/en/latest/markdown/podman-image-trust.1.html
- Podman `podman image inspect` docs: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- `containers-policy.json(5)` in the official containers/image repository: https://github.com/containers/image/blob/main/docs/containers-policy.json.5.md
- `containers-registries.d(5)` in the official containers/image repository: https://github.com/containers/image/blob/main/docs/containers-registries.d.5.md
- `skopeo inspect` docs in the official skopeo repository: https://github.com/containers/skopeo/blob/main/docs/skopeo-inspect.1.md
- `skopeo standalone-verify` docs in the official skopeo repository: https://github.com/containers/skopeo/blob/main/docs/skopeo-standalone-verify.1.md
- Red Hat container signature verification article: https://access.redhat.com/articles/3116561

## Issues Found
- The public-key copy command wrote `container-signer-public.gpg` into `/etc/pki/containers/`, but the later `policy.json` example referenced `/etc/pki/containers/container-signer.gpg`. I changed the copy command so the installed filename matches the configured `keyPath`.
- The `registries.d` example used `sigstore:` keys for simple-signing lookaside storage. Current upstream `containers-registries.d(5)` documents `lookaside` and `lookaside-staging`, so I updated the YAML examples to use `lookaside`.
- The signing test sequence assumed `docker.io/library/alpine:latest` was already present locally before `podman tag`. I added `podman pull docker.io/library/alpine:latest` so the example works on a clean host.
- The `skopeo inspect --raw` example was described as inspecting signatures, but it returns the raw manifest. The `skopeo standalone-verify` example also used the wrong argument shape. I changed this section to save the manifest with `inspect --raw` and then use the documented `standalone-verify` syntax with `--public-key-file`, `any`, and a local signature path placeholder.
- The Red Hat section incorrectly implied verification was pre-configured by default. Red Hat publishes signed images, but enforcement still requires trust-policy and lookaside configuration. I replaced that section with commands that configure trust for `registry.access.redhat.com` before pulling.
- The verification script test example used `docker.io/library/alpine:latest`, which is outside the tutorial’s signed-policy example. I changed it to test `localhost:5000/alpine:signed`, which matches the configured verification flow.
- The summary overstated the effect as generally preventing unsigned images from running. I narrowed it to the registries covered by the configured policy.

## Review Notes
- `containers-registries.d(5)` now documents `lookaside` / `lookaside-staging`; older `sigstore` terminology still appears in some Podman examples and command output, but it is deprecated in the upstream registries.d documentation.
- The tutorial keeps `"default": [{"type":"insecureAcceptAnything"}]`, which is acceptable for a scoped example. For stricter production enforcement, a default `reject` policy is stronger.
