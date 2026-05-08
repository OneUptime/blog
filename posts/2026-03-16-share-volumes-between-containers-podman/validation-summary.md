# Validation Summary: How to Share Volumes Between Containers in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman named volumes
- Podman pods
- Container bind mounts
- PostgreSQL container storage
- Alpine Linux containers
- Nginx containers
- Fluent Bit containers

## Sources Consulted
- Podman `podman volume create` documentation: https://docs.podman.io/en/v5.5.0/markdown/podman-volume-create.1.html
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman volume option documentation: https://docs.podman.io/en/v4.4/markdown/options/volume.html
- Podman `podman pod create` documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- PostgreSQL file-system backup documentation: https://www.postgresql.org/docs/17/backup-file.html
- Fluent Bit container image documentation: https://docs.fluentbit.io/manual/installation/docker

## Issues Found
- The PostgreSQL backup example archived the data volume while the database container was still running. PostgreSQL documentation states that file-system-level backups require the database server to be shut down unless a consistent file-system snapshot or database-native backup method is used. Updated the example to stop PostgreSQL before running `tar`, create a local `./backup` directory for the bind mount, and restart PostgreSQL afterward.
- The pods section said pods share resources "including volumes." Podman pods share namespaces and can have pod-level volume mounts, but simply joining a pod does not make arbitrary container volume mounts automatically shared. Updated the wording to say containers in a pod can mount the same named volume.
- The Fluent Bit sidecar example used an unqualified `fluentbit:latest` image and invoked `fluent-bit` as the command. Updated it to use the official Fluent Bit container image registry path and pass Fluent Bit options directly to the image entrypoint.

## Review Notes
- The main named-volume examples use valid Podman `-v SOURCE:TARGET[:OPTIONS]` syntax. Podman treats non-path sources as named volumes and can auto-create missing named volumes.
- The `:ro` examples are valid for read-only volume mounts.
- Podman was not installed in the local environment, so validation used official documentation rather than local `podman --help` output.
