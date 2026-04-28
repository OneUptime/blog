# Validation Summary: How to Configure IPv6 NodePort Services in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services (NodePort type)
- Kubernetes dual-stack networking (IPv4 / IPv6)
- kube-proxy (iptables and IPVS modes)
- ip6tables (Linux IPv6 packet filtering)
- kubectl CLI
- curl (with `-6` IPv6 flag)
- GCP `gcloud compute firewall-rules` CLI
- AWS `aws ec2 authorize-security-group-ingress` CLI
- ipvsadm

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Service spec API reference (`ipFamilyPolicy`, `ipFamilies`, `nodePort`): https://kubernetes.io/docs/reference/kubernetes-api/service-resources/service-v1/
- kube-proxy / KUBE-NODEPORTS chain behavior: Kubernetes networking docs and kube-proxy source/docs
- ip6tables(8) man page
- `gcloud compute firewall-rules create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- AWS EC2 `authorize-security-group-ingress` reference (Ipv6Ranges / CidrIpv6): https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html

## Issues Found
No technical issues found.

Verified specifics:
- Default NodePort range `30000-32767` is correct.
- `ipFamilyPolicy` values (`SingleStack`, `PreferDualStack`, `RequireDualStack`) and `ipFamilies` array syntax are valid.
- `kubectl get ... -o jsonpath` expressions for `clusterIPs`, `ports[0].nodePort`, and the InternalIP filter are syntactically correct and produce the described output on dual-stack clusters.
- `curl -6 "http://[<ipv6>]:<port>/"` is the correct bracketed-host syntax for IPv6 URLs (per RFC 3986).
- `ip6tables -A INPUT -p tcp --dport 30000:32767 -j ACCEPT` and the source-restricted variant are valid ip6tables syntax.
- `ip6tables -t nat -L KUBE-NODEPORTS -n` is the correct chain managed by kube-proxy in iptables mode for NodePort traffic; the example output line format matches real ip6tables output.
- `kubectl -n kube-system logs daemonset/kube-proxy` is valid kubectl syntax for streaming logs from a DaemonSet's pods.
- GCP `gcloud compute firewall-rules create` with `--source-ranges="::/0"` is valid; `--source-ranges` accepts both IPv4 and IPv6 CIDRs (the underlying VPC subnet must be dual-stack for IPv6 traffic to apply).
- AWS `authorize-security-group-ingress --ip-permissions` JSON with `Ipv6Ranges` / `CidrIpv6` is the correct shape for IPv6 ingress rules.

## Review Notes
- The post sensibly notes that PreferDualStack is used; readers should be aware that this requires the cluster's API server, kube-controller-manager, and kube-proxy to be configured for dual-stack (`--service-cluster-ip-range` containing both IPv4 and IPv6 CIDRs, etc.). This is a cluster-level prerequisite not explicitly called out, but is reasonable to assume given the topic.
- For GCP, the `--source-ranges="::/0"` rule will only match IPv6 traffic on a VPC network with dual-stack subnets where the target instances have IPv6 addresses. This isn't an error, just a prerequisite worth noting.
- The IPVS verification heuristic (`ipvsadm -Ln | grep -B2 "30080" | grep "::"`) is fragile if the port appears in unrelated contexts, but it is presented as a quick check rather than a definitive query, which is acceptable.
- The IPv6-only NodePort example omits a `name` for the single port, which is permitted by the Kubernetes API when there is only one port entry.
