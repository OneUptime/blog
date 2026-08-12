# Validation Summary: Cosign Keyless Signing: Identity and Recorded Claims

## Status

validated

## Post Type

Technical guide with GitHub Actions configuration and Cosign CLI examples.

## Technologies Covered

- Cosign 3.1.3
- Sigstore keyless signing
- OpenID Connect (OIDC)
- Fulcio and certificate transparency
- Rekor signature transparency
- RFC 3161 timestamp authorities
- Sigstore bundles and trusted roots
- OCI 1.1 referrers and container registries
- GitHub Actions and GitHub Container Registry (GHCR)

## Sources Consulted

- [Sigstore security model](https://docs.sigstore.dev/about/security/)
- [Sigstore keyless-signing overview](https://docs.sigstore.dev/cosign/signing/overview/)
- [Sigstore CI quickstart](https://docs.sigstore.dev/quickstart/quickstart-ci/)
- [Fulcio certificate-issuing overview](https://docs.sigstore.dev/certificate_authority/certificate-issuing-overview/)
- [OIDC usage in Fulcio](https://docs.sigstore.dev/certificate_authority/oidc-in-fulcio/)
- [Fulcio certificate OID reference](https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md)
- [Rekor transparency-log overview](https://docs.sigstore.dev/logging/overview/)
- [Sigstore timestamp verification](https://docs.sigstore.dev/cosign/verifying/timestamps/)
- [Sigstore bundle format](https://docs.sigstore.dev/about/bundle/)
- [Cosign container-signing and OCI-referrer documentation](https://docs.sigstore.dev/cosign/signing/signing_with_containers/)
- [Cosign signature-payload specification](https://docs.sigstore.dev/cosign/system_config/specifications/)
- [Cosign 3.1.3 `sign` reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_sign.md)
- [Cosign 3.1.3 `verify` reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify.md)
- [Cosign 3.1.3 `login` reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_login.md)
- [Sigstore public-good signing configuration](https://github.com/sigstore/root-signing/blob/main/targets/signing_config.v0.2.json)
- [cosign-installer 4.1.2 release](https://github.com/sigstore/cosign-installer/releases/tag/v4.1.2)
- [Cosign 3.1.3 release](https://github.com/sigstore/cosign/releases/tag/v3.1.3)
- [GitHub Actions OIDC reference](https://docs.github.com/en/actions/reference/security/oidc)
- [GitHub Actions job-output documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/pass-job-outputs)
- [GitHub container-publishing workflow documentation](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)
- [GitHub guidance for secure use of third-party actions](https://docs.github.com/en/actions/reference/security/secure-use)

## Issues Found

- The signing sequence conflated Fulcio's certificate-transparency log with Rekor's signature-transparency log and omitted the timestamp authority used by the current public-good signing configuration. It now distinguishes the Fulcio precertificate/SCT flow, RFC 3161 timestamping, Rekor logging, and OCI 1.1 bundle storage.
- The post said that Cosign signs the artifact digest directly. For container signing, Cosign signs a payload that identifies the immutable manifest digest, so the wording was corrected accordingly.
- The GitHub Actions example used the outdated `sigstore/cosign-installer@v3`, which installs Cosign 2.x. It now uses installer 4.1.2 and explicitly installs the current patched Cosign 3.1.3 release.
- The signing job referenced `needs.build.outputs.digest` without declaring `needs: build`. The missing dependency was added, and the surrounding text now states that the omitted build job must publish a `digest` job output.
- The separate signing job had no GHCR authentication. `packages: write` grants the job token permission but does not log a fresh runner into the registry, so a `cosign login` step using `GITHUB_TOKEN` was added.
- The signing-only job granted `contents: read` without using it. That permission was removed to make the example match its least-privilege guidance.
- The identity discussion blurred the GitHub workflow URI consumed by `--certificate-identity` with the OIDC token's raw `sub`. It now explains that Fulcio derives the URI SAN from `job_workflow_ref` and also records provider-specific claims, including the raw subject in current certificates, as extensions.
- The policy wording could imply that the workflow identity proves branch protection. It now says that the recorded branch ref must be backed by separately configured branch protection.
- The certificate-expiry explanation did not distinguish the trusted-time mechanisms. It now documents the signed Rekor timestamp available with Rekor v1, RFC 3161 timestamps, Rekor v2's separate timestamp authority, and the bundle requirement for at least one supported trusted timestamp.
- The operational dependency list omitted Fulcio's certificate-transparency log, the timestamp authority, and the possible need to retrieve service configuration from Sigstore's TUF repository. Those dependencies and the material needed for disconnected verification were added.

## Review Notes

- Cosign 3.1.3 and cosign-installer 4.1.2 were the current releases on 2026-08-12. The downloaded Cosign 3.1.3 binary was checksum-verified, and its local help output confirmed the documented signing, verification, identity-policy, trusted-root, and registry-login flags.
- The readable action version tag remains suitable for the article because the post explicitly warns readers to replace it with a reviewed full commit SHA in hardened production workflows.
- For reusable GitHub Actions workflows, `job_workflow_ref` identifies the called workflow. Policies that must also constrain the caller or source repository should evaluate the relevant certificate extensions or signed provenance.
- GitHub's immutable default OIDC `sub` format for newer repositories does not change the workflow URI shown for `--certificate-identity`; it affects the separately recorded raw token subject.
