# Validation Summary: How to Copy Docker Images Between Artifact Registry Repositories Across Projects

## Status
validated

## Post Type
Tutorial / how-to guide

## Technologies Covered
- Google Cloud Artifact Registry
- Docker
- Google Cloud CLI
- Cloud Build
- go-containerregistry `crane`
- go-containerregistry `gcrane`
- IAM roles for Artifact Registry

## Sources Consulted
- Google Cloud Artifact Registry Docker authentication documentation: https://cloud.google.com/artifact-registry/docs/docker/authentication
- Google Cloud Artifact Registry image management documentation: https://cloud.google.com/artifact-registry/docs/docker/manage-images
- Google Cloud Build default service account documentation: https://cloud.google.com/build/docs/cloud-build-service-account
- Google Cloud Build substitutions documentation: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- go-containerregistry `crane copy` command documentation: https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane_copy.md
- go-containerregistry `gcrane` README: https://github.com/google/go-containerregistry/blob/main/cmd/gcrane/README.md
- go-containerregistry `gcrane` copy command source: https://github.com/google/go-containerregistry/blob/main/cmd/gcrane/cmd/copy.go
- go-containerregistry release downloads: https://github.com/google/go-containerregistry/releases/latest

## Issues Found
- The `crane copy` example for copying all tags omitted `--all-tags`. Added the flag because `crane copy SRC DST` copies a single reference unless all-tag copying is requested.
- The `gcrane` bulk copy example omitted recursive copy. Added `--recursive` because `gcrane copy` only performs repository-wide recursive copying when that flag is set.
- The release download examples pinned an older `v0.19.0` tarball. Updated them to the official `releases/latest/download` URL so the post does not hard-code an outdated release.
- The Cloud Build examples installed `crane` but did not configure Docker credential helper authentication for `crane`. Added `gcloud auth configure-docker us-central1-docker.pkg.dev --quiet` before invoking `crane`.
- The Cloud Build IAM example assumed the legacy Cloud Build service account format only. Added the Compute Engine default service account format caveat because current Cloud Build projects may use either default service account depending on organization settings.

## Review Notes
The post is technically relevant and the remaining commands match the documented Artifact Registry image naming, IAM role, Docker authentication, and Cloud Build substitution patterns. `gcloud` was not installed in the local environment, so CLI syntax was verified against official Google Cloud documentation rather than local `--help` output.
