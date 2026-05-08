# Validation Summary: How to Commit a Container as an Image with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Containers
- Container images
- OCI and Docker image formats
- Linux package managers and shells used in examples

## Sources Consulted
- Podman `commit` official documentation: https://docs.podman.io/en/latest/markdown/podman-commit.1.html
- Podman `diff` official documentation: https://docs.podman.io/en/latest/markdown/podman-diff.1.html

## Issues Found
- The post stated that Podman pauses a running container by default during `podman commit`. Current official Podman documentation says the container and its processes are not paused by default, and `--pause=true` must be set to pause the container. Updated the explanation and examples accordingly.
- The Flask example created `/app/main.py` with only a Flask application object, so `CMD python /app/main.py` would exit instead of serving on port 5000. Updated the file creation command to include `app.run(host="0.0.0.0", port=5000)`.
- The author/message example used `--message` while relying on the default OCI image format. Podman documents that the message field is not supported in OCI format. Added `--format docker` to that example.
- The `--include-volumes` description was broad. Updated the example comment to match Podman's documented behavior: it includes volumes added with `--volume` or `--mount`.
- The `--squash` example implied a smaller image. Squashing layers can simplify layer history, but a smaller final image is not guaranteed. Updated the wording.

## Review Notes
The remaining commands and option names match the current Podman documentation. Podman was not installed in the local environment, so CLI verification used official documentation rather than local `podman --help` output.
