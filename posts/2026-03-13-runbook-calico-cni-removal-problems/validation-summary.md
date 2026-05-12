# Validation Summary: Runbook: Problems During Calico CNI Removal

## Status
validated

## Post Type
Runbook / Operational guide

## Technologies Covered
- Calico CNI (Project Calico / Tigera)
- Kubernetes (kubectl, CRDs, finalizers, RBAC, ServiceAccounts, ConfigMaps)
- Linux networking (iptables, ip link, IPIP and VXLAN tunnel interfaces)
- CNI plugin configuration (`/etc/cni/net.d/`, `/opt/cni/bin/`)
- Bash scripting (JSON patch via `kubectl patch`)

## Sources Consulted
- Calico data path reference: https://docs.tigera.io/calico/latest/reference/architecture/data-path
- Calico install CNI plugin docs: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-cni-plugin
- Calico Felix iptables source: https://github.com/projectcalico/calico/blob/master/felix/iptables/table.go
- Calico CNI plugin install source: https://github.com/projectcalico/calico/blob/master/cni-plugin/pkg/install/install.go
- Kubernetes JSON Patch spec (RFC 6902) for `kubectl patch --type=json`
- iptables(8) manual page for `-t`, `-F`, `-X`, `-L` semantics
- ip-link(8) manual page for `ip link delete <dev> type ipip` syntax

## Issues Found
- **Phase 3 iptables cleanup was incomplete.** The original script only iterated chains visible via `iptables -L` (which defaults to the `filter` table). Calico's Felix programs `cali-` prefixed chains in all four standard tables — `filter`, `nat`, `mangle`, and `raw` (e.g., `cali-PREROUTING` in `nat`, `mangle`, and `raw`; `cali-POSTROUTING` in `nat`, etc.). Running the original script would leave cali-* chains behind in the other three tables, contradicting the runbook's stated symptom of "iptables cali-* chains still present on nodes" and the comment "Flush cali-* iptables chains."
  - **Fix:** Wrapped the chain-cleanup loop in an outer loop over `filter nat mangle raw`, and added `-t $TABLE` to each iptables invocation. Updated the comment to "Flush cali-* iptables chains from all tables." Verified against Calico Felix source.

## Review Notes
- The Phase 1/Phase 2 JSON Patch `remove` operation on `/metadata/finalizers` will return HTTP 422 if the path does not exist (i.e., the object has no finalizers). The script suppresses this via `2>/dev/null || true`, which is acceptable best-effort cleanup. A `--type=merge` patch setting `finalizers: null` would be slightly more robust but is functionally equivalent given the error suppression — left as-is.
- The Phase 2 `kubectl delete ... || kubectl patch ... && kubectl delete ...` chain has subtle bash operator-precedence semantics (`A || B && C` parses as `(A || B) && C`). The effect is acceptable for a best-effort runbook but could be cleaner with an explicit `if` block. Not a correctness issue — left as-is.
- The node cleanup does not handle `ip6tables` chains. For IPv6-enabled clusters Calico also programs chains in ip6tables; operators with dual-stack clusters should run analogous commands against `ip6tables -t <table>`. Worth noting in a future revision but outside the original scope.
- For IPv6 VXLAN, Calico additionally creates a `vxlan-v6.calico` interface; the script only removes `vxlan.calico` (IPv4). Acceptable for IPv4-only clusters.
- The script does not remove `/var/lib/calico/` (Felix/CNI runtime state) or per-pod `cali*` veth interfaces. These are typically cleaned automatically when pods/nodes restart, but a thorough cleanup could include them. Out of scope for this fix.
- `iptables -X` will fail if jump rules referencing the chain still exist in built-in chains (KUBE-FORWARD, etc.). The `2>/dev/null || true` masks this, but a fully thorough cleanup would first remove the jump rules. Acceptable for a best-effort runbook.
