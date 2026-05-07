# Validation Summary: How to Manage Images with Podman Python SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman Python SDK
- Python
- Container images
- Container registries
- Dockerfile/Containerfile builds

## Sources Consulted
- Podman Python SDK ImagesManager documentation: https://podman-py.readthedocs.io/en/stable/podman.domain.images_manager.html
- Podman Python SDK Image model documentation: https://podman-py.readthedocs.io/en/stable/podman.domain.images.html
- Podman Python SDK build documentation: https://podman-py.readthedocs.io/en/stable/podman.domain.images_build.html
- Podman Python SDK client documentation: https://podman-py.readthedocs.io/en/stable/podman.client.html
- Podman image command documentation: https://docs.podman.io/en/stable/markdown/podman-image.1.html
- Podman pull command documentation: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Podman login command documentation: https://docs.podman.io/en/stable/markdown/podman-login.1.html
- Podman Python SDK 5.8.0 package source from PyPI, inspected locally for method behavior.

## Issues Found
- The filtering example used `filters={"reference": "nginx"}`, but the Podman Python SDK documents image list filters for `dangling` and `label`; image name matching is exposed through the `name` argument. Changed the example to `client.images.list(name="nginx")`.
- The streamed pull example treated stream entries as dictionaries without requesting decoded output. Added `decode=True` to match the SDK's documented stream decoding behavior.
- The build example treated build log entries as dictionaries, but the SDK returns raw JSON log lines. Added `json.loads(log)` before checking for the `stream` field.
- The in-memory Dockerfile build used `COPY` statements for files that were not included in the tar build context. Changed the Dockerfile to a self-contained example.
- The custom build-context example omitted `dockerfile="Dockerfile"`, which the current SDK requires when `custom_context=True`. Added the argument.
- The prune example claimed to remove all unused images with `client.images.prune()`, but the SDK default only removes dangling images. Changed it to `client.images.prune(all=True)`.
- The load example passed an open file object to `client.images.load()`, while the SDK documents `data` bytes or `file_path`. Changed it to `client.images.load(file_path="myapp-latest.tar")`.
- The cleanup script skipped images when `Created` was returned as a string. Updated it to parse ISO-8601 timestamps before comparing ages.

## Review Notes
The examples are syntactically valid Python after the corrections. Runtime success still depends on a running Podman service, registry access, local image availability, and valid credentials for private registry examples.
