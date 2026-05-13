# Validation Summary: Monitor IP Reservation in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Calico IPAM
- Calico IPReservation resources
- calicoctl
- Kubernetes Pods, annotations, RBAC, and CronJobs
- Python ipaddress module

## Sources Consulted
- Calico IPReservation resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- Calico specific pod IP address documentation: https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- Calico calicoctl IPAM show documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico calicoctl Kubernetes datastore configuration: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico native v3 CRDs documentation: https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The post described IPReservation as blocking pod allocation generally. Calico documentation states reservations block automatic IPAM assignment, while explicit pod IP annotations can override reservations. I updated the description, introduction, setup comments, and verification steps to consistently say automatic allocation.
- The verification step attempted to request a reserved IP using `cni.projectcalico.org/ipAddrs` and expected Calico to reject it. Official Calico documentation says that annotation overrides IPReservation resources. I replaced that test with an automatic-allocation pod check and added a warning not to use the annotation for this validation.
- The post suggested `calicoctl ipam show | grep -i "reserved"` to confirm reservations. The official `calicoctl ipam show` documentation reports IP usage and per-IP assignment state, not a reserved marker. I changed the command to check whether a reserved IP is already assigned with `calicoctl ipam show --ip=...`.
- The capacity calculation counted YAML list entries rather than the number of IP addresses covered by each reserved CIDR. I replaced it with a Python `ipaddress` calculation that sums the actual reserved CIDR sizes.
- The CronJob manifest referenced `serviceAccountName: calico-audit` without creating the ServiceAccount or RBAC permissions, and it did not explicitly configure calicoctl for the Kubernetes datastore. I added ServiceAccount, ClusterRole, ClusterRoleBinding, and `DATASTORE_TYPE=kubernetes`.
- The example labeled `192.168.0.255/32` as a broadcast address while the example pool is `192.168.0.0/16`, where that address is not the pool broadcast address. I changed the comment to a generic reserved infrastructure address.
- The best practice recommending separate IPReservation resources per category conflicted with Calico guidance to use a small number of IPReservation resources with multiple addresses. I updated the recommendation accordingly.

## Review Notes
The post is technically valid after corrections. One operational caveat remains: a single automatically allocated test pod is a practical smoke test, but it cannot prove every reserved address will never be selected under all future allocation pressure; ongoing reservation integrity checks and capacity monitoring are still required.
