# Validation Summary: Trace a Flannel VXLAN Packet on Linux

## Status

validated

## Post Type

Technical troubleshooting guide and command-line tutorial

## Technologies Covered

- Kubernetes Pods, Nodes, Pod CIDRs, and `kubectl`
- Flannel v0.28.8 Linux VXLAN backend and Flannel CNI delegation
- Linux VXLAN devices, VTEPs, routing, neighbor tables, and forwarding databases
- Linux bridges and veth pairs
- iproute2 `ip` and `bridge` commands
- `tcpdump` and libpcap capture filters
- `ethtool`, checksum offload, and MTU troubleshooting
- Shell, JSONPath, and `jq`

## Sources Consulted

- [Flannel v0.28.8 release](https://github.com/flannel-io/flannel/releases/tag/v0.28.8)
- [Flannel v0.28.8 VXLAN backend options](https://github.com/flannel-io/flannel/blob/v0.28.8/Documentation/backends.md#vxlan)
- [Flannel v0.28.8 VXLAN device configuration](https://github.com/flannel-io/flannel/blob/v0.28.8/pkg/backend/vxlan/vxlan.go)
- [Flannel v0.28.8 route, neighbor, FDB, and DirectRouting implementation](https://github.com/flannel-io/flannel/blob/v0.28.8/pkg/backend/vxlan/vxlan_network.go)
- [Flannel v0.28.8 permanent neighbor and FDB programming](https://github.com/flannel-io/flannel/blob/v0.28.8/pkg/backend/vxlan/device.go)
- [Flannel troubleshooting documentation](https://github.com/flannel-io/flannel/blob/v0.28.8/Documentation/troubleshooting.md)
- [Flannel Kubernetes and annotation documentation](https://github.com/flannel-io/flannel/blob/v0.28.8/Documentation/kubernetes.md)
- [Flannel CNI plugin delegation documentation](https://github.com/flannel-io/cni-plugin/blob/main/README.md)
- [CNI bridge plugin documentation](https://www.cni.dev/plugins/current/main/bridge/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), [`kubectl exec` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/), and [`kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes Pod API reference](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/) and [Node API reference](https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/node-v1/)
- [Linux kernel VXLAN documentation](https://docs.kernel.org/networking/vxlan.html) and [RFC 7348](https://www.rfc-editor.org/rfc/rfc7348.html)
- [iproute2 route](https://man7.org/linux/man-pages/man8/ip-route.8.html), [link/VXLAN](https://man7.org/linux/man-pages/man8/ip-link.8.html), [neighbor](https://man7.org/linux/man-pages/man8/ip-neighbour.8.html), and [bridge/FDB](https://man7.org/linux/man-pages/man8/bridge.8.html) manuals
- [Linux veth manual](https://man7.org/linux/man-pages/man4/veth.4.html)
- [Upstream tcpdump manual](https://github.com/the-tcpdump-group/tcpdump/blob/master/tcpdump.1.in) and [libpcap filter manual](https://github.com/the-tcpdump-group/libpcap/blob/master/pcap-filter.manmisc.in)
- [ethtool manual](https://man7.org/linux/man-pages/man8/ethtool.8.html) and [iputils ping manual](https://man7.org/linux/man-pages/man8/ping.8.html)

## Issues Found

- The post called the Flannel route's next hop a remote subnet gateway. Flannel actually uses the remote lease/Pod-CIDR base address assigned to the peer VXLAN device, which is distinct from the remote `cni0` gateway. The terminology and lookup placeholder now identify it as the remote Flannel next-hop IP, and the FDB endpoint is identified as the remote VTEP underlay address.
- The walkthrough implicitly assumed IPv4, VNI 1, device `flannel.1`, and UDP 8472 while acknowledging configurable VXLAN values. The introduction now states the IPv4/default-value scope and tells readers how to substitute the deployed VNI-derived device and live UDP destination port. Outer captures now use a `<vxlan-udp-port>` placeholder.
- The flow could accidentally select a host-network Pod or a container without the commands used later. The prerequisites now require non-host-network Pods and `ip`/`ping` in the selected source container.
- The post said the pod-side veth was attached to `cni0`. The bridge attaches the host-side end of the Pod's veth pair, so that statement was corrected.
- The node-side `ip route get` command modeled locally originated traffic rather than the forwarded Pod packet. It now supplies the Pod source address and `iif cni0`, which performs the relevant forwarding lookup and remains accurate with policy routing.
- The DaemonSet log command selected only one Flannel Pod and could miss the source or destination node's reconciliation error. `--all-pods=true` was added so the command retrieves every DaemonSet Pod's logs with source prefixes.
- `ip -d link` was described as showing a generic local VXLAN address. Its `local` field is the VTEP's outer/underlay source address; the wording now distinguishes it from the overlay IP shown by `ip address`.
- The post referred to a pinned Flannel version even though it did not pin one. The text now directs readers to their deployed Flannel version and live device state.
- The expected peer neighbor/FDB state was underspecified. Flannel programs both as permanent entries; the revised diagnosis distinguishes a missing permanent entry from a later failed dynamic resolution and includes stale or externally altered local state.
- The capture-safety advice incorrectly implied that `tcpdump -G` alone bounds runtime. The guidance now uses `-c` or an external timeout for termination, scopes the BPF filter separately, and requires `-G` with `-W` when bounding rotated save files.

## Review Notes

- The technical baseline was Flannel v0.28.8, the current release on the validation date. The post's two Flannel documentation links follow `master`; pinning those links to the deployed release would improve long-term reproducibility.
- The commands assume the standard `kube-flannel` namespace, `kube-flannel-ds` DaemonSet, `kube-flannel` container, and bridge delegate. Installations that customize those names, the annotation prefix, or the CNI delegate must substitute their live values.
- `ip -s route show` is valid but normally does not provide per-route packet or byte counters for ordinary FIB routes.
- All six links in the post's Official Documentation section returned HTTP 200 and pointed to the described resources on 2026-08-21.
