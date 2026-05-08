# Validation Summary: Validating AWS Secrets Configuration in Cilium Security

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Amazon EKS
- AWS IAM
- AWS CLI
- IRSA
- EKS Pod Identity

## Sources Consulted
- Cilium AWS ENI IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/eni/
- Cilium operator documentation: https://docs.cilium.io/en/stable/internals/cilium_operator/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium CLI status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Amazon EKS IAM roles for service accounts documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Amazon EKS service accounts documentation: https://docs.aws.amazon.com/eks/latest/userguide/service-accounts.html
- Amazon EKS assign IAM roles to service accounts documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- AWS CLI EC2 describe-network-interfaces reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-interfaces.html
- AWS CLI S3 ls reference: https://docs.aws.amazon.com/cli/latest/reference/s3/ls.html

## Issues Found
- The original examples used `kubectl exec -l k8s-app=cilium`, but `kubectl exec` does not support a label selector flag in the official command reference. Replaced those examples with `kubectl run` temporary AWS CLI pods and `kubectl get ... -o jsonpath` lookups.
- The original examples assumed the Cilium pod contains the AWS CLI. Cilium images should not be treated as general-purpose AWS CLI containers, so the checks now run a temporary AWS CLI image using the Cilium operator service account.
- The original examples targeted Cilium agent pods for AWS ENI permissions. Cilium documents the required AWS ENI privileges as Cilium operator privileges, so the examples now derive and use the `cilium-operator` deployment service account.
- The IRSA token check attempted to read the token from a Cilium pod. Updated it to verify the service account role annotation, which matches the EKS IRSA configuration model and avoids depending on tools or shell behavior inside Cilium containers.
- The least-privilege EC2 check was kept but moved to the operator service account context. This better matches Cilium's documented ENI allocation behavior and AWS CLI `describe-network-interfaces` syntax.
- The RBAC example originally grepped RoleBinding names, which does not verify whether the service account can read Secrets. Replaced it with `kubectl auth can-i get secrets --as=...`.
- The ConfigMap scan only checked keys. Expanded it to check both keys and common static AWS credential value patterns without printing secret values.
- Updated the troubleshooting and conclusion to mention EKS Pod Identity as a valid non-static credential mechanism alongside IRSA.

## Review Notes
The examples now depend on permission to create temporary pods in `kube-system` and on the public AWS CLI container image being pullable by the cluster. The local review environment did not have `kubectl` or `aws` installed, so command behavior was verified against official command references rather than by executing against a live EKS cluster.
