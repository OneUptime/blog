# Validation Summary: kOps “Cluster Not Found”: Recover the Correct `KOPS_STATE_STORE` and Context

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- kOps and kOps state stores
- Kubernetes and `kubectl`
- Kubeconfig files and contexts
- AWS S3
- AWS IAM and AWS STS
- AWS CLI
- Shell environment variables

## Sources Consulted

- [kOps: The State Store](https://kops.sigs.k8s.io/state/)
- [kOps CLI: `kops get clusters`](https://kops.sigs.k8s.io/cli/kops_get_clusters/)
- [kOps CLI: `kops validate cluster`](https://kops.sigs.k8s.io/cli/kops_validate_cluster/)
- [kOps CLI: `kops export kubeconfig`](https://kops.sigs.k8s.io/cli/kops_export_kubeconfig/)
- [kOps: kubectl usage](https://kops.sigs.k8s.io/getting_started/kubectl/)
- [kOps v1.36.1 release](https://github.com/kubernetes/kops/releases/tag/v1.36.1)
- [Kubernetes: Organizing Cluster Access Using kubeconfig Files](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/)
- [Kubernetes CLI: `kubectl config view`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_view/)
- [Kubernetes CLI: `kubectl config use-context`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_use-context/)
- [AWS CLI: `s3api list-buckets`](https://docs.aws.amazon.com/cli/latest/reference/s3api/list-buckets.html)
- [AWS CLI: `sts get-caller-identity`](https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html)

## Issues Found
No technical issues found.

## Review Notes
The commands and flags were checked against the current stable kOps v1.36.1 CLI as well as the official documentation. In particular, `kops export kubeconfig --admin` defaults to an 18-hour administrator credential, accepts an explicit duration such as `--admin=8h`, and supports both `--kubeconfig` and `--user`. The state-store precedence, cluster-name precedence, `kops validate cluster --wait`, kubeconfig inspection commands, AWS identity lookup, and S3 bucket-list query are all accurate. All external links in the post resolved successfully during validation.
