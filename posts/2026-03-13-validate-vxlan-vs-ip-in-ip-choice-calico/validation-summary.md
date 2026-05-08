# Validation Summary: How to Validate Your VXLAN vs IP-in-IP Choice in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico IP pools
- Kubernetes
- VXLAN
- IP-in-IP
- iperf3
- kubectl
- calicoctl

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico MTU documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico Windows limitations: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/limitations
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- RFC 7348, VXLAN: https://www.rfc-editor.org/rfc/rfc7348
- RFC 2003, IP Encapsulation within IP: https://www.rfc-editor.org/rfc/rfc2003
- IANA Assigned Internet Protocol Numbers: https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml

## Issues Found
- The post said both VXLAN and IP-in-IP work on any IP network. Calico documentation states IP-in-IP is IPv4-only in Calico and VXLAN is supported in some environments where IP-in-IP is not, such as Azure. I narrowed the claim to supported Calico deployments and added the IPv4/Azure caveat.
- The Calico patch examples used `--type merge`, but the current `calicoctl patch` reference lists JSON Merge Patch as not implemented. I removed the explicit patch type so the examples use the supported default strategic merge patch behavior.
- The `kubectl run` benchmark examples passed `iperf3` as arguments instead of explicitly setting the container command, and redirected the output of pod creation rather than the iperf client results. I added `--command`, `--restart=Never`, `--attach`, and `--rm` where appropriate so the benchmark commands run as intended and capture iperf output.
- The benchmark fetched the server pod IP immediately after creation. I added a `kubectl wait` step before reading the pod IP.
- The client scheduling example used a placeholder `different-node` without stating it must differ from the server's node. I added a `SERVER_NODE` lookup and a comment clarifying the placeholder requirement.

## Review Notes
Switching Calico encapsulation modes can disrupt in-progress connections, which the Calico documentation explicitly notes. The post remains a concise validation guide; a future improvement could add cleanup commands for the long-running `iperf-server` pod after benchmarking.
