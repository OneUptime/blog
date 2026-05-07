# Validation Summary: How to Use Content Trust with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- containers/image signature policy
- `/etc/containers/policy.json`
- `/etc/containers/registries.d` signature source configuration
- GPG simple-signing signatures
- Red Hat signed container images

## Sources Consulted
- Podman `podman-image-trust` official documentation: https://docs.podman.io/en/latest/markdown/podman-image-trust.1.html
- `containers-policy.json(5)` manual page: https://manpages.ubuntu.com/manpages/noble/man5/containers-policy.json.5.html
- Red Hat Enterprise Linux container image signing and verification documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- Red Hat Developer article on verifying Red Hat container image signatures: https://developers.redhat.com/blog/2019/10/29/verifying-signatures-of-red-hat-container-images

## Issues Found
- The signature source example used the deprecated `sigstore` key in `/etc/containers/registries.d/*.yaml`. Updated it to `lookaside`, which is the current documented option for simple-signing detached signature storage.
- The opening claim said content trust ensures every pulled image is exactly what the publisher intended. Adjusted the wording to clarify that Podman verifies images according to configured trust policy and trusted publisher signatures.
- The summary said Podman verifies signatures before pulling or running images. Updated it to state that verification occurs when images are pulled, including pulls triggered by `podman run`.

## Review Notes
- The `signedBy`, `keyType: GPGKeys`, `keyPath`, `reject`, and `insecureAcceptAnything` policy examples match the documented `containers-policy.json` schema.
- The user-level policy path `~/.config/containers/policy.json` is valid and takes precedence when present.
- `podman image trust show --json` is documented, but Podman was not installed in this review environment, so CLI behavior was verified against official documentation rather than local `--help` output.
