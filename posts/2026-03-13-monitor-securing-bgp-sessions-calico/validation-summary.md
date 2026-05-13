# Validation Summary: How to Monitor BGP Session Security in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes
- BGP (Border Gateway Protocol)
- BIRD (BGP routing daemon used by Calico)
- TCP MD5 authentication (RFC 2385)
- `calicoctl` CLI
- Kubernetes Secrets

## Sources Consulted
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGP configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico `calicoctl node status` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- BIRD CLI documentation: https://bird.network.cz/?get_doc&v=20&f=bird-4.html
- RFC 2385 — Protection of BGP Sessions via the TCP MD5 Signature Option

## Issues Found
1. **Misleading claim about encryption**: The introduction stated that BGPPeer lets you configure "per-peer authentication and encryption settings." Calico BGPPeer only supports password (MD5) authentication via the `password.secretKeyRef` field — it does not configure BGP session encryption (Calico does not encrypt the BGP control-plane sessions themselves). Reworded to accurately reflect that BGPPeer configures TCP MD5 password authentication (RFC 2385) via a Kubernetes Secret.

2. **Incorrect BIRD CLI command**: The verification step used `bird cli <<< "show protocols all bgp_peer_router01" | grep auth`. This is wrong on multiple counts:
   - The BIRD CLI client is named `birdcl` (or `birdc` upstream), not `bird cli`.
   - Calico's BIRD control socket is at `/var/run/calico/bird.ctl` and must be specified with `-s`.
   - The protocol naming convention used by Calico is `Mesh_<ip>` / `Node_<ip>` / `Global_<ip>`, not `bgp_peer_router01`.
   - `birdcl` must be invoked inside the `calico-node` container.
   Replaced with a correct `kubectl exec ... birdcl -s /var/run/calico/bird.ctl show protocols all` invocation.

## Review Notes
- The BGPPeer YAML uses the correct schema: `spec.password.secretKeyRef.{name,key}` matches the Calico v3 API.
- The `data.router01-password: <base64-encoded-password>` is a placeholder; readers should remember Secret `data` values must be base64-encoded (alternatively `stringData` can be used).
- The Secret namespace `kube-system` is correct for manifest-based Calico installs. Operator-based installs typically read password secrets from `calico-system`; this is configurable via `CALICO_BGP_SECRETS_NAMESPACE` on calico-node. Worth noting for readers but not factually incorrect as written.
- The introduction sentence "This guide covers monitor BGP sessions" is grammatically awkward (should be "monitoring") but is a style/grammar issue, so it was left untouched per the review guidelines.
- The `calicoctl node status | grep Established` verification works for confirming that BGP sessions are up but does not by itself prove MD5 is in use; the BIRD-side check is needed for that.
