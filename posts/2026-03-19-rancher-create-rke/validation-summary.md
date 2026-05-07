# Validation Summary: How to Create an RKE Cluster in Rancher

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- Rancher Kubernetes Engine (RKE1)
- Kubernetes
- Docker
- `kubectl`
- etcd

## Sources Consulted
- Rancher RKE1 requirements: https://rke.docs.rancher.com/os
- Rancher custom-node RKE cluster creation: https://ranchermanager.docs.rancher.com/v2.10/reference-guides/cluster-configuration/rancher-server-configuration/use-existing-nodes
- Rancher agent options for custom nodes: https://ranchermanager.docs.rancher.com/v2.10/reference-guides/cluster-configuration/rancher-server-configuration/use-existing-nodes/rancher-agent-options
- Rancher RKE1 cluster configuration reference: https://ranchermanager.docs.rancher.com/v2.11/reference-guides/cluster-configuration/rancher-server-configuration/rke1-cluster-configuration
- Rancher port requirements: https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/installation-requirements/port-requirements
- Rancher Docker installation guidance: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements/install-docker
- Rancher monitoring installation guidance: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Rancher cluster backup and snapshot guidance: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-rancher-launched-kubernetes-clusters
- RKE1 audit log configuration: https://rke.docs.rancher.com/config-options/audit-log
- Kubernetes PodSecurityPolicy removal notice: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- `kubectl create deployment` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/

## Issues Found
- The introduction and conclusion treated RKE1 as currently supported. I updated them to reflect that RKE1 reached end of life on July 31, 2025 and that Rancher 2.12.0 and later no longer support provisioning or managing downstream RKE1 clusters.
- The prerequisites said Rancher `v2.7 or later`, which is too broad for RKE1 in 2026. I changed this to Rancher environments that still support RKE1, such as Rancher v2.11.x.
- The Docker installation section used `yum install -y docker` for RHEL/CentOS. That is not appropriate for RKE1 because Rancher documents require upstream Docker on those platforms; I replaced the commands with Rancher’s supported Docker install script pattern plus support-matrix guidance.
- The node-preparation section listed a large set of kernel modules as baseline requirements. Rancher’s documented baseline requirement is `br_netfilter` plus sysctl settings, with other kernel-module needs depending on the selected CNI. I reduced the example to the documented baseline.
- The port table mixed in ports that are not the right baseline for Rancher-launched custom-node RKE clusters and omitted important ones. I corrected it to match Rancher’s custom-node port guidance and added the monitoring port caveat for the later monitoring step.
- The Rancher UI flow said to select `RKE1` under custom cluster options. Rancher’s documented RKE custom-node flow is `Cluster Management` > `Create` > `Custom`, so I corrected that step.
- The Weave and PodSecurityPolicy notes were too loose for current readers. I clarified that Weave is deprecated for Kubernetes v1.27+ and that PodSecurityPolicy was removed in Kubernetes v1.25.
- The audit-log YAML snippet was incomplete as written. I updated it to the valid `services.kube-api.audit_log` structure used by RKE.
- The sample workload commands were ambiguous because the deployment did not declare a container port and the service did not set a target port. I updated the commands to use `--port=80` on the deployment and `--target-port=80` on the service.
- The monitoring instruction referenced the old “Rancher Apps page” wording. I updated it to the current Rancher UI paths documented for monitoring installation.

## Review Notes
- This post is now technically accurate as a legacy RKE1 guide, not as a guide for current default Rancher deployments.
- New downstream clusters should use RKE2 instead of RKE1.
- Exact Kubernetes, Docker, and OS combinations must still be selected from the Rancher/RKE support matrix for the Rancher version in use.
