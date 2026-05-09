# Validation Summary: Troubleshoot Calico Installation on IBM Kubernetes Service

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- IBM Cloud Kubernetes Service
- Calico
- calicoctl
- kubectl
- Kubernetes network policies

## Sources Consulted
- IBM Cloud Kubernetes Service CLI reference: https://cloud.ibm.com/docs/containers?topic=containers-kubernetes-service-cli
- IBM Cloud Kubernetes Service network policies documentation: https://cloud.ibm.com/docs/containers?topic=containers-network_policies
- IBM Cloud Kubernetes Service architecture documentation: https://cloud.ibm.com/docs/containers?topic=containers-service-arch
- Calico calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico IPAM command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- GitHub author profile link: https://github.com/nawazdhandala

## Issues Found
- The `calicoctl` setup step used `ibmcloud ks cluster config --admin --network` as the required IKS-specific configuration path. IBM's current network policy documentation for Kubernetes version 1.19 and later documents `ibmcloud ks cluster config --cluster <cluster_name_or_ID>` followed by `export DATASTORE_TYPE=kubernetes`. Updated the instructions, prerequisite wording, and verification comment to match the current documented setup.
- Fixed the best-practices line "before upgrading-Calico updates are managed by IBM" to "before upgrading; Calico updates are managed by IBM" so the technical note is clear.

## Review Notes
The remaining `kubectl`, `calicoctl get`, `calicoctl apply`, and `calicoctl ipam` examples match the documented command forms. The IPAM release command should be used only for addresses from endpoints that were not cleanly removed, which is consistent with the post's leaked-address context.
