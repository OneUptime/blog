# Validation Summary: How to Add an Artifact to the Podman Artifact Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- OCI artifacts
- OCI image manifests
- Container registries
- Shell commands

## Sources Consulted
- Official Podman documentation: `podman artifact` command reference, https://docs.podman.io/en/latest/markdown/podman-artifact.1.html
- Official Podman documentation: `podman artifact add` command reference, https://docs.podman.io/en/latest/markdown/podman-artifact-add.1.html
- Official Podman documentation: `podman artifact inspect` command reference, https://docs.podman.io/en/latest/markdown/podman-artifact-inspect.1.html
- Official Podman documentation: `podman artifact ls` command reference, https://docs.podman.io/en/latest/markdown/podman-artifact-ls.1.html
- Official Podman documentation: `podman artifact push` command reference, https://docs.podman.io/en/latest/markdown/podman-artifact-push.1.html
- Open Container Initiative Image Manifest Specification, https://specs.opencontainers.org/image-spec/manifest/

## Issues Found
- The post said the `localhost` prefix indicates the artifact is local only. This is not accurate: `podman artifact add` stores the artifact locally regardless of the registry-like reference used, and it remains local until pushed. Updated the explanation to describe local storage based on the command behavior rather than the reference prefix.
- The post used `podman artifact add --type` to set the media type of an added file. Podman documents `--type` as the artifact type and `--file-type` as the media type override for the artifact file. Updated the section title, explanation, command example, and summary to use `--file-type`.

## Review Notes
The local environment did not have Podman installed, so command verification was performed against the official Podman manual pages rather than local `--help` output.
