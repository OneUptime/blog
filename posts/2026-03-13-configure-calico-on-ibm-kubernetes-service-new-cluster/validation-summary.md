# Validation Summary: Configure Calico on IBM Kubernetes Service for a New Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IBM Kubernetes Service
- IBM Cloud CLI Kubernetes Service plugin
- Kubernetes
- Calico
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico host endpoints
- calicoctl

## Sources Consulted
- IBM Cloud Docs: Controlling traffic with network policies - https://cloud.ibm.com/docs/containers?topic=containers-network_policies
- IBM Cloud Docs: Kubernetes Service CLI reference - https://cloud.ibm.com/docs/containers?topic=containers-kubernetes-service-cli
- IBM Cloud Docs: IBM Kubernetes Service architecture - https://cloud.ibm.com/docs/containers?topic=containers-service-arch
- Calico Documentation: NetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Documentation: Automatic labels - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico Documentation: Selector-based policies for host endpoints - https://docs.tigera.io/calico/latest/reference/host-endpoints/selector

## Issues Found
- The post used `ibmcloud ks zones --provider classic --region us-south`, but the current IBM Cloud Kubernetes Service CLI reference documents `ibmcloud ks zone ls --provider classic` with options such as `--region-only`. Updated the command accordingly.
- The post stated that `--admin --network` downloads a `~/.kube/calicoctl.cfg` file and used `--config=$CALICO_CONFIG_FILE` throughout. IBM's current Calico CLI setup for Kubernetes 1.19 and later uses the Kubernetes datastore with `DATASTORE_TYPE=kubernetes`, and `calicoctl` can use the active kubeconfig. Updated the setup and commands to match.
- The post claimed IKS provides Calico BGP capabilities and the full Calico feature set out of the box. IBM documents Calico as the managed CNI, IPAM, and policy provider, but also states that changing Calico components or default settings is unsupported. Reworded the claim to focus on supported policy capabilities.
- The host endpoint policy selected `ibm.role == "worker"`, but IBM documents automatically created host endpoints with `ibm.role: worker_public` and `ibm.role: worker_private`. Updated the example to select `worker_public`.
- The host endpoint policy denied all unmatched ingress, which could override IBM-managed host endpoint policies and disrupt exposed services or management traffic. Replaced it with a narrower allow policy for trusted SSH access that does not include a catch-all deny.
- The application policy used `order: 100`, while the best-practice section recommended application policies use values above 1000 so IBM system policies take precedence. Updated the example to `order: 3000`.

## Review Notes
The post is specific to classic IKS cluster networking. IBM's network policy documentation distinguishes classic clusters from VPC cluster secure-by-default networking, so future revisions should make that scope explicit if the guide is expanded.
