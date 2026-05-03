# Validation Summary: How to Deploy EKS with Fargate Profiles Using OpenTofu

## Status
validated

## Post Type
Tutorial / Infrastructure-as-Code guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS EKS (Elastic Kubernetes Service)
- AWS Fargate (serverless compute for EKS pods)
- AWS IAM (roles, policies, IRSA / OIDC trust)
- AWS CloudWatch Logs
- Kubernetes (CoreDNS, namespaces, service accounts)
- `kubectl` (JSON Patch via `kubectl patch`)

## Sources Consulted
- AWS EKS docs — Start AWS Fargate logging for your cluster: https://docs.aws.amazon.com/eks/latest/userguide/fargate-logging.html
- AWS EKS docs — Understand Fargate Pod configuration details: https://docs.aws.amazon.com/eks/latest/userguide/fargate-pod-configuration.html
- AWS EKS docs — Fargate Pod execution role / `eks-fargate-pods.amazonaws.com` service principal and `AmazonEKSFargatePodExecutionRolePolicy` managed policy
- AWS EKS docs — CoreDNS patch for Fargate (`eks.amazonaws.com/compute-type` annotation removal via JSON Patch with `~1` escape)
- Terraform AWS provider docs — `aws_eks_cluster`, `aws_eks_fargate_profile`, `aws_iam_role`, `aws_iam_role_policy`, `aws_iam_openid_connect_provider`
- IAM IRSA trust policy structure (Federated principal + `:sub` and `:aud` conditions on the OIDC issuer)

## Issues Found
1. **Section title and code comment incorrectly referenced FireLens for EKS Fargate logging.** FireLens is an Amazon ECS feature; EKS on Fargate uses a *built-in* Fluent Bit log router (no sidecar) configured via an `aws-logging` ConfigMap in the `aws-observability` namespace. Renamed the section from "Logging with FireLens on Fargate" to "Logging with Fluent Bit on Fargate" and rewrote the inline comment to describe the built-in log router and its ConfigMap-based configuration.
2. **Best-practices bullet about logging agents was wrong.** It told readers to deploy logging agents "as sidecars using FireLens or aws-for-fluent-bit," which contradicts the EKS Fargate model. Replaced with guidance to use the built-in Fluent Bit log router via the `aws-observability` namespace ConfigMap.
3. **Best-practices bullet about Fargate resource sizing was incorrect.** It claimed Fargate allocates vCPU and memory based on "the highest request in the pod spec." Per AWS docs, Fargate *sums* the requests across all long-running containers (Init containers use the max), adds 256 MB for the kubelet/kube-proxy/containerd, and rounds up to the nearest supported vCPU/memory combination. Updated the bullet to describe this accurately.

## Review Notes
- The IAM policy attached to the Fargate pod execution role for CloudWatch Logs (`logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`, `logs:DescribeLogStreams`) is correct for the built-in Fluent Bit log router writing to CloudWatch — these are the actions in the AWS sample policy.
- The Fargate profile `apps_with_logging` selects pods by label, but readers should know that simply attaching a Fargate profile does not enable logging on its own — they must also create the `aws-observability` namespace and the `aws-logging` ConfigMap. The post's narrative implies this but does not show the ConfigMap; that's a content-completeness gap rather than a technical error.
- The trust policy `Condition` block using `aws:SourceArn` with `ArnLike` for the `eks-fargate-pods.amazonaws.com` service principal is the AWS-recommended hardening against the cross-service confused-deputy problem and is correct.
- The CoreDNS JSON Patch path `/spec/template/metadata/annotations/eks.amazonaws.com~1compute-type` is correct (`~1` is the JSON Pointer escape for `/`).
- The cluster definition references `aws_iam_role.eks_cluster` and `aws_iam_role_policy_attachment.eks_cluster_policy` and the OIDC IRSA section uses a `data` source that assumes the OIDC provider is already created. These are reasonable elisions for a focused tutorial.
- `aws_iam_role_policy.role` accepts the role name; `aws_iam_role.fargate_pod_execution.id` returns the role name, so this works (equivalent to `.name`).
- The post does not pin a Terraform AWS provider version. As of May 2026, all resources and arguments shown are supported in current `hashicorp/aws` provider versions, but pinning a version would help reproducibility.
