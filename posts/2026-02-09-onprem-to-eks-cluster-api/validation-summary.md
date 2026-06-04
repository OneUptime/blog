# Validation Summary: How to Migrate On-Premises Kubernetes Clusters to EKS Using Cluster API

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes
- Amazon EKS
- Cluster API
- Cluster API Provider AWS
- Velero
- Helm
- AWS Load Balancer Controller
- Amazon EBS CSI Driver
- Cluster Autoscaler
- IAM Roles for Service Accounts

## Sources Consulted
- Cluster API `clusterctl init` documentation: https://cluster-api.sigs.k8s.io/clusterctl/commands/init.html
- Cluster API Provider AWS EKS support documentation: https://cluster-api-aws.sigs.k8s.io/topics/eks/index.html
- Cluster API Provider AWS EKS cluster creation documentation: https://cluster-api-aws.sigs.k8s.io/topics/eks/creating-a-cluster
- Cluster API Provider AWS `clusterawsadm bootstrap iam create-cloudformation-stack` documentation: https://cluster-api-aws.sigs.k8s.io/clusterawsadm/clusterawsadm_bootstrap_iam_create-cloudformation-stack
- Amazon EKS Kubernetes version lifecycle documentation: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS AWS Load Balancer Controller Helm installation documentation: https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html
- Amazon EKS EBS CSI Driver documentation: https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
- Velero restore resource modifiers documentation: https://velero.io/docs/v1.12/restore-resource-modifiers/
- Velero restore reference documentation: https://velero.io/docs/v1.18/restore-reference/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/

## Issues Found
- The management cluster setup used an outdated `clusterctl` version, did not install `clusterawsadm`, and used `clusterawsadm` before installing it. Updated the install commands and added the required CAPA IAM bootstrap command.
- The AWS provider initialization omitted the EKS feature gate required by CAPA EKS support. Added `EXP_EKS=true` to the `clusterctl init` command.
- The hand-written EKS manifests used old provider API versions and a fragile CRD shape. Replaced them with `clusterctl generate cluster --flavor eks`, which is the documented CAPA workflow for generating EKS manifests.
- The EKS version was set to Kubernetes `v1.28`, which is no longer available in EKS standard or extended support as of the review date. Updated the example to `v1.35.0`, a current standard-support EKS version.
- The kubeconfig command used `clusterctl get kubeconfig`, but CAPA documents EKS user kubeconfigs in the `<cluster-name>-user-kubeconfig` secret. Updated the command to read and decode that secret.
- The worker readiness wait used a non-standard `NodeHealthy` condition for `MachineDeployment`. Updated it to wait for the `Available` condition.
- The add-on Helm examples omitted IAM role annotations needed by controllers that call AWS APIs. Added IRSA role annotations to the service accounts in the Helm values.
- The Velero AWS plugin version was outdated. Updated it to `velero/velero-plugin-for-aws:v1.13.0`.
- The Velero transformation ConfigMap used a made-up mapping format that Velero does not understand. Replaced it with a valid `resourceModifierRules` ConfigMap using JSON Patch operations.
- The Velero restore command did not reference the transformation ConfigMap. Added `--resource-modifier-configmap eks-transformations`.
- The Deployment snippet in the IRSA section was invalid because `apps/v1` Deployments require a selector and matching pod template labels. Added both.
- The validation script used a PVC field selector that is not a supported Kubernetes field selector. Replaced it with a JSON query using `jq`.
- The endpoint validation `jq` expression could fail when `subsets` is absent. Updated it to handle missing `subsets` safely.

## Review Notes
- The guide remains a high-level migration example. In a production migration, readers should still define exact IAM policies, OIDC trust relationships, VPC/subnet configuration, storage migration strategy, DNS cutover, rollback criteria, and application-specific validation outside these snippets.
