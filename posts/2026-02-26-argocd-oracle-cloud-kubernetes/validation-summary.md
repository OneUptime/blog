# Validation Summary: How to Use ArgoCD with Oracle Cloud Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Oracle Kubernetes Engine (OKE)
- Oracle Cloud Infrastructure CLI
- Kubernetes Services, Secrets, StorageClasses, and PersistentVolumeClaims
- OCI Load Balancer and Network Load Balancer
- Oracle Cloud Infrastructure Registry (OCIR)
- External Secrets Operator
- OCI Vault
- OCI Block Volume CSI driver
- OCI IAM dynamic groups and policies

## Sources Consulted
- Argo CD Getting Started: https://argo-cd.readthedocs.io/en/latest/getting_started/
- Argo CD Declarative Setup: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD OCI support: https://argo-cd.readthedocs.io/en/latest/user-guide/oci/
- OCI CLI `ce cluster create-kubeconfig`: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/ce/cluster/create-kubeconfig.html
- OCI CLI `ce node-pool create`: https://docs.oracle.com/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/ce/node-pool/create.html
- OKE load balancer annotation summary: https://docs.oracle.com/en-us/iaas/Content/ContEng/Tasks/contengcreatingloadbalancer_topic-Summaryofannotations.htm
- OKE load balancer and network load balancer configuration: https://docs.oracle.com/en-us/iaas/Content/ContEng/Tasks/contengconfiguringloadbalancersnetworkloadbalancers-subtopic.htm
- OCIR login documentation: https://docs.oracle.com/en-us/iaas/Content/Functions/Tasks/functionslogintoocir.htm
- OCI Container Registry concepts: https://docs.oracle.com/en-us/iaas/Content/Registry/Concepts/registryconcepts.htm
- External Secrets Operator Oracle Vault provider: https://external-secrets.io/latest/provider/oracle-vault/
- External Secrets Operator getting started: https://external-secrets.io/latest/introduction/getting-started/
- External Secrets Operator stability and support: https://external-secrets.io/latest/introduction/stability-support/
- OKE Block Volume PVC documentation: https://docs.oracle.com/en-us/iaas/Content/ContEng/Tasks/contengcreatingpersistentvolumeclaim_topic-Provisioning_PVCs_on_BV.htm
- OCI Always Free resources: https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm
- OKE pricing: https://www.oracle.com/cloud/cloud-native/container-engine-kubernetes/pricing/

## Issues Found
- Updated the Argo CD install command to use `kubectl apply --server-side --force-conflicts`, matching current Argo CD installation guidance for large CRDs.
- Corrected the OCIR image pull secret username placeholder from `<TENANCY>/<USERNAME>` to `<TENANCY_NAMESPACE>/<USERNAME>`, because OCIR requires the tenancy Object Storage namespace, not the tenancy display name.
- Updated External Secrets Operator examples from deprecated `external-secrets.io/v1beta1` resources to `external-secrets.io/v1`.
- Updated the External Secrets Operator chart target from `0.9.x` to `2.4.x`, the current supported minor line as of the review date.
- Corrected the OCI Vault `ClusterSecretStore` structure by adding `principalType: UserPrincipal`, moving `user` and `tenancy` under `auth`, and using the documented `privateKey` key name.
- Replaced the incorrect Block Volume ultra-high-performance PVC annotation example with a StorageClass using `vpusPerGB`, which is the documented way to set block volume performance for dynamically provisioned PVCs.
- Clarified the free-tier wording to say OKE Basic Cluster control planes are free and Always Free Ampere A1 compute hours apply, rather than implying every OKE control plane configuration is free.

## Review Notes
The OCI region-key OCIR hostname format such as `iad.ocir.io` remains valid for OC1 realms, though Oracle now also documents the `ocir.<region-identifier>.oci.oraclecloud.com` registry domain format. The load balancer snippets use valid OKE annotations; production deployments should still decide explicitly between TLS termination at the OCI load balancer and TLS passthrough to Argo CD.
