# Validation Summary: Troubleshoot IP Reservation in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Calico IPAM
- Calico IPReservation resources
- calicoctl
- Kubernetes
- kubectl
- jq

## Sources Consulted
- Calico Open Source IPReservation resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- Calico Open Source IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico Open Source calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Open Source calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico IPAM concepts documentation: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses

## Issues Found
- The post described IPPool annotations as a Calico IP reservation mechanism. Official Calico documentation describes `IPReservation` resources for reservation and pod annotations for forcing specific IP requests; it does not document IPPool annotations for reserved ranges. I removed the IPPool annotation check and changed the wording to focus on `IPReservation`.
- The prerequisites said "Calico 3.x or later" even though the post relies on `IPReservation`, which is documented for Calico 3.21 and later. I changed the prerequisite to "Calico 3.21 or later with Calico IPAM."
- The sample reservation comment said `10.244.0.0/29` reserved the first 10 IPs. A `/29` contains 8 addresses, so I corrected the comment to "first 8 IPs."
- The sample reserved "broadcast and gateway addresses" from a `/26` allocation block. Calico IPAM blocks are allocation blocks, not necessarily L2 subnets with broadcast and gateway semantics. I removed those misleading entries.
- The conflict detection example used a broad `grep` pattern and described `calicoctl ipam check` as checking specific IPs. I changed the pod check to an explicit `jq` filter for the example reserved IPs, added `calicoctl ipam show --ip=...` for specific IP lookup, and kept `calicoctl ipam check` for datastore consistency.
- The best practices advised reserving the first and last IP in every IP pool block. Calico documentation instead cautions that large reservations can slow IPAM allocation searches. I replaced that guidance with the documented recommendation to keep reservations small.

## Review Notes
Calico documentation notes that if an `IPReservation` is created after an address is already in use, the IP is not automatically released and the reservation is only checked during automatic allocation. It also notes that Kubernetes annotations that force specific pod IP addresses override `IPReservation` resources, so operators should audit static pod IP requests separately when troubleshooting reserved IP use.
