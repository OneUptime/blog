# Validation Summary: How to Verify Flux Controller Image Signatures with Cosign

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- Sigstore Cosign
- GitHub Container Registry
- GitHub Actions OIDC
- Rekor transparency log
- crane

## Sources Consulted
- Flux Security Documentation: https://fluxcd.io/flux/security/
- Flux source-controller v1.2.0 release notes: https://github.com/fluxcd/source-controller/releases/tag/v1.2.0
- Sigstore Cosign verifying documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Cosign verify CLI reference: https://github.com/sigstore/cosign/blob/main/doc/cosign_verify.md
- Flux Get Started documentation: https://fluxcd.io/flux/get-started/

## Issues Found
- The certificate identity regexp was broader than Flux's official example. Updated the Cosign commands to use an anchored regexp that escapes `github.com`, matching Flux's documented verification pattern.
- The post referenced `https://raw.githubusercontent.com/fluxcd/flux2/main/cosign.pub`, but that URL returns 404 and Flux documents controller image signing with Cosign and GitHub OIDC. Replaced the public-key section with an exact certificate identity verification command for the controller release workflow.
- The verification-output description said successful output includes certificate subject, issuer, and transparency log entry. Current Cosign examples and Flux documentation emphasize performed checks and the verified payload, so the wording was corrected.

## Review Notes
- The troubleshooting command uses `crane`, which is valid for listing registry tags but is not listed in the prerequisites. It is only used for optional troubleshooting.
- The Cosign binary download command writes to `/usr/local/bin`; users may need elevated permissions depending on their system.
