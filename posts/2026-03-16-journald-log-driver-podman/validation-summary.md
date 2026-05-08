# Validation Summary: How to Use the journald Log Driver with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman logging drivers
- systemd journald
- journalctl
- containers.conf
- Compose logging configuration

## Sources Consulted
- Podman run documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- Podman logs documentation: https://docs.podman.io/en/v5.3.2/markdown/podman-logs.1.html
- Podman container inspect documentation: https://github.com/containers/podman/blob/main/docs/source/markdown/podman-container-inspect.1.md.in
- Podman log option documentation: https://github.com/containers/podman/blob/main/docs/source/markdown/options/log-opt.md
- containers.conf documentation: https://github.com/containers/common/blob/main/docs/containers.conf.5.md
- conmon journald logging implementation: https://github.com/containers/conmon/blob/main/src/ctr_logging.c
- systemd journalctl documentation: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd journald.conf documentation: https://www.freedesktop.org/software/systemd/man/latest/journald.conf.html
- Compose specification logging documentation: https://github.com/compose-spec/compose-spec/blob/master/05-services.md#logging

## Issues Found
- The post described `IMAGE_NAME` as automatic Podman journald metadata and showed `journalctl IMAGE_NAME=...`. Podman's conmon journald implementation emits container ID, full container ID, container name, optional container tag, and configured custom labels, but not an automatic `IMAGE_NAME` field. Removed the image-name claim and query example.
- The post queried `CONTAINER_ID` with the full ID from `podman inspect`. Podman writes `CONTAINER_ID` as a truncated ID and `CONTAINER_ID_FULL` as the full ID. Updated the query to use `CONTAINER_ID_FULL` and corrected the metadata description.
- The custom tag example set the tag to `{{.Name}}/{{.ImageName}}` but queried `CONTAINER_TAG=api`, which would not match the generated tag value. Updated the example tag to `api` so the query works as written.
- The `_TRANSPORT=stdout` example was described as showing only container-related entries. That match can include other stdout journal entries, so the comment now says it shows stdout transport entries including container output.

## Review Notes
Podman also supports `--log-opt label="FIELD={{.Template}}"` with the journald driver for adding custom journal fields. That could be used in a future expansion if the post wants image-name filtering.
