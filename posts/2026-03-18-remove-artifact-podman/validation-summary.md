# Validation Summary: How to Remove an Artifact from Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- OCI artifacts
- Shell scripting
- Go template output formatting

## Sources Consulted
- Podman official documentation: `podman artifact` command overview, https://docs.podman.io/en/latest/markdown/podman-artifact.1.html
- Podman official documentation: `podman artifact add`, https://docs.podman.io/en/latest/markdown/podman-artifact-add.1.html
- Podman official documentation: `podman artifact inspect`, https://docs.podman.io/en/latest/markdown/podman-artifact-inspect.1.html
- Podman official documentation: `podman artifact ls`, https://docs.podman.io/en/latest/markdown/podman-artifact-ls.1.html
- Podman official documentation: `podman artifact rm`, https://docs.podman.io/en/latest/markdown/podman-artifact-rm.1.html
- Podman official documentation: `podman artifact rm` in Podman 5.6.2, https://docs.podman.io/en/v5.6.2/markdown/podman-artifact-rm.1.html
- GitHub author profile link, https://github.com/nawazdhandala

## Issues Found
- The prerequisite said "Podman 5.x or later", but `podman artifact` was experimental in older 5.x releases and not every 5.x installation has the same artifact command behavior. Updated the prerequisite to tell readers to verify that their installed Podman includes the `podman artifact` commands.
- The digest removal example extracted `.layers[0].digest`, which is a layer digest, while `podman artifact rm` accepts the artifact's manifest digest. Updated the example to use `podman artifact inspect --format "{{.Digest}}"` and remove that digest.
- The "remove all" example manually listed and piped artifacts into `podman artifact rm`, even though the documented command supports `podman artifact rm --all`. Updated the example and surrounding text to use the official option.
- The pattern-removal example used `xargs`, which can invoke `podman artifact rm` with no arguments on some systems when there are no matches. Replaced it with a `while read -r` loop.
- The confirmation script used regex substring matching with `grep -q`, which could match the wrong artifact name. Updated it to `grep -Fxq` for exact fixed-string matching.
- The cleanup script claimed tags were sorted by creation time but did not sort by creation time. Updated it to include `.CreatedAt` in the formatted output, sort by that value, and then remove the timestamp before deletion.

## Review Notes
The local environment did not have `podman` installed, so command behavior was verified against official Podman documentation rather than local `--help` output.
