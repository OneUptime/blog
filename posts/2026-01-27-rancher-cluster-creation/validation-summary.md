# Validation Summary: How to Create Kubernetes Clusters with Rancher

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Kubernetes
- Rancher Manager
- RKE1
- RKE2
- K3s
- Amazon EC2
- Amazon EKS
- AWS cloud controller manager
- AWS EBS CSI driver
- Rancher Terraform provider
- OneUptime Kubernetes Agent
- Helm

## Sources Consulted
- Rancher RKE1 configuration docs: https://rke.docs.rancher.com/config-options
- Rancher RKE1 services docs: https://rke.docs.rancher.com/config-options/services
- RKE2 server configuration reference: https://docs.rke2.io/reference/server_config
- RKE2 hardening guide: https://docs.rke2.io/security/hardening_guide
- RKE2 v1.35 release notes: https://docs.rke2.io/release-notes/v1.35.X
- Rancher RKE2 cluster configuration reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher Amazon EC2 cluster docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider/create-an-amazon-ec2-cluster
- Rancher EKS cluster configuration reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/eks-cluster-configuration
- Rancher registering existing clusters docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/register-existing-clusters
- Rancher Terraform provider cluster resource docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/docs/resources/cluster.md
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Kubernetes ResourceQuota docs: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes service account docs: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- OneUptime Kubernetes Agent docs: https://oneuptime.com/docs/telemetry/kubernetes-agent

## Issues Found
- RKE1 was described as a current full-lifecycle production option. Updated the comparison and RKE1 section to state that RKE1 reached end of life on July 31, 2025, and is legacy-only for Rancher 2.12.0 and later.
- The RKE CLI example used `rke config --validate`, which is not a current documented validation command. Removed it and kept `rke up --config`.
- The cluster health check used deprecated `kubectl get componentstatuses`. Replaced it with the Kubernetes API server readiness endpoint via `kubectl get --raw='/readyz?verbose'`.
- The RKE2 CIS profile used `profile: cis-1.23`, which is deprecated in current RKE2 releases. Updated the example to `profile: cis`.
- The Rancher AWS node template used the legacy `management.cattle.io/v3` `NodeTemplate` shape. Updated it to an RKE2/K3s machine config example using `rke-machine-config.cattle.io/v1` `Amazonec2Config`.
- The EKS example used an outdated Rancher YAML shape and pinned EKS Kubernetes `1.28`, which is no longer in current EKS support. Replaced it with the documented `rancher2_cluster` `eks_config_v2` Terraform shape and updated the example to Kubernetes `1.35`.
- RKE2 custom and HA cluster examples used the old Rancher management API and an outdated RKE2 version. Updated them to `provisioning.cattle.io/v1`, moved `kubernetesVersion` to the current provisioning shape, and updated examples to `v1.35.5+rke2r1`.
- The custom node registration script tried to fetch a registration command from the wrong API path and checked for a preinstalled container runtime even though Rancher System Agent installs RKE2. Updated it to use the Rancher-generated system agent install pattern and fixed shell argument handling for role flags and labels.
- The AWS cloud provider snippet implied that a cloud provider ConfigMap alone enabled dynamic EBS provisioning. Clarified that modern clusters should use the external AWS cloud controller manager and the AWS EBS CSI driver.
- The imported-cluster agent configuration showed an unsupported ConfigMap. Replaced it with Rancher agent environment variable configuration.
- The OneUptime monitoring section used non-documented `oneuptime/agent:latest` and `oneuptime.com/v1 HealthCheck` manifests. Replaced them with the documented OneUptime Kubernetes Agent Helm chart install and verification commands.
- The etcd troubleshooting command used `kubectl exec -it` in a script. Removed the interactive TTY flags.

## Review Notes
The remaining infrastructure examples still use placeholder IDs, credentials, hostnames, AMIs, and network values that must be replaced for a real environment. Rancher and Kubernetes support matrices change frequently, so pinned Kubernetes versions should be checked again before publication or reuse.
