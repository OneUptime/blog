# Validation Summary: How to Remove an Image from a Manifest List with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container images
- Manifest lists and OCI image indexes
- Multi-architecture builds
- Bash scripting
- jq

## Sources Consulted
- Podman `podman manifest remove` official documentation: https://docs.podman.io/en/v5.6.0/markdown/podman-manifest-remove.1.html
- Podman `podman manifest add` official documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-add.1.html
- Podman `podman manifest inspect` official documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-manifest-inspect.1.html
- Podman `podman manifest create` official documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-create.1.html
- Podman `podman manifest rm` official documentation: https://docs.podman.io/en/stable/markdown/podman-manifest-rm.1.html
- Podman `podman build` official documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman `podman inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html

## Issues Found
- The example digest values used non-hex placeholder characters and ellipses in places where the command was presented as executable. Replaced them with full valid SHA256-shaped digest values so the examples match the digest format accepted by `podman manifest remove`.
- The step-by-step example built local images and then added them to the manifest without an explicit local storage transport. Current Podman documentation lists `docker://` as the default source transport and `containers-storage:` for locally stored images, so the example now uses `containers-storage:localhost/myapp:<tag>` for local images.
- The ARM v7 removal example selected only `.platform.architecture == "arm"`. Because ARM variants are represented with `.platform.variant`, the filter now selects both architecture `arm` and variant `v7`.
- The replacement example rebuilt a local image and passed it to `podman manifest add` without a transport. The usage example now passes `containers-storage:localhost/myapp:arm64-v2`, and the script comment clarifies that local images should use `containers-storage:` while registry images can use `docker://`.

## Review Notes
- Podman is not installed in this review environment, so command behavior was verified against official Podman documentation rather than local `podman --help` output.
- Multi-architecture builds may require emulation support when build steps need to execute non-native binaries. The post's example does not use `RUN`, but this is a useful caveat for future expansion.
