# Validation Summary: How to Troubleshoot Performance Differences Between VXLAN and IP-in-IP in Calico

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico
- Kubernetes
- VXLAN
- IP-in-IP
- iperf3
- kubectl
- calicoctl

## Sources Consulted
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico calicoctl patch documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico for Windows limitations: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/limitations
- Calico for Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- IANA Service Name and Transport Protocol Port Number Registry: https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml
- IANA Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers
- RFC 7348, Virtual eXtensible Local Area Network: https://www.rfc-editor.org/rfc/rfc7348
- RFC 2003, IP Encapsulation within IP: https://www.rfc-editor.org/rfc/rfc2003

## Issues Found
- The VXLAN overhead explanation said "UDP + VXLAN headers" while giving a 50-byte figure. That figure includes the outer IPv4 header and inner Ethernet header as well, so the wording was corrected.
- The post said both protocols work on any IP network. Calico documents IP-in-IP as IPv4-only, so the text now states that limitation and notes VXLAN IPv6 underlay support on supported kernels.
- The overhead table did not specify that the 50-byte VXLAN and 20-byte IP-in-IP figures apply to an IPv4 underlay. The table label was updated to make that scope explicit.
- The `calicoctl patch` examples used `--type merge`, but current Calico documentation marks JSON merge patch as not yet implemented for `calicoctl patch`. The examples now use the documented default patch syntax with `-p`.
- The `kubectl run` benchmark clients redirected command output without attaching to the Pod, which would capture the `kubectl run` creation message rather than the iperf results. The examples now use `--attach --rm`.
- The `kubectl run` examples passed `iperf3` as arguments without `--command`. The examples now use `--command -- iperf3 ...` so Kubernetes sets the container command explicitly.
- The benchmark retrieved the server Pod IP immediately after creating the server. A `kubectl wait --for=condition=Ready` step was added so the Pod IP and server readiness are available before running the clients.

## Review Notes
The `different-node` value in the `nodeName` override is a placeholder and must be replaced with a real Kubernetes node name in an actual cluster. Switching Calico encapsulation modes can disrupt existing connections, which the Calico documentation also notes.
