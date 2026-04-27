# Validation Summary: How to Use OCI Registry Module Sources in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (OCI registry module sources)
- OCI (Open Container Initiative) registries
- ORAS (OCI Registry As Storage) CLI
- Amazon ECR
- Google Artifact Registry
- Docker Hub
- Docker / `docker login` authentication
- AWS CLI / `aws ecr get-login-password`
- `gcloud auth configure-docker`

## Sources Consulted
- OpenTofu Module Sources documentation: https://opentofu.org/docs/language/modules/sources/
- OpenTofu Module Packages in OCI Registries: https://opentofu.org/docs/cli/oci_registries/module-package/
- OpenTofu OCI Registry Integrations: https://opentofu.org/docs/cli/oci_registries/
- ORAS project documentation: https://oras.land/

## Issues Found
1. **Incorrect tag selection syntax in `source` URLs.** The post used Docker-style colon tag syntax (e.g., `oci://example.com/repo:v1.0.0`). OpenTofu's OCI module sources require query-parameter syntax (`?tag=v1.0.0` or `?digest=...`); colons in the path are not interpreted as a tag selector. Replaced all five occurrences (syntax block, private registry example, Docker Hub example, ECR example, Artifact Registry example) and added a sentence noting the default-to-`latest` behavior.
2. **Wrong archive format and media type for ORAS push.** The post packaged modules as `tar.gz` and used the made-up media type `application/vnd.opentofu.modulesource+tar+gzip`. OpenTofu's module package spec requires a ZIP archive with the OCI Image Manifest's `artifactType` set to `application/vnd.opentofu.modulepkg` and exactly one layer with `mediaType` set to `archive/zip`. Replaced the `tar -czf ...` step with `zip -r ...`, added the `--artifact-type=application/vnd.opentofu.modulepkg` flag to `oras push`, changed the layer descriptor to `vpc-module.zip:archive/zip`, and added a short clarifying paragraph below the code block.

## Review Notes
- The "Using OpenTofu's Built-In Push (Future)" subsection is accurate as written — there is no built-in `tofu` subcommand for publishing module packages today; ORAS (or an equivalent OCI client) remains the recommended approach.
- The authentication examples are correct: OCI registries reuse the Docker credential store, so `docker login`, `aws ecr get-login-password ... | docker login`, and `gcloud auth configure-docker` all apply unchanged.
- The comparison table is reasonable; "Content addressing" under OCI is true via digest pinning (`?digest=sha256:...`), which now matches the corrected syntax section.
- Minor stylistic point (not changed): the `## Syntax` example previously implied the registry path was the artifact-type discriminator. The corrected text now makes clear that OpenTofu interprets the URL itself, with selectors expressed as query parameters.
