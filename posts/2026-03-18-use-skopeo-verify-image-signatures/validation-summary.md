# Validation Summary: How to Use Skopeo to Verify Image Signatures

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Skopeo
- Podman
- GPG / OpenPGP
- Container image signature policies
- Container registries

## Sources Consulted
- containers/skopeo `skopeo-copy(1)`: https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md
- containers/skopeo `skopeo-inspect(1)`: https://github.com/containers/skopeo/blob/main/docs/skopeo-inspect.1.md
- containers/skopeo `skopeo-standalone-verify(1)`: https://github.com/containers/skopeo/blob/main/docs/skopeo-standalone-verify.1.md
- containers/skopeo `skopeo-manifest-digest(1)`: https://github.com/containers/skopeo/blob/main/docs/skopeo-manifest-digest.1.md
- containers/image `containers-policy.json(5)`: https://github.com/containers/image/blob/main/docs/containers-policy.json.5.md
- containers/image `containers-registries.d(5)`: https://github.com/containers/image/blob/main/docs/containers-registries.d.5.md
- containers/image `containers-signature(5)`: https://github.com/containers/image/blob/main/docs/containers-signature.5.md

## Issues Found
- The post used deprecated `sigstore` and `sigstore-staging` keys in `registries.d` and stated that signatures are stored alongside the image in the registry by default. I updated this to the current `lookaside` and `lookaside-staging` keys and corrected the default storage behavior to the documented local sigstore directories.
- The public-key export example wrote an armored key first and only created `/etc/pki/containers/` in an alternative path. I corrected the example to create the directory first and export a binary public keyring for `keyPath`, which matches the documented policy format.
- The post claimed `skopeo inspect` respects signature verification policy. I removed that claim because current `skopeo-inspect(1)` documents inspection behavior but not policy-based signature verification, while `skopeo-copy(1)` explicitly states that copy validates images against the system trust policy.
- The `skopeo standalone-verify` example used the image digest as a positional argument, which does not match the documented command syntax. I corrected the workflow to use `skopeo manifest-digest` for digest calculation and updated `standalone-verify` to the documented argument order with `--public-key-file`.
- The CI/CD verification step used `skopeo inspect`, which does not provide the documented policy-enforcing verification flow. I replaced it with a `skopeo copy` verification step, which does enforce the trust policy.

## Review Notes
- This guide covers Skopeo's GPG-based simple-signing workflow using `--sign-by`. Sigstore-based signing and verification use different flags and policy types.
