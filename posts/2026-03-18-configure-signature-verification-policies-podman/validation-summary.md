# Validation Summary: How to Configure Signature Verification Policies in Podman

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- containers/image signature policy
- `/etc/containers/policy.json`
- `/etc/containers/registries.d` registry signature configuration
- GPG simple signing
- Sigstore image signatures
- Bash
- JSON
- YAML

## Sources Consulted
- Podman `podman-image-trust` documentation: https://docs.podman.io/en/latest/markdown/podman-image-trust.1.html
- Upstream containers/image `containers-policy.json(5)` manual: https://raw.githubusercontent.com/containers/image/main/docs/containers-policy.json.5.md
- Upstream containers/image `containers-registries.d(5)` manual: https://raw.githubusercontent.com/containers/image/main/docs/containers-registries.d.5.md
- Red Hat Enterprise Linux container image signing documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/building_running_and_managing_containers/assembly_signing-container-images_building-running-and-managing-containers

## Issues Found
- The description and introduction implied arbitrary "tag level" policy configuration without explaining that Docker transport tag-specific scopes must be fully expanded image references. Updated the wording and specificity example to use `registry.example.com/myorg/myapp:stable`.
- The simple-signing signature storage example used `sigstore` and `sigstore-staging`. Those names are deprecated in current documentation in favor of `lookaside` and `lookaside-staging`, so the example was updated.
- The blocked-pull test used `docker.io/randomuser/image:latest`, where failure could be caused by a missing image rather than signature policy enforcement. Updated the test to pull a plausible public image from a registry not allowed by the sample policy and to check that the error output contains a policy rejection.

## Review Notes
Podman was not installed in the review workspace, so CLI behavior was checked against official Podman documentation instead of local `podman --help` output. The embedded `policy.json` examples were parsed successfully as JSON after the edits.
