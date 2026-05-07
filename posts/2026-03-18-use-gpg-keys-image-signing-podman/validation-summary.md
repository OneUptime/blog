# Validation Summary: How to Use GPG Keys for Image Signing in Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- GPG / GnuPG
- Container image simple signing
- `policy.json` trust policy
- `registries.d` signature storage configuration

## Sources Consulted
- Podman `podman push` documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman `podman image trust` documentation: https://docs.podman.io/en/latest/markdown/podman-image-trust.1.html
- Podman `podman image sign` documentation: https://docs.podman.io/en/v4.6.1/markdown/podman-image-sign.1.html
- `containers-policy.json(5)` from the official `containers/image` repository: https://raw.githubusercontent.com/containers/image/main/docs/containers-policy.json.5.md
- `containers-registries.d(5)` from the official `containers/image` repository: https://raw.githubusercontent.com/containers/image/main/docs/containers-registries.d.5.md
- GnuPG unattended key generation documentation: https://gnupg.org/documentation/manuals/gnupg/Unattended-GPG-key-generation.html
- GnuPG `gpg(1)` documentation: https://www.gnupg.org/documentation/manuals/gnupg24/gpg.1.html

## Issues Found
- The introduction described GPG as Podman's general built-in image-signing mechanism. I corrected that to Podman's built-in simple-signing workflow, which is the GPG-based path documented by Podman.
- The original key-generation and rotation examples used `%no-protection`. GnuPG documents that option as mainly intended for regression tests, so I replaced those examples with passphrase-protected `gpg --quick-generate-key` commands.
- The post omitted the `registries.d` configuration needed for simple-signing signatures to be read and written across hosts. Without that configuration, signatures default to local sigstore storage instead of a shared location. I added a shared lookaside example.
- The verification-host section implied that importing the public key into the local GPG keyring is required for Podman verification. Podman verification uses the exported GPG keyring file referenced by `policy.json`, so I clarified that the import step is optional and useful for local inspection only.
- The multi-key section exported keys to `/tmp` but referenced `/etc/pki/containers/...` paths in `policy.json` without installing the keys there. I updated the example to install the exported public keys into the same paths used by the policy.
- The multi-key policy example claimed to accept images signed by any of the keys, but the JSON actually mapped specific registries to specific keys and omitted the staging environment entirely. I corrected the explanation and added the missing staging registry entry.
- The revocation section generated a revocation certificate only after compromise. I changed it to generate and store the certificate in advance, then import that stored certificate if compromise happens later.

## Review Notes
- `podman push --sign-by` is documented as unavailable with the remote Podman client on Mac and Windows, except WSL2; the post now notes that limitation.
- The single-key `policy.json` example still uses `insecureAcceptAnything` as the global default. That is valid, but the upstream `containers-policy.json(5)` examples recommend a stricter `reject` default.
- The shared lookaside path `/mnt/shared-signatures` is a placeholder. In a real deployment, the signing and verification hosts need access to the same lookaside storage location or an equivalent publication workflow.
