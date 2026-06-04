# Validation Summary: How to Configure Notary for Docker Content Trust in Kubernetes Image Pipelines

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Docker Content Trust
- Notary v1 server and signer
- Kubernetes Deployments, Services, ConfigMaps, and admission control
- Harbor content trust
- Docker CLI trust commands
- GitLab CI
- Connaisseur
- Sigstore Cosign
- Sigstore Policy Controller

## Sources Consulted
- Docker Docs: Content trust in Docker - https://docs.docker.com/engine/security/trust/
- Docker Docs: Deploy Notary Server with Compose - https://docs.docker.com/engine/security/trust/deploying_notary/
- Docker Docs: Automation with content trust - https://docs.docker.com/engine/security/trust/trust_automation/
- Docker Docs: Delegations for content trust - https://docs.docker.com/engine/security/trust/trust_delegation/
- Notary server configuration reference - https://raw.githubusercontent.com/notaryproject/notary/master/docs/reference/server-config.md
- Notary signer configuration reference - https://raw.githubusercontent.com/notaryproject/notary/master/docs/reference/signer-config.md
- Connaisseur Notary v1 validator documentation - https://sse-secure-systems.github.io/connaisseur/latest/validators/notaryv1/
- Harbor 2.7 content trust documentation - https://goharbor.io/docs/2.7.0/working-with-projects/project-configuration/implementing-content-trust/
- Harbor 2.14 content trust documentation - https://goharbor.io/docs/2.14.0/working-with-projects/project-configuration/implementing-content-trust/
- Sigstore Cosign installation documentation - https://docs.sigstore.dev/cosign/system_config/installation/
- Sigstore Policy Controller documentation - https://docs.sigstore.dev/policy-controller/overview/

## Issues Found
- The Notary server and signer deployments used environment variables for config file paths. Notary documents the config path as a `-config` command-line flag, so the examples now use container `args`.
- The Notary server remote trust service config was missing `key_algorithm` and mutual TLS client certificate/key settings while the signer required a client CA. Added the missing fields.
- The Notary signer PostgreSQL storage config was missing `default_alias` and the corresponding `NOTARY_SIGNER_<ALIAS>` passphrase environment variable. Added both.
- The Harbor section implied current built-in Notary integration. Updated it to state that Notary v1 applies to Harbor 2.7 and earlier, that Harbor 2.9 deprecated Notary v1, and that current Harbor releases use Cosign or Notation.
- The key-generation workflow did not add the delegation public key to the repository. Added `docker trust signer add`.
- The GitLab CI example manually copied a private key into Docker's trust directory and enabled DCT globally, which could cause the build push to sign prematurely and does not follow Docker's documented key import workflow. Updated it to use `docker trust key load`, passphrase variables, unsigned pull, then `docker trust sign`.
- The deployment step said DCT would automatically verify Kubernetes pulls. Kubernetes does not use Docker CLI DCT settings for admission; corrected the wording to say the admission controller verifies signatures.
- The Connaisseur example used `trust_roots`, but the documented Helm values key is `trustRoots`. Corrected the field name.
- The Cosign install command pinned the old v2.0.0 binary. Updated it to the official latest-release binary URL.
- Added a DCT retirement caveat based on Docker's current documentation.

## Review Notes
The guide is technically valid after the fixes, but Notary v1 and Docker Content Trust are legacy choices in 2026. For new Kubernetes image-signing deployments, Cosign or Notation should generally be preferred.
