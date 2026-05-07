# Validation Summary: How to Use OCI Artifacts with CI/CD Pipelines and Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- OCI artifacts
- OCI registries
- CI/CD pipelines
- GitHub Actions
- GitLab CI
- Bash
- Go
- `jq`

## Sources Consulted
- Podman artifact command overview: https://docs.podman.io/en/latest/markdown/podman-artifact.1.html
- Podman artifact add: https://docs.podman.io/en/latest/markdown/podman-artifact-add.1.html
- Podman artifact pull: https://docs.podman.io/en/stable/markdown/podman-artifact-pull.1.html
- Podman artifact push: https://docs.podman.io/en/stable/markdown/podman-artifact-push.1.html
- Podman artifact inspect: https://docs.podman.io/en/latest/markdown/podman-artifact-inspect.1.html
- Podman artifact extract: https://docs.podman.io/en/latest/markdown/podman-artifact-extract.1.html
- OCI image manifest specification: https://specs.opencontainers.org/image-spec/manifest/

## Issues Found
- The prerequisite version was too broad. The original post said Podman 5.x or later, but the `podman artifact` docs do not exist for 5.0-5.3, and `podman artifact extract` appears in 5.5 docs. I changed the prerequisite to Podman 5.5 or later and added `jq`, which is required by the validation snippets.
- The deployment example treated `podman artifact pull` as if it made files immediately available on disk. Official Podman docs state that `pull` stores the artifact locally; extraction is a separate step. I added `podman artifact extract` calls and updated the section text accordingly.
- The `jq` paths used with `podman artifact inspect` were incorrect. The inspect output nests the manifest under `.Manifest`, so the original `.layers` and `.mediaType` lookups would fail. I corrected those queries to `.Manifest.layers` and `.Manifest.mediaType`.
- The GitLab CI example tried to pull a config artifact in `deploy` that was never published in `publish`. I added the missing config artifact publish steps.
- The GitLab `deploy` job was not limited to tag pipelines even though it depended on `CI_COMMIT_TAG`. I added the matching `only: tags` constraint.
- The promotion example described the flow as retagging, but Podman artifact commands shown in official docs support local add/pull/push workflows rather than artifact retagging. The original snippet also attempted to pass a layer title from `inspect` back into `artifact add` as though it were a filesystem path, which would not work. I replaced that flow with pull, extract, re-add, and push.
- The summary section said promotion workflows retag artifacts across environments. I corrected that to re-publish validated artifacts, matching the actual supported workflow in the fixed example.

## Review Notes
- Podman artifact support matured across the 5.x line. Early 5.4.x documentation marks these commands as experimental, and `artifact extract` is documented from 5.5 onward, so the corrected post now uses 5.5+ as its practical minimum.
- The GitHub Actions example installs Podman from the runner OS repositories. The exact package version depends on the runner image at execution time, so teams should verify that the runner actually provides Podman 5.5+ before relying on artifact extraction in production pipelines.
