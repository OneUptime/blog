# Validation Summary: How to Sign and Verify Helm Charts for Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm chart packaging, provenance, and verification
- GPG / PGP key generation and keyrings
- Sigstore Cosign signing, verification, and attestations
- OCI registries for Helm charts
- GitHub Actions and GitLab CI
- Argo CD config management plugins
- OPA Gatekeeper policies
- Syft SBOM generation

## Sources Consulted
- Helm Provenance and Integrity: https://helm.sh/docs/topics/provenance/
- Helm `package` command reference: https://helm.sh/docs/helm/helm_package/
- Helm `verify` command reference: https://helm.sh/docs/helm/helm_verify/
- Helm `install` command reference: https://helm.sh/docs/helm/helm_install/
- Helm OCI registry documentation: https://helm.sh/docs/topics/registries/
- Helm `template` command reference: https://helm.sh/docs/helm/helm_template/
- Sigstore Cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore Cosign self-managed key documentation: https://docs.sigstore.dev/cosign/key_management/signing_with_self-managed_keys/
- Sigstore Cosign signing overview: https://docs.sigstore.dev/cosign/signing/overview/
- Sigstore signing other OCI artifact types: https://docs.sigstore.dev/cosign/signing/other_types/
- Sigstore policy controller SBOM attestation examples: https://docs.sigstore.dev/policy-controller/sample-policies/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD config management plugin documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- GitHub Packages permissions documentation: https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/

## Issues Found
- The post said Helm supports both PGP and Cosign signing methods. Helm has built-in PGP provenance support; Cosign is a separate Sigstore workflow for OCI artifacts. Changed the wording to "common signing methods" and clarified the distinction.
- The PGP examples used `pubring.kbx` and `pubkey.asc` as Helm keyrings. Helm documentation expects legacy binary keyring files such as `pubring.gpg` for verification and `secring.gpg` for signing. Updated the export and command examples accordingly.
- The GitHub Actions PGP example imported a GPG key but then pointed Helm at `pubring.kbx`. Updated it to export `secring.gpg` and use that keyring for `helm package --sign`.
- The chart repository upload commands quoted wildcard filenames inside `--data-binary`, which would not upload the generated files. Replaced them with shell loops that expand the chart and provenance filenames safely.
- The verification script defaulted to `pubkey.asc`, which is not the Helm-compatible keyring used elsewhere in the corrected post. Changed it to `pubring.gpg`.
- The Argo CD example used `helm.path` in `argocd-cm`, which does not match current Argo CD plugin configuration. Replaced it with a ConfigManagementPlugin-style example using `helm template --verify`.
- The Gatekeeper section implied Gatekeeper could directly enforce Helm chart signatures. Gatekeeper validates Kubernetes admission requests, not Helm provenance files. Updated the wording to enforce a verified-chart annotation produced by the deployment pipeline.
- The Cosign SBOM attestation examples used `--type spdx`. Updated them to the SPDX predicate type URI used in Sigstore examples: `https://spdx.dev/Document`.
- The troubleshooting command for broad keyless verification supplied only `--certificate-identity-regexp`. Cosign keyless verification also requires an OIDC issuer or issuer regexp. Added `--certificate-oidc-issuer-regexp`.

## Review Notes
The examples remain illustrative and use placeholder registries, identities, and chart names. In production, keyless Cosign verification should use specific certificate identities and OIDC issuers rather than broad regular expressions; the broad regexp example is only useful for debugging who signed an artifact.
