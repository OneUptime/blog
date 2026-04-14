# Validation Summary: How to Use Dapr with Confidential Computing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar, state stores, secret stores, state encryption)
- Confidential Containers (CoCo) - CNCF Sandbox project
- Intel TDX (Trust Domain Extensions)
- AMD SEV (Secure Encrypted Virtualization)
- Kata Containers (kata-qemu-tdx runtime)
- Kubernetes (Deployments, RuntimeClass, annotations)
- Azure Key Vault (Dapr secret store component)
- Azure Attestation (MAA)

## Sources Consulted
- Confidential Containers operator GitHub repository: https://github.com/confidential-containers/operator
- Confidential Containers Helm charts: https://github.com/confidential-containers/charts
- Dapr component schema documentation: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr state encryption how-to: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-encrypt-state/
- Dapr Azure Key Vault secret store reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/azure-keyvault/
- Azure Confidential Computing Secure Key Release: https://learn.microsoft.com/en-us/azure/confidential-computing/concept-skr-attestation
- Azure Attestation overview: https://learn.microsoft.com/en-us/azure/attestation/overview
- Kubernetes RuntimeClass documentation: https://kubernetes.io/docs/concepts/containers/runtime-class/
- Kubernetes Deployment spec: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/

## Issues Found

1. **CoCo operator install command was incorrect.** The blog used `kubectl apply -f` with a non-existent `install.yaml` release asset URL. The CoCo operator repo has no such file in its releases. Additionally, the operator repo was deprecated in early 2026 in favor of Helm charts. Fixed by replacing with the current Helm-based install method: `helm install coco oci://ghcr.io/confidential-containers/charts/confidential-containers`.

2. **Kubernetes Deployment YAML was missing required fields.** The Deployment spec omitted the mandatory `spec.selector.matchLabels` field and the corresponding `spec.template.metadata.labels`. Kubernetes would reject this Deployment. Added both fields with `app: payments-processor`.

3. **Dapr state encryption configuration used a fabricated schema.** The blog used a non-existent `spec.encryption` block with nested `key`/`secretRef` fields. This structure does not exist in Dapr's component schema. The correct approach is to add `primaryEncryptionKey` as a metadata entry with `secretKeyRef`. Fixed to use the documented `primaryEncryptionKey` metadata field.

4. **Azure Key Vault attestation comment was misleading.** The comment stated "Azure Key Vault validates the attestation report before releasing secrets." In reality, Azure Attestation (MAA) validates TEE attestation reports and issues a signed JWT, then Azure Key Vault's Secure Key Release feature checks the attestation claims. Fixed the comment to accurately describe the two-service flow.

## Review Notes
- The CoCo operator v0.10.0 referenced in the original post is from September 2024 and significantly outdated. The operator repo itself was deprecated and scheduled for archival as of February 2026. The fix uses the current Helm-based installation method.
- The `tdx-attest report` command referenced in the "Verifying TEE Attestation" section is presented as illustrative. The actual attestation tooling varies by cloud provider and TEE implementation. This is noted in the blog post itself ("tool depends on cloud provider").
- The TEE memory limits stated as "typically 4-64 GB" are reasonable for current Intel TDX and AMD SEV implementations, though exact limits depend on hardware generation and cloud provider configuration.
- The claim that the Dapr sidecar runs inside the TEE when `runtimeClassName` is set is correct -- all containers in a pod share the same runtime class.
