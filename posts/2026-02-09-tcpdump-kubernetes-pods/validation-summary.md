# Validation Summary: How to Use tcpdump in Kubernetes Pods to Capture Network Traffic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Pods
- kubectl exec, cp, and debug
- Kubernetes securityContext capabilities
- tcpdump
- pcap capture filters
- Wireshark and tshark packet analysis
- Linux capabilities

## Sources Consulted
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- tcpdump manual page: https://www.tcpdump.org/manpages/tcpdump.1.html
- pcap-filter manual page: https://www.tcpdump.org/manpages/pcap-filter.7.html
- Linux capabilities manual page: https://man7.org/linux/man-pages/man7/capabilities.7.html
- Wireshark display filter reference for TCP analysis fields: https://www.wireshark.org/docs/dfref/t/tcp.html

## Issues Found
- The Debian/Ubuntu tcpdump installation command ran `apt-get install` locally because `&&` was outside the `kubectl exec` command. Changed it to run both package manager commands inside `sh -c` in the pod.
- The ephemeral container example used `--target=my-pod`, but `--target` expects a container name, not the pod name. Changed it to `--target=app` and added `--profile=netadmin` so the debug container is created with network debugging capabilities.
- The advanced HTTP filter was labeled as HTTP GET requests, but the filter only matches TCP port 80 packets with payload. Updated the label to describe the filter accurately.
- The `greater 1500` filter was described as packets greater than 1500 bytes, but pcap-filter defines `greater` as greater than or equal to the specified length. Updated the label to "at least 1500 bytes."
- The packet-rate example counted output lines rather than measuring a rate. Updated the label to "Count captured packets."
- The `-G 60 -W 10` rotation example used a static output filename, which causes rotated files to overwrite each other. Changed the filename to include strftime timestamp tokens.
- The retransmission analysis example used `tcpdump | grep retransmission`, but tcpdump does not annotate retransmissions that way. Replaced it with a `tshark` display filter using `tcp.analysis.retransmission`.
- The automated script's package installation fallback had incorrect shell operator precedence and would run `apt-get install` even after a successful Alpine `apk add`. Wrapped the apt path in a subshell.
- The automated script's protocol distribution used an unreliable field for tcpdump output. Changed it to count the link/network protocol field from tcpdump's default output.

## Review Notes
The `kubectl cp` examples are correct but depend on `tar` being present in the container image, as documented by Kubernetes. The `kubectl debug --profile=netadmin` behavior depends on current Kubernetes debug profiles and may be restricted by cluster policy or pod-level non-root settings. Hostname capture filters rely on name resolution at filter compile time; service names must resolve from the environment where tcpdump runs.
