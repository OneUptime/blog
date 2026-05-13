# Validation Summary: How to Configure Flux CD for Low-Bandwidth Edge Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Flux OCIRepository and GitRepository sources
- Flux Kustomization resources
- Flux CLI OCI artifact commands
- OCI registries
- vnStat and tcpdump network measurement

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux OCI artifact cheatsheet: https://fluxcd.io/flux/cheatsheets/oci-artifacts/
- Flux CLI `push artifact` documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux CLI `tag artifact` documentation: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux CLI `reconcile source oci` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_source_oci/
- vnStat man page: https://manpages.ubuntu.com/manpages/jammy/man1/vnstat.1.html

## Issues Found
- The post claimed Flux's default behavior is cloning a full Git repository on every reconciliation cycle. Current Flux source-controller has optimized Git clone behavior and checks sources on intervals, so the introduction was changed to describe Git-based sources as bandwidth-intensive when repositories are large or change frequently.
- The post described the GitRepository `include` field as a shallow clone mechanism. In Flux, `include` is for composing artifacts from other GitRepository resources, and shallow cloning is only documented for `.spec.ref.branch` plus `.spec.ref.commit`. The section was corrected to use `sparseCheckout` for path-limited Git artifacts and to explain the shallow clone limitation.
- The OCI artifact transfer estimate said subsequent pulls are delta-only. Flux OCIRepository resolves remote digests and stores artifacts, but it does not perform binary delta pulls. The wording was corrected to distinguish unchanged metadata checks from full downloads of new artifact digests.
- The local cache section incorrectly stated that Flux OCI artifacts use containerd's image cache and can be verified with `ctr images ls`. Flux source-controller stores OCIRepository artifacts in its own artifact storage. The section was corrected to recommend a registry mirror/proxy for edge caching and to verify stored Flux artifacts with `kubectl describe ocirepository`.
- The best-practice bullet about "image digest pinning in OCI artifact tags" conflated tags and digests. It was corrected to recommend immutable tags or `.spec.ref.digest` pinning.
- A shell command block in the OCI versioning section was marked as `yaml`. The code fence was changed to `bash`.

## Review Notes
The numeric bandwidth savings and transfer-size examples are plausible but environment-dependent; they should be treated as illustrative rather than guaranteed benchmark results. The Flux CLI was not installed in the local environment, so CLI verification was performed against official Flux command documentation rather than local `--help` output.
