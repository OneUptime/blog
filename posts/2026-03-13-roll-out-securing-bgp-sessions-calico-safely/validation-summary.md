# Validation Summary: How to Roll Out Secure BGP Sessions in Calico Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+) BGP networking
- Kubernetes (Secrets, kube-system namespace)
- `calicoctl` CLI
- BIRD BGP daemon (used internally by Calico)
- BGP MD5 authentication (RFC 2385 / TCP MD5 signature option)

## Sources Consulted
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGP password configuration docs: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- BIRD Internet Routing Daemon user guide: https://bird.network.cz/?get_doc&v=20&f=bird.html (birdcl client documentation)
- Kubernetes Secret resource: https://kubernetes.io/docs/concepts/configuration/secret/
- RFC 2385 (TCP MD5 Signature Option) — the underlying mechanism behind BGP MD5 auth

## Issues Found

1. **Incorrect BIRD CLI command.** The post used `bird cli <<< "show protocols all bgp_peer_router01" | grep auth`. This is wrong:
   - The BIRD daemon binary is `bird`, while the CLI is a separate tool, `birdcl` (lightweight) or `birdc`. There is no `cli` subcommand on the `bird` binary.
   - Calico names BGP peers in BIRD using prefixes like `Mesh_<ip>`, `Node_<ip>`, or `Global_<ip>` (with dots replaced by underscores), not `bgp_peer_router01`, so the protocol name in the query would never match.
   - The BIRD control socket in a Calico node is at `/var/run/calico/bird.ctl` and must be passed via `-s`.

   **Fix:** Replaced with `birdcl -s /var/run/calico/bird.ctl show protocols all`, which is the canonical way to inspect BGP protocol state (including authentication) from inside a `calico-node` pod or on the node itself.

## Review Notes
- The `BGPPeer` YAML using `spec.password.secretKeyRef.name` / `.key` is the correct schema as documented in `projectcalico.org/v3`.
- The Secret must live in the same namespace as the `calico-node` pods. The post uses `kube-system`, which is correct for manifest-based Calico installs; for operator-based installs the namespace is typically `calico-system`. Worth noting in a future revision, but not a technical error for the manifest-install audience implied here.
- The introduction mentions "authentication and encryption settings" for BGPPeer; strictly speaking, BGP MD5 (TCP MD5 signature, RFC 2385) provides authentication and integrity, not confidentiality/encryption. The post's conclusion correctly characterizes this as "MD5 authentication", so the intro phrasing is loose but not actively misleading. Consider tightening in a future revision.
- `calicoctl get bgppeers -o wide` is supported.
- `calicoctl node status` is the correct command to show BGP session state (Established/Active/etc.).
- The mermaid diagram is syntactically valid.
