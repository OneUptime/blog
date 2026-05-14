# Validation Summary: How to Use flux tree artifact to View Artifact Tree

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes custom resources
- GitRepository, OCIRepository, Bucket, and HelmChart source artifacts
- kubectl
- curl
- tar

## Sources Consulted
- Flux CLI reference: `flux tree artifact` - https://fluxcd.io/flux/cmd/flux_tree_artifact/
- Flux CLI reference: `flux tree artifact generator` - https://fluxcd.io/flux/cmd/flux_tree_artifact_generator/
- Flux CLI reference: `flux get sources git` - https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI reference: `flux get sources all` - https://fluxcd.io/flux/cmd/flux_get_sources_all/
- Flux CLI reference: `flux reconcile source git` - https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux source-controller GitRepository documentation - https://fluxcd.io/flux/components/source/gitrepositories/
- Flux source-controller OCIRepository documentation - https://fluxcd.io/flux/components/source/ocirepositories/
- Flux source-controller Bucket documentation - https://fluxcd.io/flux/components/source/buckets/
- Flux source-controller HelmChart documentation - https://fluxcd.io/flux/components/source/helmcharts/

## Issues Found
- The original post incorrectly claimed that `flux tree artifact gitrepository my-repo`, `flux tree artifact ocirepository my-oci-source`, `flux tree artifact bucket my-bucket`, and `flux tree artifact helmchart my-chart` list files inside source artifacts. Current Flux documentation describes `flux tree artifact` as a parent command for artifact object inventory, with `flux tree artifact generator [name]` as the supported subcommand. I replaced these invalid commands with a supported workflow that reads `.status.artifact.path`, port-forwards `svc/source-controller`, and lists the gzip tar archive with `curl | tar -tzf -`.
- The original post used `flux get source git` and similar singular forms for status checks. Official Flux CLI documentation uses `flux get sources git`, `flux get sources oci`, `flux get sources bucket`, and `flux get sources chart`. I updated the commands accordingly.
- The original troubleshooting section used `flux reconcile source git my-repo --with-source`. The documented `flux reconcile source git` command does not include `--with-source`; I removed that flag.
- The original explanation of filtered Git sources omitted sparse checkout, which is also reflected in the built artifact. I updated the filtering notes to include `spec.sparseCheckout`.

## Review Notes
The local environment did not have the Flux CLI installed, so CLI behavior was verified against the current official Flux command reference and source-controller documentation rather than local `flux --help` output. The corrected artifact-inspection examples assume the user has an active `kubectl -n flux-system port-forward svc/source-controller 8080:80` session while running the `curl` commands.
