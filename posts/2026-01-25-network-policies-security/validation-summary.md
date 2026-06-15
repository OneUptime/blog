# Validation Summary: How to Configure Network Policies for Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes kubectl
- Linux iptables
- Linux nftables
- AWS EC2 Security Groups
- Python boto3
- Calico NetworkPolicy and policy metrics
- Prometheus alerting rules

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico Cloud policy metrics documentation: https://docs.tigera.io/calico-cloud/operations/monitor/metrics/policy-metrics
- AWS VPC default security group documentation: https://docs.aws.amazon.com/vpc/latest/userguide/default-security-group.html
- Boto3 EC2 authorize_security_group_ingress documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/authorize_security_group_ingress.html
- Boto3 EC2 authorize_security_group_egress documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/authorize_security_group_egress.html
- Netfilter nft man page: https://www.netfilter.org/projects/nftables/manpage.html
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The Kubernetes cross-namespace example selected namespaces with a custom `name: monitoring` label, which is not guaranteed to exist. Changed it to the built-in `kubernetes.io/metadata.name: monitoring` namespace label.
- The DNS egress rule selected `kube-dns` pods across all namespaces. Restricted it to the built-in `kube-system` namespace label plus the `k8s-app: kube-dns` pod label.
- The test pod used `app=nettest`, but the earlier policies allowed API ingress from `app=frontend` and API egress from `app=api-server`. Split the test into frontend-labeled and API-labeled test pods so the checks exercise the intended policies.
- The cloud networking default claim was too broad. Reworded it to account for default security groups and permissive internal rules rather than saying all instances in a VPC can always communicate freely.
- The AWS security group example did not remove the default outbound allow-all rule, so it did not implement the article's explicit-allow model for egress. Added `revoke_security_group_egress` and explicit egress rules from frontend to API and API to database.
- The Calico Prometheus alert used `calico_denied_packets_total`, but the official Calico Cloud policy metric is `calico_denied_packets`. Updated the metric name and clarified the comment.
- The CNI examples included Weave Net, which is not a current recommendation. Updated the list to Calico, Cilium, Antrea, or another policy-capable CNI.

## Review Notes
- YAML and Python snippets were syntax-checked locally after edits.
- `kubectl` was not installed in the local environment, so kubectl command verification was performed against Kubernetes official documentation.
- `nft --check` could not complete in this environment because nftables operations require kernel permissions not available to the current process; syntax was reviewed against the official nft man page.
- The AWS example revokes the default IPv4 egress rule. IPv6-enabled VPCs may also need an explicit revoke for the default `::/0` egress rule.
