# Validation Summary: How to Request a Fulcio Certificate from GitHub Actions with id-token: write

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- GitHub Actions workflow permissions and OIDC
- Sigstore Fulcio certificates and certificate extensions
- Cosign identity-based container and blob signing
- Sigstore standardized bundles and transparency services
- GitHub Container Registry (GHCR)
- Docker Buildx and Docker GitHub Actions
- Reusable GitHub Actions workflows

## Sources Consulted
- [GitHub Actions OpenID Connect reference](https://docs.github.com/en/actions/reference/security/oidc)
- [GitHub Enterprise Cloud custom OIDC issuer documentation](https://docs.github.com/en/enterprise-cloud@latest/actions/reference/security/oidc#customizing-the-issuer-value-for-an-enterprise)
- [GitHub Actions workflow syntax and token permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GitHub reusable-workflow configuration and permission rules](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations)
- [GitHub OIDC with reusable workflows](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-with-reusable-workflows)
- [GitHub Actions secure-use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub repository rulesets documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [GitHub Container Registry documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [GitHub Actions Toolkit OIDC token API](https://github.com/actions/toolkit/blob/main/packages/core/README.md#oidc-token)
- [Fulcio OIDC and GitHub SAN mapping](https://github.com/sigstore/fulcio/blob/main/docs/oidc.md#github)
- [Fulcio OID and GitHub claim mapping](https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md)
- [Fulcio's current GitHub issuer and certificate templates](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/config/identity/config.yaml#L169-L259)
- [go-oidc v3.20.0 token verifier](https://github.com/coreos/go-oidc/blob/v3.20.0/oidc/verify.go)
- [Sigstore identity-based signing overview](https://docs.sigstore.dev/cosign/signing/overview/)
- [Cosign v3.1.3 release](https://github.com/sigstore/cosign/releases/tag/v3.1.3)
- [Cosign v3.1.3 container-signing reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_sign.md)
- [Cosign v3.1.3 blob-signing reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_sign-blob.md)
- [Cosign v3.1.3 container-verification reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify.md)
- [Cosign v3.1.3 GitHub Actions OIDC provider](https://github.com/sigstore/cosign/blob/v3.1.3/pkg/providers/github/github.go)
- [Cosign legacy-bundle verification advisory GHSA-fx35-mq7g-6g98](https://github.com/sigstore/cosign/security/advisories/GHSA-fx35-mq7g-6g98)
- [Cosign installer v4.1.2 release](https://github.com/sigstore/cosign-installer/releases/tag/v4.1.2)
- [actions/checkout v7.0.1 release](https://github.com/actions/checkout/releases/tag/v7.0.1)
- [docker/login-action v4.6.0 release](https://github.com/docker/login-action/releases/tag/v4.6.0)
- [docker/build-push-action v7.3.0 release](https://github.com/docker/build-push-action/releases/tag/v7.3.0)
- [docker/build-push-action inputs and outputs](https://github.com/docker/build-push-action#outputs)

## Issues Found
- The opening described Cosign retrieving the OIDC token before creating its ephemeral key. Cosign's identity-based signing flow creates the in-memory key pair first, so the two operations were reordered.
- The GHCR permission statement was unqualified. It now states that `packages: write` is required for the shown `GITHUB_TOKEN` publication flow; other registry credentials use their own authorization model.
- The OIDC request variables were described as available to "authorized steps," although `id-token` permission is granted at workflow or job scope rather than step scope. The text now says they are available within the authorized job.
- The issuer statement treated `https://token.actions.githubusercontent.com` as universal. It is the default GitHub.com issuer, but an enterprise can enable an issuer containing its enterprise slug. The post now calls out that case and requires verification to pin the configured issuer.
- Fulcio's token handling was described too broadly as validating GitHub-specific claims. The text now distinguishes cryptographic issuer/audience/time validation from extraction of the configured GitHub claims.
- An exact certificate identity was presented as sufficient to select an immutable workflow revision. An identity ending in a branch or tag ref still names a movable ref, so the post now requires a full-commit-SHA identity or enforcement of the Fulcio Build Signer Digest and repository metadata.
- "Release tags created from protected branches" did not identify enforceable tag protection or prove commit ancestry. It was changed to require a tag ruleset and a tag target reachable from a protected branch.

## Review Notes
- All four action comments and full commit pins were verified against their official release tags: `actions/checkout` v7.0.1, `sigstore/cosign-installer` v4.1.2, `docker/login-action` v4.6.0, and `docker/build-push-action` v7.3.0.
- The explicit `cosign-release: v3.1.3` override is necessary because cosign-installer v4.1.2 defaults to Cosign v3.0.6; the override is supported and installs the patched release.
- The `cosign sign`, `sign-blob`, and `verify` commands and all shown flags were checked against Cosign v3.1.3. The installed release binary's checksum and help output were also verified.
- Cosign v3.1.3 writes the standardized Sigstore bundle for the shown `sign-blob --bundle` command. The cited advisory affects legacy blob-bundle verification, not standardized bundles or OCI image verification.
- The verification example intentionally contains a digest placeholder and assumes the default GitHub.com issuer. Deployments using an enterprise custom issuer must substitute that exact issuer.
