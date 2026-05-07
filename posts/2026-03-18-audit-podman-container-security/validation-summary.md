# Validation Summary: How to Audit Podman Container Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux shell scripting
- Container security auditing
- Container image and runtime configuration inspection

## Sources Consulted
- Podman container inspect documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Podman ps documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman images documentation: https://docs.podman.io/en/latest/markdown/podman-images.1.html
- Podman run documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html

## Issues Found
- The post stated that privileged containers should never be used in production. Podman's official documentation says privileged containers should almost never be set because they disable isolation features, so the wording was changed to "almost never" to avoid overstating the guidance.
- The image tag audit treated any colon in the image reference as evidence of a tag, which misses untagged images from registries with ports such as `localhost:5000/repo/image`. The check now strips any digest and tests only the last path component for a tag.
- The JSON audit report example emitted one JSON object per container, which is not a single valid JSON document when multiple containers are running. The example now wraps the objects in a JSON array.

## Review Notes
- Podman is not installed in the review workspace, so commands could not be executed locally. The command options, Go template fields, and inspect JSON fields were checked against official Podman documentation instead.
- The capability-count threshold in the sample script is intentionally simplistic. It is technically valid as an example, but a production audit policy should define an allowed capability set rather than relying only on a count.
