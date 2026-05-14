# Validation Summary: How to Configure OCIRepository with Insecure Registries in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller OCIRepository
- Kubernetes Secrets
- Kubernetes kubectl
- OCI registries
- kind local Kubernetes clusters
- Docker registry

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI `flux push artifact` command reference: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux CLI `flux get sources oci` command reference: https://fluxcd.io/flux/cmd/flux_get_sources_oci/
- kind local registry documentation: https://kind.sigs.k8s.io/docs/user/local-registry/
- Kubernetes `kubectl create secret docker-registry` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/

## Issues Found
- The local `flux push artifact` example pushed to an HTTP registry without the required `--insecure-registry` flag. The Flux CLI documents this flag as allowing artifacts to be pushed without TLS, so the command would fail against the plain HTTP registry as written. Added `--insecure-registry`.
- The same command used `--revision="dev/latest"`, which does not match the Flux CLI documented revision format of `<branch|tag>@sha1:<commit-sha>`. Changed it to a valid placeholder revision in that format.

## Review Notes
- The OCIRepository fields `insecure`, `secretRef`, and `certSecretRef` are current and valid for `source.toolkit.fluxcd.io/v1`.
- The `certSecretRef` examples use supported secret data keys: `ca.crt`, `tls.crt`, and `tls.key`.
- The authentication example correctly uses a Docker registry secret, which produces the expected `kubernetes.io/dockerconfigjson` secret type for OCIRepository `secretRef`.
- The kind local registry setup is broadly consistent with the kind local registry pattern, though the official kind documentation now recommends using the containerd `certs.d` registry configuration approach for current kind versions.
