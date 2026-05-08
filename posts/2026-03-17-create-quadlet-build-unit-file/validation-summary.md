# Validation Summary: How to Create a Quadlet Build Unit File

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Quadlet
- systemd user services
- Containerfile/Dockerfile syntax
- Container image builds

## Sources Consulted
- Podman official documentation: podman-systemd.unit, Quadlet container and build units: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman official documentation: podman-build.unit: https://docs.podman.io/en/latest/markdown/podman-build.unit.5.html

## Issues Found
- The `.container` examples used `Image=localhost/myapp:latest` and `Image=localhost/frontend:latest`. That points directly at an image tag and does not reference the corresponding Quadlet `.build` unit, so it would not create the documented build dependency. Changed them to `Image=myapp.build` and `Image=frontend.build`, matching Podman's documented special case for `Image=` values ending in `.build`.
- The summary said to reference the built image in the `.container` file. Updated it to say to reference the build unit, which is the mechanism that makes systemd build before starting the container.

## Review Notes
The `[Build]` keys shown in the post, including `ImageTag=`, `File=`, `SetWorkingDirectory=`, `BuildArg=`, and `Label=`, match the current Podman Quadlet documentation. The local environment did not have `podman` installed, so command behavior was verified against official documentation rather than local CLI output.
