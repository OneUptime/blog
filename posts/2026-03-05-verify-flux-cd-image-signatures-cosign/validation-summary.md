# Validation Summary: How to Verify Flux CD Container Image Signatures with Cosign

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Sigstore Cosign
- GitHub Actions OIDC
- Kubernetes
- Kyverno image verification policies
- Bash scripting

## Sources Consulted
- Flux Security Documentation: https://fluxcd.io/flux/security/
- Flux GitHub Action Documentation: https://fluxcd.io/flux/flux-gh-action/
- Sigstore Cosign installation documentation: https://docs.sigstore.dev/cosign/system_config/installation/
- Sigstore Cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore OIDC verification cheat sheet: https://docs.sigstore.dev/quickstart/verification-cheat-sheet/
- Kyverno image verification overview: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno Sigstore verification documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Kyverno ImageValidatingPolicy documentation: https://kyverno.io/docs/policy-types/image-validating-policy/
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The Cosign certificate identity regular expressions used unescaped dots in `github.com` and lacked an end anchor. Updated the examples to use `github\\.com` and `$` so the regex matches the intended GitHub identity more precisely.
- The Bash and GitHub Actions examples extracted controller names only from tag-based image references. Updated the `sed` expression so it also handles digest-pinned references, which the post recommends as a best practice.
- The Kyverno example used the deprecated `ClusterPolicy` image verification form. Replaced it with the stable Kyverno `NamespacedImageValidatingPolicy` API for Kyverno v1.18 and updated the Cosign keyless attestor and validation expression accordingly.

## Review Notes
The Cosign and Flux verification commands align with Flux's official signed image guidance and Sigstore's keyless verification model. The exact controller versions shown are examples rather than current release recommendations; future updates could refresh them to the latest Flux release series.
