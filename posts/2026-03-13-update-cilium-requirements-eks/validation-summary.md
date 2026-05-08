# Validation Summary: Update Cilium Requirements on EKS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Amazon EKS
- AWS VPC CNI
- Amazon Linux 2
- Amazon Linux 2023
- Bottlerocket
- AWS CLI
- eBPF

## Sources Consulted
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium Kubernetes compatibility: https://docs.cilium.io/en/stable/network/kubernetes/compatibility/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium AWS VPC CNI chaining: https://docs.cilium.io/en/stable/installation/cni-chaining-aws-cni/
- Cilium AWS ENI IPAM requirements: https://docs.cilium.io/en/stable/network/concepts/ipam/eni/
- Cilium quick installation for EKS: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS AL2 AMI deprecation guidance: https://docs.aws.amazon.com/eks/latest/userguide/eks-ami-deprecation-faqs.html
- AWS CLI update-cluster-version reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-cluster-version.html
- AWS CLI create-nodegroup reference: https://docs.aws.amazon.com/cli/latest/reference/eks/create-nodegroup.html
- AWS CLI authorize-security-group-ingress reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html

## Issues Found
- The post stated that current Cilium eBPF features need kernel 5.3+ and basic Cilium needs kernel 4.9+. Current Cilium documentation requires Linux kernel 5.10+ or an equivalent distribution kernel, so the kernel requirement comments were updated.
- The post described Amazon Linux 2 on EKS as kernel 4.14. Current EKS AL2 AMIs are based on kernel 5.10, but EKS no longer publishes AL2 AMIs for new Kubernetes versions after EKS 1.32, so the AL2 guidance was corrected.
- The example EKS upgrade target used Kubernetes 1.29, which is no longer a good current target for current Cilium/EKS compatibility. It was updated to 1.34, which is in EKS standard support and within the current Cilium stable Kubernetes compatibility range.
- The Cilium compatibility URL pointed to an outdated path. It was corrected to the current official compatibility page.
- The replacement-mode CNI comment incorrectly implied ENI IPAM must be disabled. It was changed to describe replacing AWS VPC CNI with Cilium without making that inaccurate IPAM claim.
- The Step 5 `aws eks describe-cluster` and `aws ec2 authorize-security-group-ingress` examples omitted `--region <region>`, while the rest of the AWS examples were region-scoped. The commands were updated for consistency and correctness.
- The best practice said IMDSv2 is required by Cilium for AWS metadata access. Cilium's official AWS ENI documentation instead emphasizes EC2 IAM permissions for ENI creation and IP allocation, so the bullet was corrected.

## Review Notes
The AWS CLI command shapes and key flags are valid according to current AWS CLI documentation. The local environment did not have the `aws` CLI installed, so CLI validation was performed against the official AWS CLI reference rather than local `--help` output.
