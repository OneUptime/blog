# Validation Summary: How to Validate Resolution of IP Pool Exhaustion in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Calico IPAM
- calicoctl
- Kubernetes
- kubectl

## Sources Consulted
- Calico documentation: calicoctl ipam overview, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam check, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Kubernetes documentation: kubectl wait, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes documentation: kubectl events, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/

## Issues Found
- The diagnosis command searched for `FailedScheduling` in `kubectl get pods` output. `FailedScheduling` is an event reason, not a pod status column, so I split the diagnosis into separate pending pod and event checks.
- The free-IP validation parsed the first number from the matching `calicoctl ipam show` output. Because the documented table includes CIDRs and other numeric columns before `IPS FREE`, this could report the wrong value. I changed it to parse and sum the documented `IPS FREE` column for `IP Pool` rows.

## Review Notes
- `kubectl wait` supports waiting for the `Ready` condition on pod resources and can accept multiple resources.
- `calicoctl ipam check` is valid for checking IPAM data structure integrity against Kubernetes.
- The post assumes the default namespace for validation pods. In a restricted cluster, operators may need to specify an appropriate namespace.
