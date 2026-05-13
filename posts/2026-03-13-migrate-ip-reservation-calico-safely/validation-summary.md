# Validation Summary: Migrate IP Reservation in Calico Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico IPAM
- Calico `IPReservation` resources
- `calicoctl`
- Kubernetes Services and Pods
- `kubectl`

## Sources Consulted
- Calico IP reservation resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- Calico `calicoctl` user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico `calicoctl ipam check` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The prerequisite list did not state that Calico IPAM must be enabled. The Calico documentation states that `IPReservation` applies only when Calico IPAM is in use, so I added that prerequisite.
- The audit command used `calicoctl ipam show --show-blocks` while describing a check of whether reserved IPs are individually in use. I changed it to `calicoctl ipam show --ip=10.244.0.1`, which is the documented way to check a specific IP address.
- The Service cross-reference command grepped for `ExternalIP|ClusterIP`, which does not reliably match the actual `kubectl get services -o wide` column names or Service values. I changed it to a documented `custom-columns` query showing namespace, name, type, cluster IP, external IPs, and load balancer IPs.
- The migration mapping and reservation manifest described `10.244.255.254` and `172.16.255.254` as broadcast addresses. For the shown `/16` pools, those are not the broadcast addresses, so I changed the label to "Infrastructure endpoint."
- Step 4 said `calicoctl ipam check --show-all-ips` would attempt to manually allocate a reserved IP. The official command checks IPAM datastore integrity against Kubernetes; it does not perform manual allocation. I changed the validation flow to use `calicoctl ipam show --ip=<reserved-ip>` for specific reserved IP checks and retained `ipam check` only for datastore consistency.
- The best practices claimed `calicoctl ipam check` confirms no reserved IPs were accidentally allocated. I corrected this to use `calicoctl ipam show --ip=<reserved-ip>` for reservation checks and `calicoctl ipam check` for IPAM consistency.
- The best practices recommended reserving network and broadcast addresses in every pool. This was too broad and potentially misleading for Calico IP pools, so I replaced it with the documented caveat that `IPReservation` only affects automatic assignment by Calico IPAM and can be overridden by explicit pod IP annotations.

## Review Notes
Calico documentation notes that `IPReservation` is intended for relatively small numbers of addresses or CIDRs, that existing allocations are not automatically released when a new reservation is created, and that explicit pod IP annotations can override reservations. The post now reflects the most important operational caveat without restructuring the guide.
