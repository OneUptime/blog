# Validation Summary: How to Use flux create secret notation for Notation Signing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD CLI
- Flux source-controller
- OCIRepository
- HelmChart
- Notation / Notary Project
- Kubernetes Secrets
- SOPS

## Sources Consulted
- Flux CLI documentation for `flux create secret notation`: https://fluxcd.io/flux/cmd/flux_create_secret_notation/
- Flux OCIRepository verification documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmChart verification documentation: https://fluxcd.io/flux/components/source/helmcharts/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux SOPS secrets management documentation: https://fluxcd.io/flux/guides/mozilla-sops/
- Notary Project trust store and trust policy specification: https://github.com/notaryproject/specifications/blob/v1.0.0/specs/trust-store-trust-policy.md
- Homebrew formula for Notation CLI: https://formulae.brew.sh/formula/notation

## Issues Found
- The post claimed Flux Notation verification applies to `ImageRepository`/`ImagePolicy`. Flux documents `.spec.verify` for `OCIRepository` and `HelmChart`, not `ImageRepository` or `ImagePolicy`. I replaced the invalid ImageRepository/ImagePolicy example with a supported OCI-backed `HelmChart` example and updated verification commands to use OCIRepository/source-controller terminology.
- The post described verification as directly allowing or rejecting container image deployment. Flux source verification validates signed source artifacts before source reconciliation; it does not enforce Kubernetes runtime image admission for arbitrary workloads. I updated the introduction, flow diagram, verification text, best practices, and conclusion to refer to OCI artifacts and source reconciliation.
- The Notary Project trust policy example used `registry.example.com/production/*`, but the trust policy specification only allows fully qualified repository URIs or a single global `*`. I changed the example to a fully qualified repository scope.
- The troubleshooting command attempted to read `.data.ca\.crt`, but the example secret is created from `ca-certificate.crt`, so the generated secret key would be `ca-certificate.crt`. I corrected the jsonpath key.
- The post used `flux get source oci ... -o json`, but the documented Flux status command is `flux get sources oci`, and JSON inspection is better shown through `kubectl get ocirepository ... -o json`. I updated those commands.
- The prerequisite listed Flux CLI v2.2.0 or later, but the Notation secret command is present in the Flux v2.3+ archived/current CLI documentation and not in the v2.0 archived docs. I updated the prerequisite to v2.3.0 or later.

## Review Notes
The local workspace did not have `flux` or `notation` installed, so command validation was performed against official documentation rather than local `--help` output.
