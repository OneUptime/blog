# Validation Summary: Why `kops validate cluster` Cannot Resolve the API DNS Name—and How to Fix It

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- kOps 1.36.1
- Kubernetes API server and cluster validation
- Kubernetes kubeconfig and TLS server identity
- DNS diagnostics with `dig`
- Amazon Route 53 public and private hosted zones
- Route 53 Resolver and split-horizon DNS
- AWS API load balancers and target health
- AWS CLI and `kubectl`

## Sources Consulted

- [kOps CLI: `kops validate cluster`](https://kops.sigs.k8s.io/cli/kops_validate_cluster/)
- [kOps CLI: `kops export kubeconfig`](https://kops.sigs.k8s.io/cli/kops_export_kubeconfig/)
- [kOps CLI: `kops get instances`](https://kops.sigs.k8s.io/cli/kops_get_instances/)
- [kOps: Cluster Resource API Exposure](https://kops.sigs.k8s.io/cluster_spec/#api)
- [kOps: Cluster Boot Sequence](https://kops.sigs.k8s.io/boot-sequence/)
- [kOps: Getting Started on AWS—DNS Setup and Testing](https://kops.sigs.k8s.io/getting_started/aws/#testing-your-dns-setup)
- [kOps: Gossip DNS](https://kops.sigs.k8s.io/gossip/)
- [kOps 1.36 Release Notes](https://kops.sigs.k8s.io/releases/1.36-notes/)
- [kOps: Troubleshooting](https://kops.sigs.k8s.io/operations/troubleshoot/)
- [kOps v1.36.1 source: kubeconfig endpoint and TLS construction](https://github.com/kubernetes/kops/blob/v1.36.1/pkg/kubeconfig/create_kubecfg.go)
- [kOps v1.36.1 source: AWS API DNS infrastructure](https://github.com/kubernetes/kops/blob/v1.36.1/pkg/model/awsmodel/dns.go)
- [Amazon Route 53: Routing Traffic for Subdomains](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-routing-traffic-for-subdomains.html)
- [Amazon Route 53: Private Hosted Zone Considerations](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-considerations.html)
- [Amazon Route 53: Checking DNS Responses](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-test.html)
- [AWS CLI: `list-hosted-zones-by-name`](https://docs.aws.amazon.com/cli/latest/reference/route53/list-hosted-zones-by-name.html)
- [AWS CLI: `list-resource-record-sets`](https://docs.aws.amazon.com/cli/latest/reference/route53/list-resource-record-sets.html)
- [Kubernetes: `kubectl config view`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_view/)

## Issues Found

- The kubeconfig inspection command used the current context, but kOps 1.36.1 resolves `--use-kubeconfig` against the context named for the selected cluster. Added `--context "${CLUSTER_NAME}"` so the displayed server is the endpoint the subsequent validation command will use.
- The gossip section omitted current lifecycle information. Added that gossip is deprecated in kOps 1.36, that 1.37 rejects new gossip clusters, and that 1.38 requires existing gossip clusters to migrate before upgrading. Also clarified that a None-DNS cluster ending in `.k8s.local` is not gossip and that AWS uses the API load balancer endpoint directly for these no-hosted-DNS designs.
- The post attributed all conventional API records to `dns-controller`. Corrected the explanation: `dns-controller` creates direct records for `spec.api.dns` from API server pod annotations, while kOps provisions load-balancer-backed Route 53 records during infrastructure reconciliation for `spec.api.loadBalancer`.
- The `--api-server` warning incorrectly required the override hostname itself to be a certificate name and said a raw IP could inherently cause a hostname failure. Corrected it to explain that kOps-generated client configuration retains the internal API name as the TLS server name while the flag overrides the transport URL. A raw IP can therefore be a diagnostic endpoint, but it is not a permanent DNS fix.

## Review Notes

- The review targeted kOps 1.36.1, the latest stable release on the validation date. The official v1.36.1 binary was used to confirm the `validate cluster`, `export kubeconfig`, `get cluster`, and `get instances` syntax and flags.
- All Bash command blocks passed `bash -n`. The AWS commands and JMESPath filter were checked against AWS CLI documentation and locally installed AWS CLI 2.27.31 help; the kubeconfig command was checked with kubectl 1.34.1 and current Kubernetes documentation.
- All eight external documentation links in the corrected post returned HTTP 200 during validation.
- No live kOps cluster or AWS account was used, so operational effects were verified from official documentation, the tagged kOps v1.36.1 source, and local CLI help rather than by changing cloud resources.
