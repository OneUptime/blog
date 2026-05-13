# Validation Summary: How to Migrate to BGP to Workload Connectivity in Calico Safely

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- Calico network policy
- Calico IP pools and outgoing NAT
- AWS Route 53 weighted records

## Sources Consulted
- Calico documentation: Configure BGP peering, https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: calicoctl node status, https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: CalicoNodeStatus resource, https://docs.tigera.io/calico/latest/reference/resources/caliconodestatus
- Calico documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl patch, https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico documentation: NetworkPolicy resource, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Configure outgoing NAT, https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- AWS CLI Command Reference: route53 change-resource-record-sets, https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html

## Issues Found
- The Phase 1 verification text said `calicoctl node status` and `birdcl show route` verified advertised pod routes. Calico documents `calicoctl node status` as a BGP peering status command, so the post now describes it as a peering check and uses an external Linux route lookup to verify reachability to the pod IP.
- The Route 53 weighted DNS example added only the pod record. Route 53 weighted records with the same name and type must be configured as a weighted set with unique `SetIdentifier` values, so the example now upserts both the existing service path and the new pod-direct path with weights.
- The `calicoctl patch` command used `--type merge`, but Calico's command reference lists JSON merge patch as not implemented. The command now uses the documented default strategic patch format.
- The conclusion described disabling `natOutgoing` as affecting applications that log or rate-limit based on client IP. Calico documents `natOutgoing` as masquerading pod traffic to destinations outside Calico IP pools, so the conclusion now explains the direct pod connectivity risk as masqueraded return traffic from pods to external clients.

## Review Notes
- Directly publishing individual pod IPs in DNS can be operationally fragile because pods are ephemeral. The post's mention of a BGP-aware load balancer is a better long-term pattern when endpoints change frequently.
