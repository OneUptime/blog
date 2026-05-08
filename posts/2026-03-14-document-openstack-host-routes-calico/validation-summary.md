# Validation Summary: How to Document OpenStack Host Routes with Calico for Operations Teams

## Status
validated

## Post Type
Operations guide

## Technologies Covered
- OpenStack
- Calico for OpenStack
- Calico BGP routing
- BIRD
- Felix
- Linux routing commands
- calicoctl
- Bash

## Sources Consulted
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico overlay networking reference: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico IPPool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl ipam show reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- OpenStackClient server command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html
- Linux ip-route command help from local iproute2 installation

## Issues Found
- The route lifecycle diagram implied that route reflectors are always used. Changed the diagram label to "BGP Peers or Route Reflectors Distribute" because Calico deployments may use node-to-node mesh, route reflectors, or other BGP peer layouts.
- The blackhole route explanation described the route as an unused IPAM block. Changed it to describe a locally owned IPAM block where more-specific workload routes override the blackhole for IPs that are in use.
- The OpenStack lookup command selected the Host column without requesting long server-list output. Added `--long`, matching the OpenStackClient behavior where additional server fields are exposed by long output.
- The route check used `ip route show <IP>` for a forwarding decision. Changed it to `ip route get <IP>`, which is the appropriate command to show the route selected for a destination.
- The Bash examples used unquoted variables and regex grep for IP addresses. Quoted shell variables where relevant and changed the endpoint lookup to `grep -F` so dotted IP addresses are treated literally.
- The runbook and quick reference assumed `proto bird` is available as an iproute2 protocol name. Added a fallback to `proto 80`, which is how Calico/BIRD routes may appear on systems without a `bird` protocol alias.
- The BGP AS pre-check assumed every node must use the same cluster AS. Adjusted the wording to allow expected per-node BGP configuration.

## Review Notes
The post remains version-neutral. Calico's OpenStack integration and routing behavior can vary by datastore, packaging, encapsulation mode, and whether BGP or Felix programs cluster routes, so operators should still validate route examples against their live environment.
