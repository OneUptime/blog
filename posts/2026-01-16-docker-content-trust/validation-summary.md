# Validation Summary: How to Use Docker Content Trust for Image Signing

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Docker Content Trust (DCT)
- Docker CLI trust commands
- Notary v1
- Mirantis Container Runtime
- GitHub Actions
- Jenkins Pipeline
- Connaisseur
- Open Policy Agent (OPA) / Rego
- Kubernetes admission control

## Sources Consulted
- Docker Docs: Content trust in Docker - https://docs.docker.com/engine/security/trust/
- Docker Docs: Automation with content trust - https://docs.docker.com/engine/security/trust/trust_automation/
- Docker Docs: Manage keys for content trust - https://docs.docker.com/engine/security/trust/trust_key_mng/
- Docker CLI reference: docker trust key generate - https://docs.docker.com/reference/cli/docker/trust/key/generate/
- Docker CLI reference: docker trust key load - https://docs.docker.com/reference/cli/docker/trust/key/load/
- Docker CLI reference: docker trust signer add - https://docs.docker.com/reference/cli/docker/trust/signer/add/
- Docker Docs: Deploy Notary Server with Compose - https://docs.docker.com/engine/security/trust/deploying_notary/
- Mirantis Docs: Runtime Enforcement with Docker Content Trust - https://docs.mirantis.com/mcr/25.0/security/content-trust/runtime-enforcement.html
- Notary command reference - https://github.com/notaryproject/notary/blob/master/docs/command_reference.md
- Notary signer configuration reference - https://github.com/notaryproject/notary/blob/master/docs/reference/signer-config.md
- Connaisseur documentation: Getting Started / Notary v1 validator examples - https://sse-secure-systems.github.io/connaisseur/v2.8.1/getting_started/
- Open Policy Agent policy language documentation - https://openpolicyagent.org/docs/policy-language

## Issues Found
- Docker Content Trust retirement was not mentioned. Added a note that Docker is retiring DCT and that `notary.docker.io` is scheduled to shut down on December 8, 2026.
- The post described DCT as Docker-wide behavior. Clarified that standard DCT enforcement is Docker client behavior.
- The Docker daemon configuration used an invalid `mode` value (`enforce`) and implied support in Docker CE. Changed it to `enforced` and clarified that daemon runtime enforcement is a Mirantis Container Runtime feature, not Docker CE or Moby.
- JSON snippets included JavaScript-style comments. Removed those comments so the JSON examples are valid.
- `docker trust key list` is not in the current Docker CLI trust key reference. Replaced it with `notary key list`.
- `docker trust key load` examples used non-official option ordering. Updated them to the documented `docker trust key load --name NAME KEYFILE` form.
- CI examples loaded signing keys without providing the passphrase in the import step. Added `DOCKER_CONTENT_TRUST_REPOSITORY_PASSPHRASE` where keys are loaded.
- The root key backup path used `~/.docker/trust/private/root_keys/`, but current Docker documentation describes Docker trust keys under `~/.docker/trust/private`. Updated the path and backup command.
- The key rotation example said it rotated the repository key, but the commands generated and replaced a delegation signer. Updated the comments to describe delegation key rotation.
- The HSM / PKCS#11 Notary configuration snippet was not supported by Docker Content Trust / Notary v1 documentation. Replaced it with the documented hardware storage behavior for root keys with YubiKey 4.
- The self-hosted Notary Compose example used unsupported/incomplete service configuration. Replaced it with the official flow of cloning the Notary repository and running its included Compose setup.
- The Docker config file example for a custom Notary trust server was not supported by the Docker DCT docs. Kept the documented `DOCKER_CONTENT_TRUST_SERVER` environment variable.
- `DOCKER_CONTENT_TRUST_DEBUG` could not be verified in official Docker documentation. Replaced it with the documented Docker CLI `--debug` flag.
- The complete CI/CD example copied root and repository keys into CI paths, contradicting the post's own root-key security guidance and Docker's delegation workflow. Updated it to load a delegation key instead.

## Review Notes
Docker Content Trust is still technically documented, but it is in retirement. Future updates should consider recommending modern image signing options such as Sigstore Cosign or Notation/Notary v2 for new deployments.
