# Validation Summary: How to Capture IPv4 Packets on a Kubernetes Pod Network

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- `kubectl`
- Ephemeral containers
- `tcpdump`
- Wireshark
- `crictl`
- Linux network namespaces / `nsenter`
- Calico
- Flannel
- `ksniff`

## Sources Consulted
- Kubernetes docs, `kubectl exec`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes docs, `kubectl cp`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Kubernetes docs, `kubectl debug`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes docs, Debug Running Pods: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes docs, Define a Command and Arguments for a Container: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Kubernetes docs, Volumes / `hostPath`: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes blog, Dockershim removal in v1.24: https://kubernetes.io/blog/2022/04/07/upcoming-changes-in-kubernetes-1-24/
- `cri-tools` `crictl` documentation: https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md
- `ksniff` README: https://github.com/eldadru/ksniff/blob/master/README.md
- `nicolaka/netshoot` README: https://github.com/nicolaka/netshoot/blob/master/README.md
- Wireshark man page: https://www.wireshark.org/docs/man-pages/wireshark
- Calico docs, Overlay networking: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico docs, System requirements for Kubernetes: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico docs, BGP configuration: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Flannel backend documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md

## Issues Found
- The post described ephemeral debug containers as `Kubernetes 1.23+`, but Kubernetes documents ephemeral containers as stable in `v1.25`. I updated the version callouts in the overview and Step 2 to `Kubernetes 1.25+`.
- The live-stream packet capture example used `kubectl exec -it`, which allocates a TTY intended for interactive shells rather than raw pcap streaming. I changed it to `kubectl exec -i` so the capture stream remains suitable for `wireshark -k -i -`.
- The `kubectl cp` example omitted a documented prerequisite: `kubectl cp` requires the `tar` binary in the container image. I added that requirement inline next to the copy step.
- The debug-container streaming example used `kubectl debug -it ... -- tcpdump ... | wireshark`, which is a poor fit for pcap piping because interactive attachment can emit non-pcap session output. I changed it to `kubectl debug --attach=true --quiet ...` so the example aligns with the generated `kubectl debug` command behavior.
- The node-level veth walkthrough depended on `docker inspect` and `docker://` container IDs. That is outdated for current Kubernetes because dockershim was removed in `v1.24`. I replaced it with a CRI-based flow using `crictl inspect`, `nsenter`, and host peer-ifindex mapping.
- The original veth capture command selected the first host `veth` device it found, which could capture the wrong pod. I changed it to derive the correct host-side veth from the pod interface’s peer ifindex.
- The DaemonSet example mounted `/tmp/k8s-captures` as a `hostPath` without ensuring the directory exists. I added `type: DirectoryOrCreate` so kubelet creates the directory when needed.
- The `nsenter` over SSH example relied on a `$PID` variable that would not exist when running a new SSH command from the local machine. I rewrote the example so the PID lookup and `tcpdump` execution happen on the remote node in the same SSH invocation.
- The CNI section incorrectly grouped Calico BGP and overlay capture on `tunl0`. I split the examples into Calico IP-in-IP (`tunl0`), Calico VXLAN (`vxlan.calico`), Flannel VXLAN (`flannel.1`), and Calico BGP capture on TCP port `179` on the node uplink.
- The Wireshark filter note said `vxlan or geneve`, but the commands in that section only cover VXLAN-based examples. I narrowed the note to the relevant `vxlan` display filter.
- The conclusion said the DaemonSet approach used `NET_RAW` capabilities, while the manifest actually adds both `NET_ADMIN` and `NET_RAW`. I corrected the conclusion to match the manifest.

## Review Notes
- The post is now technically accurate for current Kubernetes and CRI-based node runtimes.
- The `ksniff` commands match the upstream README, but the upstream project also states that it is not production ready. The post is acceptable as troubleshooting guidance, but that caveat matters for production workloads.
- Official Kubernetes docs also document `kubectl debug node/...` as a supported alternative to SSH for node-level troubleshooting. The post’s SSH-based node workflow remains valid after the CRI-based fixes.
- The GitHub author link was checked and resolves successfully to `https://github.com/nawazdhandala`.
