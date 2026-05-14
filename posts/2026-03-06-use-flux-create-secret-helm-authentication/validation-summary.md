# Validation Summary: How to Use flux create secret helm for Helm Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CLI
- Flux source-controller
- Flux helm-controller
- Kubernetes Secrets
- Flux HelmRepository resources
- Flux HelmRelease resources
- Helm chart repositories
- SOPS

## Sources Consulted
- Flux CLI documentation: `flux create secret helm` - https://fluxcd.io/flux/cmd/flux_create_secret_helm/
- Flux CLI documentation: `flux create source helm` - https://fluxcd.io/flux/cmd/flux_create_source_helm/
- Flux CLI documentation: `flux create helmrelease` - https://fluxcd.io/flux/cmd/flux_create_helmrelease/
- Flux HelmRepository documentation - https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease guide - https://fluxcd.io/flux/guides/helmreleases/
- Flux source code for `create secret helm` and generated secret keys - https://github.com/fluxcd/flux2/blob/main/cmd/flux/create_secret_helm.go and https://github.com/fluxcd/flux2/blob/main/pkg/manifestgen/sourcesecret/

## Issues Found
- The TLS examples used outdated `flux create secret helm` flags: `--cert-file`, `--key-file`, and `--ca-file`. Updated them to the current documented flags: `--tls-crt-file`, `--tls-key-file`, and `--ca-crt-file`.
- The client certificate example combined username/password with client TLS flags. Current Flux secret generation prioritizes the TLS secret when client certificate data is provided, so the basic auth fields would not be included. Removed username/password from the client TLS example.
- The architecture diagram implied the Helm controller fetches charts directly from Helm repositories. Updated it to show the source-controller fetching repository/index data before the helm-controller reconciles HelmRelease resources.
- The HelmRelease creation example referenced a HelmRepository created in `flux-system` from a HelmRelease created in `default` without including the source namespace. Updated the source reference to `HelmRepository/private-charts.flux-system`.
- The troubleshooting CA example used the outdated `--ca-file` flag. Updated it to `--ca-crt-file`.
- The expected TLS secret keys listed deprecated `certFile` and `keyFile` names and included username/password for the TLS case. Updated the expected keys to `ca.crt`, `tls.crt`, and `tls.key`, and clarified the basic-auth-with-custom-CA keys.

## Review Notes
The cloud registry examples are plausible when static basic credentials are accepted, but Flux's current documentation recommends OCI-specific support, including `OCIRepository`, `HelmRepository` with `type: oci`, provider-based auth, or `flux create secret oci`, for many OCI registry workflows.
