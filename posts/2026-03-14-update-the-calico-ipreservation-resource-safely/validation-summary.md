# Validation Summary: Safely Updating the Calico IPReservation Resource in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico IPReservation resources
- Calico IPAM
- calicoctl
- Kubernetes kubectl
- Kubernetes RBAC

## Sources Consulted
- Calico IP reservation resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- Calico resource definitions documentation: https://docs.tigera.io/calico/latest/reference/resources/overview
- calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl apply command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- calicoctl validate command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- calicoctl ipam show command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The introduction overstated IPReservation risk by saying a bad change could drop traffic or break BGP peerings. Calico documents IPReservation as applying to automatic Calico IPAM assignment, so the wording was changed to focus on future allocation behavior and constrained pools.
- The review checklist asked whether the change affects active connections or requires Felix/BGP restarts. IPReservation changes do not release existing assignments automatically and are consulted at allocation time, so the checklist was updated to focus on future assignments, already-assigned addresses, and remaining free capacity.
- The apply step claimed `calicoctl apply` was "for validation." Calico has a separate `calicoctl validate` command, so the post now validates the manifest before applying it.
- The monitoring example searched for generic Felix configuration reload messages. For IPReservation changes, IPAM-related logs are more relevant, so the grep target was changed to `ipam`.
- The troubleshooting section included BGP-session guidance that was not relevant to IPReservation. It was replaced with guidance for new pods failing to receive IP addresses.
- The "unknown fields are silently ignored by kubectl" note was inaccurate and mismatched the post's `calicoctl` workflow. It was replaced with `calicoctl validate` guidance and the documented note that IPReservations affect future automatic allocation requests.
- The CRD version command printed the CRD name and creation timestamp, not installed CRD versions. It was changed to use `custom-columns` with `.spec.versions[*].name`.
- The RBAC example mixed a specific `can-i` permission check with `--list` and checked `GlobalNetworkPolicy` instead of `IPReservation`. It was changed to a direct `update ipreservations.crd.projectcalico.org` permission check.
- The events command was described as auditing recent Calico resource changes. Kubernetes events are not the audit log, so the comment was corrected to describe recent namespace events.

## Review Notes
The post is technically relevant and now aligns with the documented behavior of IPReservation: reservations prevent future automatic Calico IPAM use of listed IPs/CIDRs, but existing allocations are not automatically released. The local environment did not have usable `calicoctl` or `kubectl` binaries available, so CLI validation was performed against official command references rather than local `--help` output.
