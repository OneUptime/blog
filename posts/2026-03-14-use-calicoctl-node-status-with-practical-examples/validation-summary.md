# Validation Summary: Using calicoctl node status with Practical Examples

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes
- BGP
- Route reflectors
- Shell scripting

## Sources Consulted
- Calico documentation: calicoctl node status command reference, https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: calicoctl node command reference, https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico documentation: Install calicoctl, https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico documentation: Configure BGP peering, https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: Troubleshooting commands, https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- RFC 4271: A Border Gateway Protocol 4 (BGP-4), https://www.rfc-editor.org/rfc/rfc4271

## Issues Found
- The prerequisites said `calicoctl` v3.25+ was required. Calico documentation recommends installing the `calicoctl` version that matches the Calico cluster, so the prerequisite was updated accordingly.
- The cluster-wide BGP health script used `kubectl exec` into `calico-node` pods to run `calicoctl node status`. Calico documents `calicoctl node ...` commands as host commands that need access to host filesystem paths, so the example was changed to run `sudo calicoctl node status` over SSH on each node.
- The `active` BGP state was described as a completed TCP connection with failed BGP negotiation. RFC 4271 describes Active as a state where BGP is trying to acquire the peer or retry the TCP connection, so the explanation was corrected.
- The session stability script parsed the `SINCE` value with whitespace-delimited `awk`, which selected the wrong field from the pipe-delimited table. The script now parses by `|` and trims whitespace.
- The verification example implied that `nodes - 1` is always the expected peer count. That is only true for node-to-node mesh mode, so the comment was narrowed to that topology.

## Review Notes
The post is accurate after the fixes. The examples still assume SSH access to node names returned by `kubectl get nodes`; in some environments operators may need to map node names to reachable hostnames or IPs.
