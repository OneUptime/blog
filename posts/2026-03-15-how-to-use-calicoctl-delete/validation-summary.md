# Validation Summary: How to Use calicoctl delete with Practical Examples

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Calico network policy
- Calico IPAM and IP pools
- BGP peers
- Host endpoints and workload endpoints

## Sources Consulted
- Calico Open Source calicoctl delete command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico Open Source calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source calicoctl patch command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico Open Source calicoctl user reference and resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico Open Source resource definitions: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico Open Source IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source IP pool migration guidance: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico Open Source change IP pool block size guidance: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico Open Source calicoctl ipam show command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source host endpoint object guidance: https://docs.tigera.io/calico/latest/reference/host-endpoints/objects

## Issues Found
- The introduction claimed that `calicoctl delete` understands Calico resource interdependencies. The official command reference describes deletion by resource type/name, file, directory, or stdin, and the user reference documents supported Calico resource aliases. Updated the wording to avoid implying automatic dependency handling.
- The verification example said `calicoctl get globalnetworkpolicy my-policy` should show "resource does not exist". The official `calicoctl get` reference says missing resources return no results. Updated the comment accordingly.
- The IP pool section said deleting an in-use pool will orphan pod IP addresses. Official Calico IP pool migration guidance says deleting the old pool too early can affect existing pods, and disabling a pool only prevents new allocations. Updated the wording to match the documented behavior.
- The IP pool verification command used `calicoctl ipam show --ip=10.52.0.0`, which checks one specific IP address, not all allocations in a pool. Replaced it with `calicoctl ipam show --show-blocks`, which Calico documents for reviewing pool and block usage.

## Review Notes
The remaining examples use valid `calicoctl` resource aliases and flags according to the official command references. The `kubectl get pods --all-namespaces | grep -v Running` check is a quick health signal, but it can also show the header row and completed job pods; a future revision could use a more precise Kubernetes field selector or JSONPath check.
