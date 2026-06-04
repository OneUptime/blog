# Validation Summary: How to Perform Packet Capture on Kubernetes Nodes with tcpdump

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- kubectl debug
- kubectl exec
- kubectl cp
- Linux network namespaces
- tcpdump
- libpcap/BPF capture filters
- Wireshark/tshark packet analysis

## Sources Consulted
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- tcpdump Linux manual page: https://man7.org/linux/man-pages/man8/tcpdump.8.html
- pcap-filter Linux manual page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Local tcpdump 4.99.4 `--help` output and installed `tcpdump(8)`, `pcap-filter(7)`, and `nsenter(1)` man pages

## Issues Found
- The original post said the host namespace is where all pod traffic eventually passes through and that the node's main interface sees all pod traffic. This is not reliably true across CNI bridge, overlay, and veth paths, so the explanation was narrowed to node interfaces and CNI/host-side interfaces.
- The post implied a `kubectl debug node` pod is privileged by default. Kubernetes documentation says node debug pods run in host namespaces but are not privileged by default, so the guidance now mentions `--profile=netadmin` or `--profile=sysadmin` when permissions are needed and allowed.
- The pod veth discovery examples used container IDs and `kubectl exec ... echo $$`, which do not reliably map to host-side veth interfaces or host PIDs. The section now uses pod IP filtering on `tcpdump -i any`, plus the existing in-pod tcpdump alternative.
- The service connectivity examples quoted `$SERVICE_IP` inside single quotes, preventing shell expansion. These filters now use double quotes where the variable is embedded in the filter expression.
- The TCP retransmission and timeout examples were misleading because basic tcpdump capture filters cannot reliably identify retransmissions or timeouts. The post now captures TCP traffic for offline retransmission analysis and describes FIN packets as connection closes.
- The multi-interface example used repeated `-i` flags, but tcpdump accepts a single capture interface option in normal usage. The post now recommends `-i any` or separate tcpdump processes for specific interfaces.
- The performance section described an `awk` pipeline as traffic sampling. It only samples printed output after tcpdump has already processed packets, so the comment now states that it does not reduce capture load.
- The security section implied `grep -v Authorization` sanitizes captures. It only hides matching text output lines, so the wording now reflects that limitation.
- The DNS query example said it showed all query names while grepping for `A?`; it now specifically says it shows A-record queries in text output.

## Review Notes
Some commands remain environment-dependent because Kubernetes packet visibility varies by CNI implementation, kube-proxy mode, node OS, and cluster security policy. The corrected post now avoids overclaiming where those differences matter.
