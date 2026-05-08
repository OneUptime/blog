# Validation Summary: Upgrade Calico on IBM Kubernetes Service Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IBM Kubernetes Service
- IBM Cloud CLI Kubernetes Service plugin
- Calico and calicoctl
- Kubernetes NetworkPolicy
- IBM Cloud Object Storage CLI

## Sources Consulted
- IBM Cloud Docs: Updating clusters, worker nodes, and cluster components: https://cloud.ibm.com/docs/containers?topic=containers-update
- IBM Cloud Docs: IBM Cloud Kubernetes Service CLI reference: https://cloud.ibm.com/docs/containers?topic=containers-kubernetes-service-cli
- IBM Cloud Docs: Controlling traffic with network policies: https://cloud.ibm.com/docs/containers?topic=containers-network_policies
- IBM Cloud Docs: Kubernetes version information: https://cloud.ibm.com/docs/containers?topic=containers-cs_versions
- IBM Cloud Docs: IBM Cloud Object Storage CLI: https://cloud.ibm.com/docs/cloud-object-storage?topic=cloud-object-storage-ic-cos-cli
- Calico Documentation: Configure calicoctl: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico Documentation: Configure calicoctl for the Kubernetes API datastore: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico Documentation: calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes Documentation: Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The introduction implied operators can install newer Calico versions alongside IBM-managed Calico components. IBM documents IKS Calico as a managed cluster network plug-in, so the post now describes operator-managed policy resources instead of side-by-side Calico installation.
- The calicoctl setup described connecting to an IKS etcd cluster and wrote a config file to a non-default path. Current IBM guidance for Kubernetes 1.19 and later uses the Kubernetes API datastore with `DATASTORE_TYPE=kubernetes`, and IBM's `cluster config --network` option downloads network configuration, so the commands were corrected.
- The upgrade command used deprecated `ibmcloud ks cluster update` syntax and a Kubernetes 1.29 target version, which is no longer a supported IKS target version as of the validation date. The post now uses `ibmcloud ks cluster master update` with a placeholder target version discovered through `ibmcloud ks versions --show-version kubernetes`.
- The worker update flow treated reload as the general upgrade path. IBM documents `worker update` for classic worker major/minor updates and `worker replace --update` for VPC worker nodes, so the commands and wording were corrected.
- The worker listing command used `ibmcloud ks workers`, while the current documented command is `ibmcloud ks worker ls`. This was corrected.
- The validation step created a Kubernetes `NetworkPolicy` but attempted to verify it with `calicoctl`. The check now uses `kubectl get networkpolicy` for the Kubernetes resource.
- The best-practice recommendation to use VSI snapshots for IKS worker backups was replaced with IBM's documented operational concern: keep persistent data outside worker nodes and ensure enough spare capacity during worker updates or replacements.

## Review Notes
The post remains a high-level operational guide. Future improvements could add an explicit workload-level connectivity test between labeled pods, but the corrected validation commands are technically accurate for checking Calico health and Kubernetes NetworkPolicy resource acceptance.
