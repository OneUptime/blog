# Validation Summary: How to Use Ansible to Create GCP GKE Clusters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- google.cloud Ansible collection
- Google Kubernetes Engine (GKE)
- Google Cloud CLI
- Kubernetes node pools, taints, NetworkPolicy, and kubectl access

## Sources Consulted
- Ansible google.cloud collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/index.html
- Ansible google.cloud.gcp_container_cluster module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_container_cluster_module.html
- Ansible google.cloud.gcp_container_node_pool module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_container_node_pool_module.html
- Google Cloud SDK gcloud container clusters get-credentials reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/get-credentials
- GKE kubectl access documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/cluster-access-for-kubectl
- GKE VPC-native clusters documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/alias-ips
- GKE private cluster documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/legacy/network-isolation
- GKE regional clusters documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/regional-clusters
- GKE network isolation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/network-isolation
- GKE network policy documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/network-policy

## Issues Found
- The prerequisites said "Ansible 2.9+" for the `google.cloud` collection. Current official collection documentation lists support for ansible-core 2.16.0 or newer, so this was updated to `ansible-core 2.16+`.
- The prerequisites did not mention the Google Cloud CLI even though the post uses `gcloud` commands. Added Google Cloud CLI as a prerequisite.
- The prerequisites referred to the "Container API"; Google names this the Google Kubernetes Engine API, while the service identifier remains `container.googleapis.com`. Updated the wording.
- The Python dependency command included `google-api-python-client`, which is not listed in the current official module requirements for these modules. Removed it and kept `google-auth` and `requests`.
- The VPC-native cluster examples specified secondary ranges but did not explicitly set `use_ip_aliases: true`. Added it to both cluster creation examples so the Ansible configuration directly enables alias IPs/VPC-native networking.
- The examples used `logging.googleapis.com/kubernetes` and `monitoring.googleapis.com/kubernetes`, but the current Ansible module accepts `logging.googleapis.com`/`none` and `monitoring.googleapis.com`/`none`. Updated both examples to the supported values.
- The regional cluster explanation said regional clusters are "required for production." Google documents regional clusters as a best practice/recommendation for production availability, so the wording was corrected.

## Review Notes
The cluster examples still use `initial_node_count`, which the Ansible module documentation marks as deprecated on `gcp_container_cluster`, while the module's own examples still use it and the module does not expose a straightforward replacement cluster node-pool block in the documented parameters. A future revision could create the cluster with the smallest default node pool and manage production node pools separately, as this post already demonstrates.
