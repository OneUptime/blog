# Validation Summary: Test Legacy Firewall Compatibility with Calico IPAM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.20+) and Calico IPAM
- `calicoctl` CLI
- Kubernetes (`kubectl`)
- iptables (FORWARD chain, rule ordering)
- Topology-aware IP pools
- nginx (`nginx:1.25` image)
- Python `ipaddress` module
- Standard Unix tooling (`awk`, `paste`, `grep`)

## Sources Consulted
- Calico IPAM documentation: https://docs.tigera.io/calico/latest/networking/ipam/
- Calico IP pool / topology-aware pools: https://docs.tigera.io/calico/latest/networking/ipam/assign-ip-addresses-topology
- `calicoctl get ippools` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- iptables(8) man page (rule ordering: `-I` inserts at top vs. `-A` appends)
- `kubectl run` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run
- `kubectl get` `-o wide` column order for pods (NAMESPACE / NAME / READY / STATUS / RESTARTS / AGE / IP / NODE)
- Python `ipaddress` module: https://docs.python.org/3/library/ipaddress.html

## Issues Found
1. **iptables rule ordering bug in Step 2 (Approach 1).** The original used `iptables -I FORWARD ...` twice. Because `-I` inserts at position 1 by default, the second invocation (the catch-all DROP) ended up *above* the port-8080 ACCEPT. With that ordering, the DROP rule matches first and blocks all traffic to `$INITIAL_POD_IP`, so the test would not return HTTP 200 as the comment claims. Changed both inserts to `-A` (append) so the more specific ACCEPT precedes the catch-all DROP in chain order, matching the documented expected outcome. Added a short inline comment explaining the choice of `-A`.
2. **Misleading comment "Test with old IP".** The line `# Test with old IP - this simulates what legacy firewall does after pod restart` immediately preceded a `curl` against `$NEW_POD_IP`, not the old IP. Rewrote the comment to accurately describe what is being tested (connectivity to the new pod IP, against a firewall whose ACCEPT rule was scoped to the old IP) and clarified that the "Fails" outcome assumes a default-deny posture.

## Review Notes
- The iptables example is a deliberately simplified stand-in for a real legacy firewall. With only the two rules shown and no explicit default-deny on the FORWARD chain (its default policy on most Linux hosts is ACCEPT), the second test against `$NEW_POD_IP` may still succeed unless the surrounding chain is default-deny. The updated comment now makes this assumption explicit, but readers running this on a stock Linux node should be aware of that caveat.
- `kubectl run --overrides=...` in Step 3 still works in current kubectl releases but is marked deprecated in favor of `kubectl apply -f` with a YAML manifest. Acceptable for a one-off pedagogical example; worth migrating in a future revision.
- `kubectl get pods --all-namespaces -o wide | awk '{print $7}'` will include the literal header value `IP` as the first line written to `current-pod-ips.txt`. Harmless for the subsequent grep (it will not match real iptables rules) but a `tail -n +2` would be tidier.
- The CIDR math for the topology-aware pool example is consistent: `10.244.0.0/18`, `10.244.64.0/18`, and `10.244.128.0/18` are non-overlapping /18 subnets inside `10.244.0.0/16`.
- The default Calico install CIDR `192.168.0.0/16` referenced in Approach 2 is correct.
- Calico v3.20+ as a prerequisite is consistent with the IPAM and topology-aware pool features used.
