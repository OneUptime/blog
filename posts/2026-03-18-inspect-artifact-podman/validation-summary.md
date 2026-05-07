# Validation Summary: How to Inspect an Artifact in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- OCI artifacts
- OCI image manifests
- Bash
- jq

## Sources Consulted
- Podman artifact command documentation: https://docs.podman.io/en/latest/markdown/podman-artifact.1.html
- Podman artifact inspect documentation: https://docs.podman.io/en/latest/markdown/podman-artifact-inspect.1.html
- Podman artifact add documentation: https://docs.podman.io/en/latest/markdown/podman-artifact-add.1.html
- Podman v5.4 artifact command documentation: https://docs.podman.io/en/v5.4.0/markdown/podman-artifact.1.html
- Podman v5.4.0 release announcement noting OCI artifact preview commands: https://lists.podman.io/archives/list/podman%40lists.podman.io/message/LEEJYSBMIWELRCX3GUANDHPHZLOGORJ3/

## Issues Found
- The post described the `podman artifact inspect` output as if `mediaType`, `config`, and `layers` were top-level JSON fields. Current Podman documentation shows the OCI manifest under the top-level `Manifest` field, with `Name` and `Digest` also at the top level. Updated the example output, field descriptions, `jq` commands, and automation snippet to use `Manifest.mediaType`, `Manifest.config`, and `Manifest.layers`.
- The "Get just the digest of the artifact" example originally extracted `.layers[0].digest`, which is the first layer digest in the documented output shape, not the artifact manifest digest. Updated it to extract `.Digest` and added a separate example for the first layer digest.
- The prerequisite said "Podman 5.x or later", but the artifact command suite was introduced in Podman 5.4 as preview functionality. Updated the prerequisite to "Podman 5.4 or later".
- The integrity section referred to "the digest field" after the post now also discusses the top-level artifact manifest digest. Updated the wording to "layer digest field" to avoid confusing the layer digest with the manifest digest.

## Review Notes
Podman artifact support has had experimental or preview status in the 5.x series, and inputs, options, and output details may continue to change across releases. The local review environment did not have Podman installed, so command behavior was verified against official Podman documentation rather than local execution.
