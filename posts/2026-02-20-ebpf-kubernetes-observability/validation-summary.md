# Validation Summary: How to Use eBPF for Kubernetes Observability

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- eBPF
- Kubernetes
- Cilium
- Hubble
- CiliumNetworkPolicy
- bpftrace
- BCC Python
- Tetragon
- Helm
- Prometheus, Grafana, and Jaeger

## Sources Consulted
- Cilium Quick Installation: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Cilium `cilium install` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_install/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/gettingstarted/hubble_setup/
- Cilium Layer 7 visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium DNS policy documentation: https://docs.cilium.io/en/stable/security/dns/
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/latest/security/policy/layer7/
- Tetragon events documentation: https://tetragon.io/docs/concepts/events/
- Tetragon tracing policy documentation: https://tetragon.io/docs/concepts/tracing-policy/
- Tetragon enforcement documentation: https://tetragon.io/docs/concepts/enforcement/
- bpftrace reference documentation: https://bpftrace.github.io/
- BCC Python developer tutorial: https://android.googlesource.com/platform/external/bcc/+/aa6437ed/docs/tutorial_bcc_python_developer.md
- BCC reference guide: https://github.com/iovisor/bcc/blob/master/docs/reference_guide.md
- Linux kernel eBPF verifier documentation: https://www.kernel.org/doc/html/latest/bpf/verifier.html
- eBPF maps documentation: https://docs.ebpf.io/linux/concepts/maps/

## Issues Found
- The original eBPF diagram placed maps entirely in user space. eBPF maps are kernel-managed objects that can be accessed from eBPF programs and user space, so the diagram now places them in kernel space while keeping the shared-data description.
- The Cilium section said Cilium "replaces kube-proxy" unconditionally and called it "the most popular" eBPF Kubernetes networking solution. This was softened to "can replace kube-proxy" and "a popular" solution because kube-proxy replacement is a Cilium feature/configuration choice and popularity is not a technical guarantee.
- The Cilium CLI installation snippet used an older fixed Cilium version and skipped checksum verification. It now follows the current official Linux install pattern using `stable.txt`, architecture detection, checksum verification, and `cilium install`.
- The Hubble section used the `hubble` CLI without installing it. The official Hubble CLI installation commands were added before the Hubble usage examples.
- The Hubble description implied HTTP request visibility is always available directly from eBPF. It now notes that HTTP details require Cilium L7 visibility or policy redirection through the L7 proxy.
- The CiliumNetworkPolicy example said L7 HTTP rules are "only possible with eBPF." This was changed to "Cilium L7 HTTP rules" because L7 policy can also be implemented by other proxy-based systems, while Cilium combines eBPF datapath policy with L7 proxying.
- The DNS egress selector used `k8s-app: kube-dns`. Cilium policy examples commonly match the Cilium endpoint label as `"k8s:k8s-app": kube-dns`, so the selector was updated and quoted along with the namespace label.
- The bpftrace container PID example read `/proc/1/status` from inside the pod, which returns a namespace-local PID rather than the host PID used by bpftrace. The snippet now explains that bpftrace must run on the hosting node and gets the host PID from the container runtime via `crictl inspect`.
- The BCC TCP latency example described TCP round-trip time and per-pod monitoring, but the code measures TCP connect latency and does not map events to Kubernetes pods. The comments were corrected and an unused `ctypes` import was removed.
- The Tetragon `tetra getevents` example used an invalid `--process-type exec` filter. It now uses the documented `--processes` filter for a specific binary.
- The comparison diagram claimed "near-zero overhead." This was changed to "low overhead" because eBPF is designed for low overhead, but overhead is workload- and program-dependent.

## Review Notes
- bpftrace is installed locally, but syntax checking could not be completed because the local bpftrace binary refuses to run without root privileges. The bpftrace snippets were reviewed against the bpftrace reference instead.
- The Cilium, Hubble, and Tetragon commands assume a working Kubernetes context, sufficient cluster permissions, and required CLIs such as `kubectl`, `helm`, `curl`, and `sha256sum`.
