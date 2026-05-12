# Validation Summary: How to Prevent Felix from Not Starting in Calico

## Status
validated

## Post Type
Guide / Troubleshooting reference

## Technologies Covered
- Calico (Felix component, FelixConfiguration CRD, calicoctl)
- Kubernetes (DaemonSet, PriorityClass, CRDs, kubectl)
- iptables (legacy vs. nftables backends)
- Linux kernel modules (nf_conntrack, ip_tables, xt_conntrack, xt_set)
- Bash scripting / node bootstrap
- update-alternatives (Debian alternatives system)

## Sources Consulted
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl overview: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico FelixConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico system requirements (kernel modules / iptables): https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Kubernetes PriorityClass docs (system-node-critical): https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- kubectl apply / --dry-run reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#apply
- update-alternatives(8) man page

## Issues Found
- **`calicoctl apply --dry-run` is not a supported flag.** Verified against the official Tigera/Calico documentation for `calicoctl apply` — the supported options are `-f/--filename`, `-R/--recursive`, `--skip-empty`, `-n/--namespace`, `-c/--config`, `--context`, and `-h/--help`. There is no `--dry-run` option. Running the original command would error out as an unrecognized flag. Fixed by replacing with `kubectl apply -f felixconfig.yaml --dry-run=server`, which is the canonical way to dry-run validate FelixConfiguration since it is a standard Kubernetes CRD in the `projectcalico.org/v3` API group. The mermaid diagram label was updated to match.

## Review Notes
- The kernel module list (`nf_conntrack`, `ip_tables`, `xt_conntrack`, `xt_set`) matches Calico's documented runtime requirements for Felix.
- The kubectl JSON patch for `priorityClassName` is syntactically valid; the path `/spec/template/spec/priorityClassName` is correct for a DaemonSet, and `system-node-critical` is a valid built-in PriorityClass.
- The `update-alternatives --set iptables /usr/sbin/iptables-legacy` pattern is correct on Debian/Ubuntu-derived distributions; on RHEL-family distros the alternatives path or package name differs, but the post hedges this with `command -v update-alternatives` and `|| true`, which is reasonable.
- The `lsmod | grep -q "^$MOD"` pattern correctly anchors at the start of each lsmod line.
- The python YAML validation pipeline (`python3 -c "import sys, yaml; yaml.safe_load(sys.stdin)"`) only validates YAML syntax, not Calico schema correctness — that is what the kubectl server-side dry-run now covers.
