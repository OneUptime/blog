# Validation Summary: How to Use the Calico StagedNetworkPolicy Resource in Real Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Enterprise
- Calico StagedNetworkPolicy
- Calico NetworkPolicy
- Kubernetes
- calicoctl
- Calico Enterprise flow logs

## Sources Consulted
- Calico Enterprise StagedNetworkPolicy resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/stagednetworkpolicy
- Calico Enterprise staged policy workflow: https://docs.tigera.io/calico-enterprise/latest/network-policy/staged-network-policies
- Calico Enterprise calicoctl user reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/overview
- Calico Enterprise calicoctl get reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/get
- Calico Enterprise flow log data types: https://docs.tigera.io/calico-enterprise/latest/observability/elastic/flow/datatypes

## Issues Found
- The traffic probe used `http://payment-service:443`, which is misleading for a service on port 443. Changed it to `https://payment-service:443` with `curl -k` for clusters using internal or self-signed service certificates.
- The flow-log verification command grepped the `calico-node` container logs for `staged`, but Calico Enterprise staged policy impact is represented in flow logs under `policies.pending_policies`, and staged policy names are prefixed with `staged:`. Changed the example to check that file flow logs are enabled and then inspect `/var/log/calico/flowlogs/flows.log` for `pending_policies` entries containing `staged:`.

## Review Notes
The StagedNetworkPolicy YAML examples use the current `projectcalico.org/v3` API and valid Calico rule fields. The `kubectl` and `calicoctl` staged policy resource names are supported aliases in current Calico Enterprise documentation. The flow-log command assumes file flow logs are enabled; otherwise, the same `pending_policies` data should be inspected through the configured Elasticsearch or Calico Enterprise Manager flow-log view.
