# Validation Summary: How to Prevent Cross-Host Pod Networking Failures with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Calico Open Source
- Calico IPPool, BGPConfiguration, and FelixConfiguration resources
- BGP, IP-in-IP, and VXLAN networking
- Prometheus and PrometheusRule alerts
- kube-state-metrics
- AWS security groups
- Terraform AWS provider

## Sources Consulted
- Calico system requirements and required network protocols: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico overlay networking and VXLAN/IP-in-IP behavior: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Enterprise BGP metrics reference: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/bgp-metrics
- calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Terraform AWS security group rule resource reference: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- AWS EC2 security group rule API reference: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_SecurityGroupRule.html

## Issues Found
- The post recommended VXLAN mode but treated BGP configuration and BGP status checks as universally required. Calico documentation states that VXLAN-only clusters do not require BGP for internal cluster routing, while BGP applies to IP-in-IP, unencapsulated routing, or external route advertisement. I changed the BGP setup, monitoring, maintenance, verification, and troubleshooting language to make BGP checks conditional.
- The infrastructure section implied all listed Calico protocols should always be open. Calico requirements define required traffic based on the selected mode. I changed the wording to keep only the rules required by the selected dataplane mode.
- The Prometheus BGP alert used `bgp_peers - bgp_peers_established > 0`, but the official BGP metric documented by Tigera is `bgp_peers` with a `status` label, not a separate `bgp_peers_established` metric. I changed the expression to `bgp_peers{status!="Established"} > 0` and clarified that it applies only when BGP metrics are exported.
- The `CalicoNodeNotReady` alert omitted the `condition="true"` label used by `kube_pod_status_ready` and referenced a `node` label that is not guaranteed on that metric. I changed the expression to check the true readiness condition and changed the annotation to use the `pod` label.
- The connectivity checker only pinged the Kubernetes default service IP, which does not directly validate cross-host pod-to-pod reachability. I changed it to create a headless Service for the DaemonSet and ping peer checker pod IPs discovered through service DNS.

## Review Notes
- YAML snippets were parsed successfully with PyYAML.
- `terraform`, `calicoctl`, and `kubectl` cluster access were not available in the workspace, so command behavior was verified against official documentation rather than executing against a live cluster.
- The BGP Prometheus metric referenced is documented for Calico Enterprise BGP metrics or compatible exporters; Calico Open Source Felix metrics do not provide that exact BGP metric by default.
