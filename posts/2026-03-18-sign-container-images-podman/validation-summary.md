# Validation Summary: How to Sign Container Images with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Skopeo
- containers/image simple signing
- GPG
- container registry signature storage
- containers policy and registries configuration

## Sources Consulted
- Podman `podman push` documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman `podman image trust` documentation: https://docs.podman.io/en/latest/markdown/podman-image-trust.1.html
- Podman `podman image sign` documentation: https://docs.podman.io/en/v4.3/markdown/podman-image-sign.1.html
- Skopeo `copy` documentation: https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md
- `containers-registries.d(5)` documentation: https://manpages.ubuntu.com/manpages/jammy/man5/containers-registries.d.5.html
- `containers-policy.json(5)` documentation: https://man.archlinux.org/man/containers-policy.json.5.en
- Red Hat documentation on signing and verifying container images: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/building_running_and_managing_containers/assembly_signing-container-images_building-running-and-managing-containers

## Issues Found
- The post described `podman image trust show` as viewing raw signature data. That command displays the configured image trust policy, so the section title and comments were corrected.
- The post described `skopeo inspect --raw` as inspecting signatures. That command outputs the raw image manifest, so the comment was corrected.
- The post implied that installing the public key on verification hosts was sufficient for verification. Podman verifies signatures according to `/etc/containers/policy.json`, so a `podman image trust set --signature-policy /etc/containers/policy.json --type signedBy --pubkeysfile ...` example was added.
- The summary claimed signed images ensure every image can be verified before deployment. This was narrowed to environments configured to require those signatures, which matches Podman's policy-based verification model.

## Review Notes
- Podman's `--sign-by` simple-signing option is not available with the remote Podman client on macOS and Windows except WSL2.
- Modern Podman also supports Sigstore signing options, but the post is specifically a GPG simple-signing tutorial, so no conversion to Sigstore/Cosign was made.
