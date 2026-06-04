# Validation Summary: How to Diagnose MTU Issues Causing Packet Fragmentation in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Linux networking
- MTU and Path MTU Discovery
- ICMP and ICMPv6
- tcpdump
- iputils ping and tracepath
- Calico
- Cilium
- Flannel
- AWS EC2 networking
- Google Cloud VPC and GKE networking
- Azure Virtual Network

## Sources Consulted
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes debugging running pods documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod
- Local `ping(8)` help and man page from iputils 20240117.
- Local `tracepath(8)` help and man page from iputils 20240117.
- Local `tcpdump(8)` help and man page from tcpdump 4.99.4.
- RFC 1191, Path MTU Discovery for IPv4: https://datatracker.ietf.org/doc/rfc1191/
- RFC 8201, Path MTU Discovery for IPv6: https://www.rfc-editor.org/rfc/rfc8201
- Calico MTU configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Cilium configuration documentation: https://docs.cilium.io/en/stable/configuration/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Flannel configuration and backend documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md and https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md
- AWS EC2 MTU documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network_mtu.html
- Google Cloud VPC MTU documentation: https://docs.cloud.google.com/vpc/docs/mtu
- Azure VM MTU documentation: https://docs.azure.cn/en-us/virtual-network/how-to-virtual-machine-mtu

## Issues Found
- IPv6 ping MTU calculation was incomplete. The post correctly used `1452` for a 1500-byte IPv6 path but only explained the IPv4 `+28` header calculation. I added the IPv6 `+48` calculation for the IPv6 header and ICMPv6 header.
- The tracepath explanation said it sends packets of increasing sizes. The local `tracepath(8)` documentation describes UDP probes and PMTU discovery via local errors or ICMP responses, so I corrected the wording.
- The tcpdump fragmentation conclusion was too absolute. Fragmentation can have causes other than an MTU mismatch, so I changed it to say unexpected fragments can indicate an MTU mismatch.
- The Calico Installation resource command omitted the API group. I changed it to `kubectl get installation.operator.tigera.io default -o yaml | grep mtu`, matching Calico operator documentation.
- The Cilium endpoint command did not actually verify MTU. I replaced it with `cilium-dbg config get mtu` executed through the Cilium DaemonSet, and clarified that Cilium configuration changes should preferably go through Helm or `cilium config set`.
- The PMTUD section described all PMTUD feedback as ICMP "Packet Too Big". I corrected the IPv4 and IPv6 distinction: IPv4 uses "fragmentation needed and DF set"; IPv6 uses ICMPv6 "Packet Too Big".
- The PMTUD ping example used `-s 1500`, which creates a packet larger than a 1500-byte IPv4 MTU before considering headers. I changed it to `-s 1472` for a 1500-byte IPv4 path.
- The netcat test piped `dd` output to `nc` on the local machine instead of inside the pod. I changed the command to run the pipe through `sh -c` inside `pod-a`, and likewise moved the listener redirection inside `pod-b`.
- The cloud-provider MTU examples were too broad. I qualified AWS jumbo-frame guidance, GCP default VPC/GKE behavior, and retained the Azure 1500-byte default guidance.

## Review Notes
The post is technically sound after correction. Future improvements could mention that Linux offloads such as TSO/GSO/GRO can make packet captures look larger than on-the-wire packets, and that exact MTU settings depend on the CNI datapath mode, encapsulation protocol, cloud path, and whether IPv4 or IPv6 is used.
