# Validation Summary: How to Use Notation for Container Image Signing with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Kubernetes
- GitOps
- Notation / Notary Project
- OCI artifacts and container registries
- Container image signing
- Kubernetes Secrets

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux OCI artifacts cheatsheet: https://fluxcd.io/flux/cheatsheets/oci-artifacts/
- Flux `create secret notation` command reference: https://fluxcd.io/flux/cmd/flux_create_secret_notation/
- Notary Project Notation CLI installation documentation: https://notaryproject.dev/docs/user-guides/installation/cli/
- Notation `certificate generate-test` command reference: https://notaryproject.dev/docs/user-guides/cli-reference/notation_certificate_generate-test/
- Notation `key add` command reference: https://notaryproject.dev/docs/user-guides/cli-reference/notation_key_add/
- Notation `certificate add` and `certificate list` command references: https://notaryproject.dev/docs/user-guides/cli-reference/notation_certificate_add/
- Notary Project trust store and trust policy specification: https://github.com/notaryproject/specifications/blob/main/specs/trust-store-trust-policy.md
- GitHub Notation release assets: https://github.com/notaryproject/notation/releases
- Homebrew Notation formula: https://formulae.brew.sh/formula/notation

## Issues Found
- The Linux installation command used a non-existent unversioned GitHub release asset (`notation_linux_amd64.tar.gz`). Updated it to use the current versioned asset naming pattern for Notation `1.3.2`.
- The production key import example used `notation key add --name production-key`, but `notation key add` expects the key name as a positional argument. Updated it to `notation key add production-key`.
- The Flux Notation configuration was split into separate trust policy and CA certificate secrets. Flux expects the Notation trust policy and CA certificate files in the same secret referenced by `spec.verify.secretRef`. Updated the examples to use one `notation-config` secret containing both `trustpolicy.json` and `ca.crt`.
- The OCIRepository verification example referenced `notation-ca-cert`, which would not contain the required trust policy. Updated it to reference the combined `notation-config` secret.
- The trust policy and OCIRepository examples used `myregistry.example.com/myapp`, while the Flux artifact signing step signs `myregistry.example.com/myapp-manifests`. Updated the trust policy registry scope and OCIRepository URL to target the signed OCI artifact used by Flux.
- The troubleshooting command checked the obsolete `notation-trust-policy` secret. Updated it to check `notation-config`.

## Review Notes
Flux verifies signatures on OCI artifacts used as sources by `OCIRepository`; it does not, by itself, enforce admission-time verification of workload container images referenced inside Kubernetes manifests. The post now keeps the Flux example aligned with signed manifest artifacts while retaining the introductory container-image signing examples.
