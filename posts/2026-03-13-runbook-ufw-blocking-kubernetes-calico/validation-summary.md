# Validation Summary: Runbook: UFW Blocking Kubernetes When Using Calico

## Status
validated

## Post Type
Runbook / Troubleshooting guide

## Technologies Covered
- UFW (Uncomplicated Firewall)
- Calico (CNI / Kubernetes networking)
- Kubernetes (kubectl, pods, scheduling)
- iptables (FORWARD chain, policy)
- BGP (TCP 179), VXLAN (UDP 4789), IP-in-IP (IP protocol 4)

## Sources Consulted
- UFW source on the local system (`/usr/lib/python3/dist-packages/ufw/util.py`, `parser.py`) — confirmed `supported_protocols = ["tcp", "udp", "ipv6", "esp", "ah", "igmp", "gre", "vrrp"]`
- Local `ufw --dry-run allow proto 4 from any` test — returned `ERROR: Unsupported protocol '4'`
- Calico networking requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- UFW configuration reference: `/etc/default/ufw` (`DEFAULT_FORWARD_POLICY`) and `/etc/ufw/before.rules` chain layout
- kubectl reference for `run`, `wait`, `exec`, `--overrides`, `--field-selector`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- IANA protocol numbers (protocol 4 = IPv4-in-IPv4 / IPIP): https://www.iana.org/assignments/protocol-numbers

## Issues Found
1. **`sudo ufw allow proto 4 from any` is not valid UFW syntax.** UFW only supports a fixed set of named protocols (`tcp, udp, ipv6, esp, ah, igmp, gre, vrrp, any`) in its high-level CLI; numeric protocols and `ipencap`/`ipip` are rejected with `ERROR: Unsupported protocol '4'`. Verified against UFW 0.36.2 source (`supported_protocols` in `ufw/util.py`) and a live `ufw --dry-run` test.

   **Fix applied:** Replaced the line with a `sed` insertion into `/etc/ufw/before.rules` that adds raw iptables rules to the `ufw-before-input`, `ufw-before-output`, and `ufw-before-forward` chains:
   ```
   -A ufw-before-input -p 4 -j ACCEPT
   -A ufw-before-output -p 4 -j ACCEPT
   -A ufw-before-forward -p 4 -j ACCEPT
   ```
   Inserted immediately after the `# End required lines` marker that is present in the default Ubuntu `before.rules`, with a short comment noting this is only needed when Calico uses IPIP encapsulation. The `ufw reload` later in the block picks up the change.

## Review Notes
- BGP (TCP 179) and VXLAN (UDP 4789) port values are correct per Calico's networking requirements.
- `DEFAULT_FORWARD_POLICY="DROP"` is indeed the Ubuntu UFW default, and flipping it to `ACCEPT` in `/etc/default/ufw` is the canonical fix for cross-node pod FORWARD traffic.
- The `kubectl run ... --overrides='{"spec":{"nodeName":"..."}}'` pattern still works but `--overrides` is marked deprecated by kubectl. For long-term durability, a manifest piped through `kubectl apply -f -` (with `nodeSelector` or `nodeName`) would be more future-proof — not changed here since the current form still functions and the post is a runbook focused on quick recovery.
- `iptables -L FORWARD -n | head -1` is fine for the runbook's purpose but only inspects the legacy iptables tooling; on nodes using nftables backend (`iptables-nft`), the chain is still visible via this command on most distros because `iptables` is symlinked to `iptables-nft`. No change needed.
- The Calico-specific port set assumes BGP and/or VXLAN/IPIP encapsulation. If WireGuard is enabled, UDP 51820 also needs to be allowed — not in scope for this runbook.
