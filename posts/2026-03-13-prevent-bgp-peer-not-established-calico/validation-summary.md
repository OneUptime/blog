# Validation Summary: How to Prevent BGP Peer Not Established in Calico

## Status
validated

## Post Type
Guide / Preventive operations runbook

## Technologies Covered
- Calico (BGP networking, BGPPeer and BGPConfiguration CRDs)
- Kubernetes
- BGP protocol (RFC 4271)
- `calicoctl` CLI
- Shell scripting (bash, `nc`, `ping`)
- Mermaid (flowchart)
- GitOps practices

## Sources Consulted
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico networking / route reflector guidance: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- `calicoctl` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- RFC 4271 (BGP-4) — TCP port 179
- RFC 6996 — Private Use 16-bit AS Number Range (64512–65534)
- `nc(1)` and `ping(8)` Linux man pages for flag verification

## Issues Found
No technical issues found.

## Review Notes
- The BGPPeer manifest correctly uses `apiVersion: projectcalico.org/v3`, `kind: BGPPeer`, and the fields `node`, `peerIP`, and `asNumber`, all matching the Calico v3 schema.
- `nodeToNodeMeshEnabled` is the correct field name in `BGPConfiguration`.
- The ~100-node threshold for switching from full node-to-node mesh to route reflectors is consistent with Calico's published guidance (which suggests considering route reflectors as cluster size grows beyond roughly 50–100 nodes); the exact cutoff is environment-dependent but the example value is reasonable.
- BGP listens on TCP/179; the `nc -zv $PEER_IP 179` probe is appropriate. Note that some firewalls may permit the TCP handshake to a load balancer/intermediate device while still blocking the actual BGP session — the probe is a useful pre-check but not a guarantee.
- `ping -c 2 -W 2` flags are correct for iputils ping on Linux (`-W` is timeout in seconds). On BSD/macOS `-W` differs, but the script is shell-scripted for typical Linux node usage.
- AS 64512 is within the private ASN range (RFC 6996), appropriate as an example.
- The `calicoctl node status | grep -A5 "BGP summary"` command works against the standard `calicoctl node status` output format.
- Minor stylistic suggestion (not a correctness issue): consider quoting `"$PEER_IP"` and `"$PEER_ASN"` in the shell script to be safe against unusual input, but the script as written works for the documented usage.
