# Validation Summary: How to Import an EKS Cluster into Rancher

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- Amazon EKS
- Kubernetes
- AWS CLI
- `kubectl`
- AWS IAM

## Sources Consulted
- Rancher: Registering Existing Clusters: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/register-existing-clusters
- Rancher: Creating an EKS Cluster: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/set-up-clusters-from-hosted-kubernetes-providers/eks
- Rancher: EKS Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/eks-cluster-configuration
- Rancher: Cluster Configuration: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration
- Rancher: Nodes and Node Pools: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/manage-clusters/nodes-and-node-pools
- Rancher: Registered Clusters troubleshooting: https://ranchermanager.docs.rancher.com/v2.14/troubleshooting/other-troubleshooting-tips/registered-clusters
- Rancher: Enable Monitoring: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- AWS CLI: `aws eks update-kubeconfig`: https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- Amazon EKS: access entries: https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html
- Amazon EKS: `aws-auth` ConfigMap deprecation: https://docs.aws.amazon.com/eks/latest/userguide/auth-configmap.html
- Kubernetes: `kubectl auth can-i`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The post said the importing IAM principal must be mapped through the `aws-auth` ConfigMap. This is outdated for current EKS guidance. I updated the post to prefer EKS access entries and mention `aws-auth` only as a legacy fallback because AWS now documents `aws-auth` as deprecated.
- The post listed only `eks:DescribeCluster` and `eks:ListClusters` as the required permissions. That was too narrow for the later claims about Rancher-managed node groups and upgrades. I changed this to distinguish basic discovery permissions from the broader documented permissions required for Rancher EKS management features.
- The post described the Rancher import status flow as `Waiting` to `Provisioning` to `Active`. For registered clusters, Rancher documents the state as moving from `Pending` to `Active`. I corrected the status flow.
- The post suggested checking both `cattle-system` and `cattle-fleet-system` during import and verifying deployments generically. Rancher’s registered-cluster troubleshooting docs center on the `cattle-cluster-agent` in `cattle-system`, so I updated the verification commands to use the documented label selector for that agent.
- The post said EKS managed node groups are viewed and managed from the **Nodes** page. Rancher documents hosted and registered EKS node management differently; node group sizing/configuration is handled through cluster configuration, while the Nodes view is limited. I corrected that workflow.
- The monitoring instructions were too version-specific. I changed them to reference the documented Rancher monitoring app/chart entry points that vary by Rancher version.
- The networking section understated private-endpoint requirements. I updated it to reflect that Rancher also needs network access to a private or CIDR-restricted EKS API endpoint when managing the cluster as EKS.

## Review Notes
- Rancher’s documentation uses both “import” and “register” terminology. Current docs state that cluster registration replaced the older import feature, but the UI guidance still uses **Import Existing** in the cluster management flow.
- Rancher v2.7 is archived. The post remains usable, but UI labels and navigation can vary somewhat across newer Rancher releases, especially around monitoring installation and imported EKS registration options.
