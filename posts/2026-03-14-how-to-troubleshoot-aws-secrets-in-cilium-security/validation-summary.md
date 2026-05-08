# Validation Summary: Troubleshooting AWS Secrets Issues in Cilium Security

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium AWS ENI IPAM
- Kubernetes and kubectl
- Amazon EKS IRSA
- AWS IAM
- AWS CLI
- AWS CloudTrail
- AWS STS

## Sources Consulted
- Cilium AWS ENI IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/eni/
- Cilium sysdump command reference for default operator label selector: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- eksctl IAM Roles for Service Accounts documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- AWS CLI EKS describe-cluster command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/describe-cluster.html
- AWS CloudTrail lookup-events documentation: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events-cli.html
- AWS STS get-caller-identity command reference: https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html

## Issues Found
- The post said AWS credential issues prevent both the Cilium agent and operator from managing ENIs. Cilium's AWS ENI documentation describes the operator as the component that communicates with the EC2 API to create ENIs and allocate IPs, so the introduction was corrected to focus on the operator.
- The operator log selector used `-l name=cilium-operator`, which is not the default Cilium operator label. It was changed to use the `deploy/cilium-operator` resource directly.
- The examples used `kubectl exec -l ...`, but the current kubectl exec reference supports pod or resource names, not a label selector. The commands now first resolve the operator pod name with `kubectl get pod -l io.cilium/app=operator` and then execute against that pod.
- IRSA validation and service account recreation targeted the `cilium` service account. Because AWS ENI allocation permissions are required by the Cilium operator, these commands now target the `cilium-operator` service account.
- The AWS CLI test inside the pod assumed the CLI is present in the Cilium image. The command was kept as a diagnostic check but clarified that it only applies if the AWS CLI is available in the image.

## Review Notes
The remaining AWS CLI commands and options are valid. The CloudTrail example is syntactically correct but only searches recent management events in the configured AWS Region, so users may need to set the correct `--region` when investigating denied EC2 calls.
