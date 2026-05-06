# Validation Summary: How to Cilium eBPF IPv6 Networking Internals

## Status
not-technically-relevant

## Post Type
Tutorial / guide (intended Cilium IPv6 networking walkthrough)

## Technologies Covered
- Cilium
- eBPF
- IPv6
- Kubernetes
- Python `ipaddress`
- Linux networking tools (`ip`, `ping6`, `curl`)

## Sources Consulted
- Cilium docs, "Introduction" (eBPF datapath overview): https://docs.cilium.io/en/stable/network/ebpf/intro/
- Cilium docs, "Configuration" (ConfigMap keys including `enable-ipv6`): https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium docs, Helm values reference (`ipv6.enabled`): https://docs.cilium.io/en/stable/helm-values/
- Cilium docs, policy language (`toCIDR`, `toCIDRSet`, `fromCIDRSet`): https://docs.cilium.io/en/stable/security/policy/language/
- Cilium docs, "Troubleshooting" (`cilium status`, `hubble status`, `hubble observe`, connectivity check): https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium CLI docs, `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium docs, Hubble CLI usage: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Python docs, `ipaddress` standard library module: https://docs.python.org/3/library/ipaddress.html
- Linux `ping(8)` manual page: https://man7.org/linux/man-pages/man8/ping.8.html

## Issues Found
- The post's core premise is structurally wrong for its title. The title and introduction claim to explain Cilium eBPF IPv6 networking internals, but the body only shows a standalone Python subnet-membership helper. Official Cilium docs describe kernel hooks, eBPF programs, BPF maps, and Cilium/Hubble troubleshooting workflows, none of which are actually implemented in the post.
- The Step 2 Python example is broken as written. `2001:db8:trusted::/48` and `2001:db8:unknown::1` are not valid IPv6 literals because IPv6 groups must contain hexadecimal digits. Per Python's `ipaddress` docs, invalid addresses and networks raise `ValueError`, which this sample does.
- The Step 3 YAML is not a real Cilium configuration model. Cilium enables IPv6 with settings such as ConfigMap `enable-ipv6` or Helm `ipv6.enabled`, and CIDR-based enforcement is expressed through `CiliumNetworkPolicy` fields like `toCIDR`, `toCIDRSet`, and `fromCIDRSet`, not a top-level `ipv6.networks` allow/deny list.
- The Step 4 apply/verify flow is invented. `python3 configure.py --config config.yaml` is not an official Cilium configuration path, and no such script exists in this repository. Official Cilium workflows use Helm, Kubernetes manifests, and Cilium CLI or `kubectl` commands.
- The verification commands do not validate Cilium IPv6 forwarding or policy enforcement. `curl -6 http://[::1]:8080/health` only checks whether some local process is listening on the IPv6 loopback address. Cilium's own docs point to checks such as `cilium status`, `hubble status`, `hubble observe`, and `cilium connectivity test`.
- The prerequisites are misleading. Python `ipaddress` is part of the standard library, `netaddr` is unused in the post, and `ipaddr.js` is unrelated to the Python implementation shown.
- Because correcting the post would require replacing the title-aligned subject matter, configuration model, apply/verify workflow, monitoring guidance, and sample code with a different article, I did not patch `README.md`. The post is marked `not-technically-relevant` instead.

## Review Notes
- This topic could be salvaged only by a full rewrite into either a real Cilium IPv6 datapath/policy tutorial or a separate Python-focused article about IPv6 subnet validation.
- `ping6` still exists on many Linux systems, including this environment, but `ping -6` is the canonical form documented by current `iputils`.
