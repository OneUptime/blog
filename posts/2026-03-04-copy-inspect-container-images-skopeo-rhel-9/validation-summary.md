# Validation Summary: How to Copy and Inspect Container Images with Skopeo on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Skopeo
- Podman
- Buildah
- Container registries
- OCI and Docker image transports
- YAML configuration for `skopeo sync`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Building, running, and managing containers": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- Skopeo upstream README: https://github.com/containers/skopeo
- Skopeo `copy` man page: https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md
- Skopeo `inspect` man page: https://github.com/containers/skopeo/blob/main/docs/skopeo-inspect.1.md
- Skopeo `list-tags` man page: https://github.com/containers/skopeo/blob/main/docs/skopeo-list-tags.1.md
- Skopeo `sync` man page: https://github.com/containers/skopeo/blob/main/docs/skopeo-sync.1.md
- Skopeo `delete` man page: https://github.com/containers/skopeo/blob/main/docs/skopeo-delete.1.md
- Skopeo `login` man page: https://github.com/containers/skopeo/blob/main/docs/skopeo-login.1.md
- Containers image transports man page: https://github.com/containers/image/blob/main/docs/containers-transports.5.md

## Issues Found
- The installation section said Skopeo comes with the `container-tools` module. RHEL 9 documentation describes `container-tools` as a meta-package and notes that stable module streams are not available on RHEL 9, so the wording was updated.
- The raw manifest example described `skopeo inspect --raw` as "OCI format." Upstream documentation describes this as raw manifest or config data, so the heading was changed to "raw image manifest."
- The deletion section described deleting a specific tag. Upstream Skopeo documentation warns that deleting by tag resolves the tag to a digest and marks the manifest for deletion, which may affect multiple tags pointing to that manifest. The heading and note were corrected.

## Review Notes
Most command examples match the current upstream Skopeo documentation. The `--password` login example is syntactically valid, but `--password-stdin` is preferable for real CI/CD use to avoid exposing credentials in shell history or process listings.
