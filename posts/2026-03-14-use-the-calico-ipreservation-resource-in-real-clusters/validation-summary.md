# Validation Summary: Using the Calico IPReservation Resource in Production Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico IPReservation
- Calico IPAM
- Calico FelixConfiguration
- Calico Typha
- Kubernetes
- kubectl
- calicoctl

## Sources Consulted
- Calico IPReservation resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl ipam command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico calicoctl ipam show command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Felix configuration documentation: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico FelixConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico calicoctl node status command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The post implied that IPReservation resources could use node selectors for environment-specific settings. Calico IPReservation only supports `spec.reservedCIDRs`, and reservations apply to Calico IPAM automatic assignment across the cluster. Replaced the node-label example with separate environment-named IPReservation manifests and added a note that node selectors are not supported.
- The small-cluster section referred to checking effective node configuration with a node YAML grep, which does not validate IPReservation behavior. Replaced it with `calicoctl ipam show`, which is the documented command for viewing Calico IPAM usage.
- The scale guidance suggested increasing reconciliation intervals and monitoring many IPReservation resources. The official IPReservation documentation instead warns that reservations are checked for every IPAM assignment and recommends one or two resources with multiple entries. Updated the guidance accordingly.
- The monitoring command used the singular Kubernetes resource form `ipreservation.projectcalico.org`. Updated it to `ipreservations.projectcalico.org`.
- The Felix health endpoint note incorrectly tied liveness and readiness checks to Prometheus metrics. Felix health endpoints are controlled by Felix health settings, while Prometheus metrics are separate. Updated the wording.
- The troubleshooting section suggested checking Felix configuration reload messages and node selectors for IPReservation behavior. Replaced those notes with checks for already allocated addresses, Calico IPAM automatic assignment, and explicit pod IP annotations, which match documented IPReservation behavior.
- The RBAC example combined a specific `can-i` check with `--list`, which is not valid `kubectl auth can-i` usage. Removed `--list` and corrected the resource group form.

## Review Notes
The post now stays within the documented IPReservation behavior. Future improvements could include a note that reservations created after an IP is already allocated do not release that IP, and that explicit pod IP annotations can override reservations.
