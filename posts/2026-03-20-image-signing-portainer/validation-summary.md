# Validation Summary: How to Set Up Image Signing and Verification in Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- GitHub Actions
- GitHub Container Registry (GHCR)
- Cosign
- Sigstore
- Connaisseur
- Bash

## Sources Consulted
- Sigstore documentation, "Installation": https://docs.sigstore.dev/cosign/system_config/installation/
- Sigstore documentation, "Signing Containers": https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Sigstore documentation, "Verifying Signatures": https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore documentation, "Signing with Self-Managed Keys": https://docs.sigstore.dev/cosign/key_management/signing_with_self-managed_keys/
- Sigstore `cosign sign` CLI reference: https://github.com/sigstore/cosign/blob/main/doc/cosign_sign.md
- Sigstore `cosign verify` CLI reference: https://github.com/sigstore/cosign/blob/main/doc/cosign_verify.md
- Sigstore `cosign-installer` GitHub Action: https://github.com/sigstore/cosign-installer
- Portainer documentation, "Webhooks": https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer documentation, "API documentation": https://docs.portainer.io/api/docs
- GitHub Docs, "Publishing Docker images": https://docs.github.com/en/actions/how-tos/use-cases-and-examples/publishing-packages/publishing-docker-images
- Connaisseur documentation, "Overview": https://sse-secure-systems.github.io/connaisseur/v3.8.3/
- Connaisseur documentation, "Basics": https://sse-secure-systems.github.io/connaisseur/v3.3.4/basics/

## Issues Found
- The description and conclusion implied that Portainer itself could be configured to enforce Cosign verification for Docker/Compose deployments. I corrected that wording to describe an external verification gate before Portainer deployment, which matches the documented Portainer webhook model.
- The GitHub Actions example used an outdated `sigstore/cosign-installer@v3`, signed the image by tag, and said the signature was stored in Rekor. I updated it to `sigstore/cosign-installer@v4`, captured the pushed image digest from `docker/build-push-action`, signed `tag@digest`, and clarified that the signature is stored in the registry while Rekor records the transparency log entry.
- The Portainer deployment script used the wrong webhook endpoint (`/api/webhooks/...`) and an undocumented `sed` edit against a local Compose file path. I replaced that flow with the documented Portainer stack webhook endpoint (`/api/stacks/webhooks/...`) and the supported `?tag=` redeploy mechanism, and I added the Portainer Business Edition prerequisite.
- The post mixed key-based and keyless signing without clarifying that keyless verification does not use `--key cosign.pub`. I added a note that GitHub Actions keyless signatures must be verified with certificate identity and OIDC issuer constraints instead.
- The Connaisseur section showed a Docker Compose example that would not provide admission-time signature enforcement and assumed `cosign` existed inside the workload image. I replaced it with a correct explanation that Connaisseur is a Kubernetes admission controller and does not apply to Portainer-managed Docker or Compose stacks.
- The audit script had two shell correctness problems: the shebang was not the first line, and the piped `while` loop ran in a subshell so `FAILURES` would not increment in the parent shell. I moved the shebang to the first line and rewrote the loop with process substitution.
- The deployment failure message claimed every verification failure meant the image was not signed by CI. I corrected that to the technically accurate case: the image is unsigned or was not signed with the expected key.

## Review Notes
- Cosign's current CLI docs recommend signing immutable image digests rather than tags. The GitHub Actions example now follows that pattern; the simple local examples still use tags for readability, but digest references are safer in production.
- Portainer stack webhooks are documented as a Business Edition feature and are only available on non-Edge environments.
- Keyless verification in Cosign requires certificate identity and OIDC issuer checks. A public-key-only verification flow applies to self-managed key pairs, not GitHub Actions keyless signatures.
