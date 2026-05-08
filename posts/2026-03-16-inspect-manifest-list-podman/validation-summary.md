# Validation Summary: How to Inspect a Manifest List with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container image manifest lists
- OCI image indexes
- Docker Registry image manifests
- jq
- Bash
- Skopeo

## Sources Consulted
- Podman `manifest inspect` official documentation: https://docs.podman.io/en/stable/markdown/podman-manifest-inspect.1.html
- Podman `inspect` official documentation: https://docs.podman.io/en/stable/markdown/podman-inspect.1.html
- Podman `image inspect` official documentation: https://docs.podman.io/en/stable/markdown/podman-image-inspect.1.html
- Podman `pull` official documentation for digest and transport syntax: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Skopeo `inspect` man page: https://www.mankier.com/1/skopeo-inspect
- OCI Image Format specification for image index descriptors and media types: https://oci-playground.github.io/specs-latest/specs/image/v1.0.0/oci-image-spec.html
- Docker Distribution manifest v2 schema 2 specification: https://distribution.github.io/distribution/spec/manifest-v2-2/

## Issues Found
- The sample ARM64 digest used non-hex characters (`g` and `h`). Changed it to a hex-only illustrative digest prefix so it remains a valid-looking SHA-256 digest example.
- The individual platform inspection example used `podman inspect "${AMD64_DIGEST}"`, but a manifest descriptor digest alone is not a reliable local image reference. Changed the example to keep the repository context, pull the image by repository digest, and inspect it with `podman image inspect`.

## Review Notes
Podman and Skopeo are not installed in this workspace, so CLI behavior was checked against official Podman documentation and authoritative man pages instead of local `--help` output. The `size` field in manifest-list entries is correctly described as the referenced manifest descriptor size, not the full image size.
