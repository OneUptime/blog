# Validation Summary: How to Upgrade EKS Clusters with Managed Node Group Rolling Updates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EKS
- EKS managed node groups
- AWS CLI
- AWS CloudFormation
- Kubernetes
- PodDisruptionBudgets
- kubectl
- jq
- Amazon EC2 launch templates

## Sources Consulted
- Amazon EKS User Guide: Update a managed node group for your cluster - https://docs.aws.amazon.com/eks/latest/userguide/update-managed-node-group.html
- Amazon EKS User Guide: Understand each phase of node updates - https://docs.aws.amazon.com/eks/latest/userguide/managed-node-update-behavior.html
- Amazon EKS User Guide: Update existing cluster to new Kubernetes version - https://docs.aws.amazon.com/eks/latest/userguide/update-cluster.html
- Amazon EKS User Guide: Understand the Kubernetes version lifecycle on EKS - https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- AWS CLI Command Reference: eks update-nodegroup-config - https://docs.aws.amazon.com/cli/latest/reference/eks/update-nodegroup-config.html
- AWS CLI Command Reference: eks update-nodegroup-version - https://docs.aws.amazon.com/cli/latest/reference/eks/update-nodegroup-version.html
- AWS CloudFormation Template Reference: AWS::EKS::Nodegroup UpdateConfig - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-eks-nodegroup-updateconfig.html
- Kubernetes Documentation: Field Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes API Reference: PodDisruptionBudget policy/v1 - https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/

## Issues Found
- The examples used Kubernetes version 1.29, which is no longer a current standard-support EKS example version as of this review. Updated the target examples to 1.34.
- The node group update configuration command and CloudFormation example set both `maxUnavailable` and `maxUnavailablePercentage` together. Updated the examples to show them as separate alternatives.
- The CloudFormation `AWS::EKS::Nodegroup` example omitted required properties and used an outdated release version. Added placeholder `NodeRole` and `Subnets` values and changed the version field to `Version: "1.34"`.
- The version-check scripts iterated over AWS CLI `--output text` list results without splitting tab-delimited output. Added tab splitting and safer `read -r` usage.
- The PDB verification script passed a Kubernetes JSONPath object rendering to `jq fromjson`, which would not parse correctly. Changed it to fetch the deployment selector as compact JSON and pass it with `--argjson`.
- The monitoring script used `status.phase=Terminating`, but `Terminating` is represented by `metadata.deletionTimestamp`, not a Pod phase. Updated the command to filter Pods with a deletion timestamp.
- The monitoring snippet placed multiple blocking watch commands in one script without clarifying how to run them. Added guidance to run those commands in separate terminals during the upgrade.
- The failure-handling section referred to rollback, but AWS documents that node groups cannot be rolled back to an earlier Kubernetes or AMI version. Reworded it to troubleshooting and retrying after resolving the issue.
- The launch template update example used `aws eks update-nodegroup-config --launch-template`, which is not a valid option. Changed it to `aws eks update-nodegroup-version --launch-template`.
- The troubleshooting script filtered for `Running` Pods and then searched for `Pending` or `Unknown`, which could not return the intended results. Updated it to list Pods whose phase is not `Running` or `Succeeded`.
- The post described the strategy as "zero downtime"; EKS managed node group updates reduce disruption but cannot guarantee zero downtime for every workload. Reworded this as low or minimal disruption.

## Review Notes
The commands are structurally correct examples, but operators still need to choose a target Kubernetes version that is exactly one minor version above the current control plane version and supported in their AWS Region. PDB selector checks in the example cover exact `matchLabels` matches and may need expansion for more complex selectors.
