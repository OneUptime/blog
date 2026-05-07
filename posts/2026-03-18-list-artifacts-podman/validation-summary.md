# Validation Summary: How to List Artifacts in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- OCI artifacts
- Shell commands and pipelines
- Go template output formatting

## Sources Consulted
- Podman artifact command documentation: https://docs.podman.io/en/latest/markdown/podman-artifact.1.html
- Podman artifact ls documentation: https://docs.podman.io/en/latest/markdown/podman-artifact-ls.1.html
- Podman artifact add documentation: https://docs.podman.io/en/latest/markdown/podman-artifact-add.1.html
- Podman artifact pull documentation: https://docs.podman.io/en/stable/markdown/podman-artifact-pull.1.html
- Podman artifact rm documentation: https://docs.podman.io/en/latest/markdown/podman-artifact-rm.1.html
- Podman v5.4.0 release notes: https://github.com/containers/podman/releases/tag/v5.4.0

## Issues Found
- The prerequisite said Podman 5.x or later, but the `podman artifact` command suite was introduced as a preview in Podman 5.4. Updated the prerequisite to Podman 5.4 or later with artifact support.
- The post said the default `podman artifact ls` table shows media type. Official documentation shows `REPOSITORY`, `TAG`, `DIGEST`, `CREATED`, and `SIZE`, but no media type column. Updated the description.
- The filtering example used `podman artifact ls localhost/myorg/app-config`, but the documented synopsis is `podman artifact ls [options]` and does not accept a repository argument. Replaced the example with `--format` piped to `grep`.
- The post showed `podman artifact ls --format json`, but the official `podman artifact ls` documentation describes `--format` as Go template output and documents `--noheading` for script-friendly table output. Replaced the JSON example with `--noheading`.
- The size-total example piped `.Size` values such as human-readable units into `bc`, which is not reliable because `.Size` includes units. Updated the examples to use `.VirtualSize` bytes and `awk` for summing.
- The script used a plain `grep -q` match for an exact artifact reference. Updated it to `grep -Fxq` so the check is fixed-string and exact-line based.

## Review Notes
The Podman artifact feature was introduced as a preview in Podman 5.4, and older 5.4 and 5.5 documentation marked it experimental. The latest documentation no longer shows the experimental warning on the top-level artifact command, but readers on older Podman 5.x releases may still see behavior or output differences.
