# Validation Summary: Configure IP Reservation in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Calico IPAM
- Calico IPReservation resources
- calicoctl
- Kubernetes
- kubectl

## Sources Consulted
- Calico Open Source v3.22 IPReservation resource reference: https://docs.tigera.io/archive/v3.22/reference/resources/ipreservation
- Calico Open Source latest IPReservation resource reference: https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- Calico Open Source v3.22 calicoctl get reference: https://docs.tigera.io/archive/v3.22/reference/calicoctl/get
- Calico Open Source v3.22 calicoctl ipam show reference: https://docs.tigera.io/archive/v3.22/reference/calicoctl/ipam/show
- Calico Open Source latest calicoctl user reference and resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl create deployment reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/

## Issues Found
- The introduction listed preventing allocation of broadcast and network addresses as a reservation use case. Calico documentation counts all addresses in a default `/26` IPAM block and only documents special automatic internal reservations for Windows nodes, so this wording was changed to "known-conflict addresses."
- The single-IP verification command used `calicoctl ipam show | grep "192.168.0.10"`, but the documented way to check one IP is `calicoctl ipam show --ip=<IP>`. Updated the command accordingly.
- The range example said it reserved `.1` to `.20`, but the CIDRs shown cover `.0` through `.19`. Updated the comment to match the actual CIDRs.
- The multi-pool section implied an IPReservation can be applied to a named IP pool. Official Calico documentation defines only `spec.reservedCIDRs`; there is no pool selector field. Updated the explanation to say reservations apply to matching addresses when Calico IPAM assigns new IPs.
- The multi-pool example comments referred to auto-reserved network and broadcast addresses in `/26` blocks. That behavior is not documented for general Calico IPAM. Simplified the comments to describe reserving selected static gateway IPs.
- The load-test command used `kubectl run --replicas=20`, but current `kubectl run` creates a pod and does not support the `--replicas` flag. Updated it to `kubectl create deployment load-test --image=busybox --replicas=20 -- sleep 3600`, which is supported by the official kubectl deployment command.
- The final IPAM verification command suggested reserved IPs appear as "reserved" in `calicoctl ipam show --show-blocks`. The documented command reports pool/block usage, while per-IP status is checked with `--ip=<IP>`. Updated the example to check a reserved IP directly.

## Review Notes
- The `IPReservation` YAML shape, `apiVersion: projectcalico.org/v3`, `kind: IPReservation`, and `spec.reservedCIDRs` field are correct for Calico v3.22 and current Calico.
- Calico documentation notes that IPReservation is intended for a small number of IP addresses or CIDRs and may slow allocation if a significant portion of a pool is reserved.
- Calico documentation also notes that static pod IP annotations override IPReservation resources, so the best-practice note about combining reservations with static pod IP annotations should be read with that caveat.
