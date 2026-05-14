# Validation Summary: How to Set Up Flux CD on Oracle Container Engine for Kubernetes (OKE)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Oracle Container Engine for Kubernetes (OKE)
- Oracle Cloud Infrastructure CLI
- Oracle Cloud Infrastructure Registry (OCIR)
- OCI Vault
- Kubernetes
- Flux CD
- External Secrets Operator
- Helm
- GitHub
- Slack notifications

## Sources Consulted
- Oracle OCI CLI `ce cluster create` command reference: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/ce/cluster/create.html
- Oracle OKE cluster creation documentation: https://docs.oracle.com/en-us/iaas/Content/ContEng/Tasks/create-cluster.htm
- Oracle OCI CLI `ce cluster create-kubeconfig` command reference: https://docs.oracle.com/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/ce/cluster/create-kubeconfig.html
- Oracle Container Registry Docker CLI documentation: https://docs.oracle.com/en-us/iaas/Content/Registry/Tasks/registrypushingimagesusingthedockercli.htm
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes private registry image pull documentation: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Flux bootstrap GitHub command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- External Secrets Operator Oracle Vault provider documentation: https://external-secrets.io/latest/provider/oracle-vault/
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator Helm chart listing: https://artifacthub.io/packages/helm/external-secrets-operator/external-secrets

## Issues Found
- The OCIR registry secret was created only in `flux-system`, but the sample Deployment runs in the `default` namespace and references `imagePullSecrets`. Added a second `kubectl create secret docker-registry` command for the application namespace.
- The post used an ImagePolicy marker and stated Flux would update the image tag, but it did not define an ImageUpdateAutomation. Added a minimal `ImageUpdateAutomation` manifest for the marked app manifests.
- The External Secrets Operator Helm chart version was pinned to the outdated `0.9.x` line. Updated the range to `2.x`.
- The infrastructure manifests were placed outside the bootstrapped cluster path but no Flux Kustomization reconciled them. Added an infrastructure `Kustomization`.
- The OCI Vault `ClusterSecretStore` used `external-secrets.io/v1beta1` and an incorrect Oracle user-principal auth shape. Updated it to `external-secrets.io/v1`, added `principalType: UserPrincipal`, moved user and tenancy OCIDs to the documented fields, and kept only private key and fingerprint in `secretRef`.
- The referenced OCI credentials Secret was not created. Added a `kubectl create secret generic oci-credentials` command with the expected key names.
- The OCI Vault `ExternalSecret` used `external-secrets.io/v1beta1` and described `remoteRef.key` as a Vault secret OCID. Updated it to `external-secrets.io/v1` and used a Vault secret name, matching the Oracle provider examples.
- The Flux notification resources used `notification.toolkit.fluxcd.io/v1`, but current Flux notification Provider and Alert examples use `notification.toolkit.fluxcd.io/v1beta3`. Updated both resources.

## Review Notes
The OKE cluster creation snippet remains a minimal example. A production OKE setup generally also needs complete subnet, endpoint, node pool, IAM policy, and networking configuration tailored to the tenancy.
