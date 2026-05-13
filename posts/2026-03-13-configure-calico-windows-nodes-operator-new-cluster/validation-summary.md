# Validation Summary: How to Configure Calico on Windows Nodes with the Operator for a New Cluster

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes
- Windows HostProcess containers
- Calico IP pools and IPAM
- HNS Windows dataplane
- VXLAN networking
- Felix configuration

## Sources Consulted
- Calico documentation: Install Calico for Windows using the operator: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Calico documentation: Calico for Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico documentation: Calico for Windows limitations and known issues: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/limitations
- Calico documentation: Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: IP pool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Felix configuration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Troubleshoot Calico for Windows: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/troubleshoot

## Issues Found
- The post stated that VXLAN is required for Windows nodes. Calico for Windows supports VXLAN and BGP without encapsulation in supported environments, while IPIP is not supported. I changed the wording to describe VXLAN overlay and BGP without encapsulation, and made the VXLAN-specific requirements explicit.
- The Installation examples enabled `windowsDataplane: HNS` but omitted `serviceCIDRs`, which the operator install guide requires when enabling Calico for Windows. I added `serviceCIDRs` to both Installation examples.
- The VXLAN examples did not disable BGP. The official operator guide requires BGP to be disabled for Calico VXLAN on Windows, so I added `bgp: Disabled` to both examples.
- The post omitted the strict affinity requirement for clusters using Calico networking. I added the documented `kubectl patch ipamconfigurations default` command to prevent Linux nodes from borrowing IP addresses from Windows nodes.
- The prerequisites omitted current HostProcess/operator install requirements. I added Kubernetes v1.22+, HostProcess container support, and containerd v1.6+ on Windows nodes.
- The first Installation example set `mtu: 1450` and the conclusion described MTU as a key Windows setting. Calico's Windows VXLAN limitations note that VXLAN MTU settings are not supported on Windows, so I removed that setting and the related conclusion claim.
- The Felix step was labeled as Windows compatibility, but the example only changes logging and Prometheus metrics. I updated the heading to describe what the command actually configures.
- The Windows verification command referenced `C:\CalicoWindows\config\cni\calico.conf`, which matches older/manual installation paths more closely than the operator HostProcess CNI path. I changed it to inspect `C:\etc\cni\net.d`, consistent with the operator install guidance.

## Review Notes
The guide is now technically consistent with the current Calico operator documentation for a VXLAN-based Windows HostProcess install. Future improvements could mention that `10.96.0.0/12` is only an example and must match the cluster's Kubernetes service CIDR, and that users with BGP-based Windows networking need different pool encapsulation and BGP settings.
