# Validation Summary: How to Troubleshoot OCIRepository Pull Errors in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Kubernetes
- OCI registries and artifacts
- Cosign
- Crane
- Docker registry authentication
- TLS certificates

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux command reference for `flux get sources oci`: https://fluxcd.io/flux/cmd/flux_get_sources_oci/
- Flux command reference for `flux reconcile source oci`: https://fluxcd.io/flux/cmd/flux_reconcile_source_oci/
- Flux command reference for `flux push artifact`: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux command reference for `flux list artifacts`: https://fluxcd.io/flux/cmd/flux_list_artifacts/
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Sigstore Cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Google go-containerregistry `crane` documentation: https://github.com/google/go-containerregistry/tree/main/cmd/crane

## Issues Found
- The SemVer troubleshooting section said `v`-prefixed tags could fail because the constraint did not account for the prefix. Flux strips the leading `v` when evaluating SemVer tags, so this was changed to the more accurate prerelease-version caveat.
- The TLS verification example used `curl --cacert /dev/null`, which does not correctly verify a registry certificate chain. The command was changed to a normal `curl -v` TLS check from inside the cluster.
- The timeout section advised increasing the timeout on the source controller and only showed how to inspect controller arguments. OCIRepository supports `spec.timeout`, so the example was changed to configure the timeout on the OCIRepository resource.
- The keyless Cosign verification command used `COSIGN_EXPERIMENTAL=1`. Keyless verification is no longer an experimental Cosign workflow, so the environment variable was removed.

## Review Notes
The post is technically relevant and the remaining examples match current Flux, Kubernetes, Crane, and Cosign usage. Some exact registry error strings vary by registry implementation, but the troubleshooting categories and fixes are accurate.
