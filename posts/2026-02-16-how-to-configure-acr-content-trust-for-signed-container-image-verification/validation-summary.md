# Validation Summary: How to Configure ACR Content Trust for Signed Container Image Verification

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Container Registry
- Docker Content Trust
- Docker CLI
- Notary v1 / TUF
- Azure CLI
- Azure Pipelines
- Azure Policy for Kubernetes
- AKS
- Notation / Notary Project
- Ratify / Gatekeeper

## Sources Consulted
- Microsoft Learn: Manage signed images by using Docker Content Trust in Azure Container Registry - https://learn.microsoft.com/azure/container-registry/container-registry-content-trust
- Microsoft Learn: Docker Content Trust in Azure Pipelines - https://learn.microsoft.com/azure/devops/pipelines/ecosystems/containers/content-trust
- Docker Docs: Content trust in Docker - https://docs.docker.com/engine/security/trust/
- Docker Docs: Manage keys for content trust - https://docs.docker.com/engine/security/trust/trust_key_mng/
- Docker Docs: Delegations for content trust - https://docs.docker.com/engine/security/trust/trust_delegation/
- Docker Docs: docker trust key generate - https://docs.docker.com/reference/cli/docker/trust/key/generate/
- Docker Docs: docker trust key load - https://docs.docker.com/reference/cli/docker/trust/key/load/
- Docker Docs: docker trust signer add - https://docs.docker.com/reference/cli/docker/trust/signer/add/
- Microsoft Learn: Azure Policy built-in definitions for Azure Kubernetes Service - https://learn.microsoft.com/azure/aks/policy-reference
- Microsoft Learn: Verify Container Image Signatures with Ratify and Azure Policy - https://learn.microsoft.com/azure/container-registry/container-registry-tutorial-verify-with-ratify-aks
- Ratify documentation: Verifiers - https://ratify.dev/docs/reference/custom%20resources/verifiers/

## Issues Found
- ACR Docker Content Trust availability was outdated. Microsoft documentation now states that, starting May 31, 2026, DCT cannot be enabled on new registries or registries that had not enabled it previously, and that DCT is scheduled for removal on March 31, 2028. Updated the introduction, prerequisites, Step 1, and conclusion with this caveat.
- Signing permissions were incomplete. ACR requires `AcrImageSigner` in addition to push permissions for trusted image pushes. Added the role assignment command and token refresh note.
- The CI/CD key export command was invalid. Docker does not provide `docker trust key export`; its current trust-key subcommands are `generate` and `load`. Replaced the section with the documented delegation-key workflow and an Azure Pipelines secure-file pattern.
- The Azure Pipelines example was incomplete for DCT signing. Reworked it to log in, install the delegation private key into the Docker trust store, build, and push with content trust enabled and the signing passphrase supplied as a secret.
- The AKS enforcement section incorrectly implied AKS can enforce DCT signatures directly. Updated it to state that DCT is Docker-client enforcement, while AKS admission-time signature verification requires Notation/Ratify or a similar admission controller.
- The Azure Policy example was mislabeled as signature enforcement. The built-in policy ID `febd0533-8e55-448f-b837-bd0e06f16469` restricts allowed image registries; it does not verify signatures. Renamed the assignment and added the `effect` parameter.
- The Ratify constraint example mixed unsupported fields with DCT. Replaced it with the documented Ratify Gatekeeper template and default constraint commands, and clarified that Ratify verifies Notary Project/Notation signatures rather than DCT/Notary v1 signatures.
- The signing and verification sequence diagram incorrectly showed AKS fetching Notary trust data for DCT. Updated the deployment side to show admission policy checks before image pull.

## Review Notes
- The local environment did not have the Azure CLI installed, so Azure CLI command syntax was verified against Microsoft Learn rather than local `az --help`.
- Docker Content Trust remains useful only for existing DCT workflows. For new ACR signing and AKS enforcement designs, Notary Project, Notation, and Ratify are the supported direction.
