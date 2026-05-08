# Validation Summary: Troubleshooting AWS Access Keys and IAM Roles in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Amazon EKS
- AWS IAM
- IAM roles for service accounts (IRSA)
- AWS CLI
- kubectl

## Sources Consulted
- Cilium AWS ENI documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/eni/
- Cilium operator documentation: https://docs.cilium.io/en/stable/internals/cilium_operator/
- Amazon EKS IAM roles for service accounts documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Amazon EKS service account role association documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- AWS CLI update-assume-role-policy reference: https://docs.aws.amazon.com/cli/latest/reference/iam/update-assume-role-policy.html
- AWS CLI put-role-policy reference: https://docs.aws.amazon.com/cli/latest/reference/iam/put-role-policy.html

## Issues Found
- The post checked IAM and AWS API authentication from Cilium agent pods. Cilium documentation states that the AWS ENI allocator uses the Cilium operator for EC2 API calls, so the examples were changed to inspect `deployment/cilium-operator` and the `cilium-operator` service account.
- The `kubectl exec -n kube-system -l k8s-app=cilium -- ...` examples were invalid because `kubectl exec` accepts a pod or `TYPE/NAME`, not a label selector. The examples now resolve the operator pod name before using `kubectl exec`.
- The post used `aws sts get-caller-identity` inside the Cilium pod, but the Cilium container should not be assumed to include the AWS CLI. The verification command now runs a temporary `amazon/aws-cli:2` pod with `spec.serviceAccountName` set to `cilium-operator`.
- The conclusion and troubleshooting note referred generically to the Cilium pod and service account. They now specifically refer to the Cilium operator service account, matching Cilium ENI behavior.

## Review Notes
The AWS IAM CLI commands for updating a role trust policy and adding an inline role policy are syntactically current. The examples still assume the default Helm-managed `cilium-operator` service account name; installations that customize Cilium service account names must adjust the commands.
