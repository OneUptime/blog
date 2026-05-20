# Validation Summary: How to Verify ArgoCD Release Signatures and Checksums

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD release artifacts
- GitHub Releases
- SHA256 checksums
- Sigstore cosign
- SLSA provenance and slsa-verifier
- Kyverno image verification policies
- Helm chart provenance
- GnuPG

## Sources Consulted
- Argo CD official documentation: Verification of Argo CD Artifacts, https://argo-cd.readthedocs.io/en/stable/operator-manual/signed-release-assets/
- Argo CD v2.13.0 GitHub release and release assets API, https://github.com/argoproj/argo-cd/releases/tag/v2.13.0
- Sigstore cosign installation documentation, https://docs.sigstore.dev/cosign/system_config/installation/
- SLSA verifier official repository and command documentation, https://github.com/slsa-framework/slsa-verifier
- Kyverno official verifyImages documentation, https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno official Sigstore keyless verification documentation, https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Helm official `helm pull` documentation, https://helm.sh/docs/v3/helm/helm_pull/
- Helm official provenance and integrity documentation, https://helm.sh/docs/v3/topics/provenance/
- Argo Helm official chart repository, https://argoproj.github.io/argo-helm/

## Issues Found
- The checksum filename was incorrect. Argo CD v2.13.0 publishes `cli_checksums.txt`, not `argocd-v2.13.0-checksums.txt`; all checksum download URLs were updated.
- The macOS checksum section only showed manual comparison. Added the correct `shasum -a 256 -c` automatic verification command.
- The automated checksum script used `sha256sum` unconditionally. Added a fallback to `shasum -a 256` so the script works on macOS as well as Linux.
- The cosign examples used an overly broad certificate identity. Updated them to match Argo CD's documented release workflow identity and repository constraint.
- The Kyverno policy used less current keyless verification fields. Updated it to use `failureAction`, `subjectRegExp`, the GitHub OIDC issuer, and Rekor URL.
- The SLSA CLI provenance filename was incorrect. Argo CD publishes a shared `argocd-cli.intoto.jsonl`; the download and `--provenance-path` examples were corrected.
- The GPG section referenced non-existent per-binary `.asc` release assets. Replaced it with a note that Argo CD v2.13.0 release assets should be verified with checksums, cosign, and SLSA provenance instead.
- The Helm verification snippet assumed the repository alias and keyring already existed. Added the official Argo Helm repository setup and chart signing key import before `helm pull --verify`.
- The Helm digest comparison text referenced Artifact Hub. Updated it to compare against the digest in the official Helm repository index.

## Review Notes
The guide is version-specific around Argo CD v2.13.0 and Helm chart 7.0.0. Future updates should re-check asset names, signing workflow identity, and chart signing key details against the current release artifacts before changing the pinned versions.
