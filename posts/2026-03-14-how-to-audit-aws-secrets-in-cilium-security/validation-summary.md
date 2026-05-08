# Validation Summary: Auditing AWS Secrets in Cilium Security Configurations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- AWS IAM
- AWS CloudTrail
- AWS CLI
- kubectl
- jq

## Sources Consulted
- AWS CLI Command Reference: `iam get-role-policy` - https://docs.aws.amazon.com/cli/latest/reference/iam/get-role-policy.html
- AWS CLI Command Reference: `iam get-policy` - https://docs.aws.amazon.com/cli/latest/reference/iam/get-policy.html
- AWS CLI Command Reference: `iam get-policy-version` - https://docs.aws.amazon.com/cli/latest/reference/iam/get-policy-version.html
- AWS CLI Command Reference: `iam simulate-principal-policy` - https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-principal-policy.html
- AWS CloudTrail User Guide: Viewing recent management events with the AWS CLI - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events-cli.html
- AWS CloudTrail User Guide: `userIdentity` element - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference-user-identity.html
- Cilium documentation: AWS ENI required privileges and operator behavior - https://docs.cilium.io/en/stable/network/concepts/ipam/eni/
- Kubernetes documentation: Secrets - https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes documentation: RBAC authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes documentation: `kubectl exec` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The IAM policy document example listed attached managed policies and then used `aws iam get-role-policy`, which retrieves inline role policies only. Updated the example to resolve the managed policy ARN, fetch the default version with `aws iam get-policy`, and retrieve the document with `aws iam get-policy-version`.
- The CloudTrail examples filtered directly by `AttributeKey=Username,AttributeValue=cilium-role`, which is unreliable for assumed-role activity because the role name is found under `userIdentity.sessionContext.sessionIssuer.userName`. Updated the examples to inspect the embedded CloudTrail event JSON with `jq`.
- The Kubernetes Secret scan could fail or produce duplicate output when `.data` was absent or multiple keys matched. Updated the `jq` filter to handle missing data and return each matching Secret once.
- The environment-variable scan could fail when a container had no `env` entries. Added optional iteration with `env[]?`.
- The RBAC audit example checked whether the binding's role name contained "secret", which does not prove secret access. Updated it to inspect Role and ClusterRole rules for access to `secrets` or wildcard resources.
- The verification example attempted to run `aws sts get-caller-identity` inside Cilium pods. That depends on an AWS CLI binary being present in the container image and targets the agent rather than the operator that performs AWS ENI API calls. Replaced it with a service account inspection command for the Cilium operator.

## Review Notes
- The CloudTrail examples use GNU `date -d`; users on macOS may need an equivalent timestamp command.
- CloudTrail `lookup-events` returns recent management events for the selected Region, so multi-Region audits should run the command in each relevant Region or use centralized CloudTrail logs.
