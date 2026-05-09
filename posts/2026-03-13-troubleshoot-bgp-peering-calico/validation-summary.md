# Validation Summary: How to Troubleshoot BGP Peering in Calico

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- BIRD routing daemon
- calicoctl
- kubectl
- Linux routing, iptables, firewalld, and netcat

## Sources Consulted
- Calico documentation: Troubleshooting commands, including `calicoctl node status` and `ip route` checks: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico documentation: Troubleshooting and diagnostics, including BGP peer status guidance: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico documentation: `calicoctl node status` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: BGPConfiguration resource fields, including `asNumber`, `listenPort`, and `logSeverityScreen`: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico documentation: `calicoctl patch` command syntax and patch type support: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico documentation: BGPPeer resource fields, including `peerIP`, `asNumber`, and `localASNumber`: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- BIRD User's Guide: remote control commands including `show protocols all` and `show route ... protocol`: https://bird.network.cz/doc/bird-4.html
- RFC 4271: BGP-4 specification, including TCP port 179 and BGP finite state machine states: https://www.rfc-editor.org/rfc/rfc4271

## Issues Found
- The `calicoctl patch bgpconfiguration default --type merge` example used JSON merge patch mode. Current Calico documentation lists `merge` as not yet implemented for `calicoctl patch`, so the command was changed to use the default strategic patch form with `--patch`.
- The BIRD examples used `BGP_<peer_ip>` as if it were a guaranteed Calico protocol instance name. BIRD commands require the actual protocol instance name, and Calico-generated protocol names vary by environment. The examples were changed to use `<protocol-name>` from the earlier `show protocols` output.
- The text "Check what the node is advertising" was too specific for `birdcl show protocols all`, which shows detailed protocol/session information but not a complete export route listing. It was changed to "Check peer session details using the protocol name from `show protocols`."

## Review Notes
The guide assumes the Calico node pods are in the `calico-system` namespace, which is correct for operator-based installations. Manifest-based installations commonly use `kube-system`, so readers may need to adjust the namespace in those environments.
