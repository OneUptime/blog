# Validation Summary: How to Add Files to an Image with Buildah and Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Buildah
- Podman
- Container images
- Containerfile COPY and ADD semantics
- .containerignore files
- Bash shell commands

## Sources Consulted
- Buildah `buildah-copy(1)` official upstream documentation: https://github.com/containers/buildah/blob/main/docs/buildah-copy.1.md
- Buildah `buildah-add(1)` official upstream documentation: https://github.com/containers/buildah/blob/main/docs/buildah-add.1.md
- Buildah `buildah-config(1)` manual documentation: https://man.archlinux.org/man/buildah-config.1.en
- Containers `.containerignore(5)` official documentation: https://github.com/containers/common/blob/main/docs/containerignore.5.md
- Podman `podman-run(1)` official documentation: https://docs.podman.io/en/v4.4/markdown/podman-run.1.html

## Issues Found
- The `buildah add` description said URL fetching was an additional feature compared with `buildah copy`. Official Buildah documentation shows both `buildah copy` and `buildah add` can copy from URLs, while `buildah add` uniquely extracts local archive files. Updated the sentence to reflect that.
- The `.containerignore` example copied `/tmp/project` as an absolute path while saying the `.containerignore` inside that directory would be respected. Buildah reads ignore files from the build context directory. Updated the example to use `--contextdir /tmp/project` and copy `.` to `/opt/project`.

## Review Notes
- Buildah and Podman were not installed in the local environment, so commands were reviewed against official upstream documentation and manual pages rather than executed locally.
- The Alpine-to-Ubuntu example correctly demonstrates copying a file from another working container, but the copied Alpine `curl` binary may not be runnable in Ubuntu without its dynamic linker and shared-library dependencies. The post only verifies that the file exists, so no correction was required.
