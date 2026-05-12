# Validation Summary: Runbook: BGP Peer Not Established in Calico

## Status
validated

## Post Type
Runbook (operational troubleshooting guide)

## Technologies Covered
- Calico (CNI plugin)
- BGP (Border Gateway Protocol)
- BIRD (BGP routing daemon)
- Kubernetes (kubectl, DaemonSet, field selectors)
- calicoctl CLI
- iptables
- netcat (nc)

## Sources Consulted
- Calico documentation: `calicoctl node status` — https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico BGP configuration reference — https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico component architecture (BIRD, Felix, confd) — https://docs.tigera.io/calico/latest/reference/architecture/overview
- projectcalico/bird repository on GitHub
- kubectl CLI reference (wait, logs, get pods with --field-selector)
- IANA service registry: BGP uses TCP port 179

## Issues Found
No technical issues found.

Verified items:
- `calicoctl node status` correctly reports BGP peer state including Established/non-Established status.
- `calicoctl get bgppeer -o yaml` is the correct command to fetch BGPPeer custom resources.
- BGPPeer spec field names `peerIP` and `asNumber` are accurate per the Calico CRD schema.
- Label selector `k8s-app=calico-node` is the standard label applied to calico-node DaemonSet pods.
- TCP port 179 is the correct BGP port.
- BIRD is the BGP daemon used by Calico, run inside the calico-node pod.
- iptables `-I INPUT/OUTPUT -p tcp --dport 179 -j ACCEPT` is syntactically correct.
- `kubectl wait` supports both label selectors and `--field-selector`, so the post-restart wait command is valid.

## Review Notes
- The iptables rules are presented as ephemeral fixes; in production, hosts typically use a persistent firewall manager (firewalld, ufw, nftables, or a configuration management tool). Worth noting in a future revision that these rules will not survive a reboot without persistence.
- The patch command uses `--patch` with a JSON string; this works, but newer Kubernetes/calicoctl workflows often prefer `--type=merge` explicitly. Default behavior is strategic merge which is acceptable here.
- The runbook assumes calicoctl is configured with appropriate datastore access (KDD or etcd); worth mentioning as a prerequisite in a future revision.
- Filtering BIRD logs by `grep -i "bird\|bgp\|peer"` is reasonable but may miss connection-level errors that don't include those keywords. Acceptable as a first-pass triage tool.
