# Validation Summary: How to Use OCI Artifacts for Air-Gapped Flux Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- OCI artifacts
- OCI-compatible container registries
- Docker registry authentication and image export
- Air-gapped deployment workflows

## Sources Consulted
- Flux CLI `flux pull artifact` documentation: https://fluxcd.io/flux/cmd/flux_pull_artifact/
- Flux CLI `flux push artifact` documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux CLI `flux tag artifact` documentation: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux `OCIRepository` documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux source-controller API reference for `source.toolkit.fluxcd.io/v1`: https://fluxcd.io/flux/components/source/api/v1/
- Flux air-gapped installation documentation: https://fluxcd.io/flux/installation/configuration/air-gapped/
- Kubernetes docker-registry Secret documentation: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/

## Issues Found
- The prerequisite listed Flux CLI v2.1.0 or later, but the post uses the current `source.toolkit.fluxcd.io/v1` `OCIRepository` API. Updated the prerequisite to Flux v2.6.0 or later to align with the current API examples.
- The import examples used `flux oci login`, which is not a Flux CLI command. Replaced it with `docker login`, matching the Flux CLI documentation that `flux pull`, `flux push`, and `flux tag` can read OCI registry credentials from Docker config.
- The `flux push artifact --revision` examples used values such as `v1.2.0` and a date. Flux documents the revision format as `<branch|tag>@sha1:<commit-sha>`, so the examples now use that form.
- The image export example used `docker save` without first ensuring the image exists locally. Added `docker pull` before `docker save`.

## Review Notes
- The `certSecretRef` usage with `ca.crt` is valid for trusting an internal CA or self-signed registry certificate.
- The `secretRef` usage with a `kubernetes.io/dockerconfigjson` Secret created by `kubectl create secret docker-registry` is valid for OCIRepository authentication.
- The `flux get sources oci` command is documented by Flux as preview, but it is still the correct command for checking OCIRepository status.
