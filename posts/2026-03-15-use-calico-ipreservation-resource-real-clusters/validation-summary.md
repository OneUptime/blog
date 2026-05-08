# Validation Summary: How to Use the Calico IPReservation Resource in Real Clusters

## Status
validated

## Post Type
Production networking guide

## Technologies Covered
- Calico IPReservation
- Calico IPAM
- Calico IPPool
- Kubernetes
- calicoctl
- Bash scripting

## Sources Consulted
- Calico Enterprise IP reservation resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/ipreservation
- Calico IP pool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl ipam command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Project Calico Go API reference for IPReservation: https://pkg.go.dev/github.com/projectcalico/api/pkg/apis/projectcalico/v3#IPReservation

## Issues Found
- The post implied that IPReservations prevent reserved addresses from ever being handed out to pods. Updated the wording to clarify that IPReservations block new automatic Calico IPAM allocations; official documentation notes that existing allocations are not released and specific-IP annotations can override reservations.
- The prerequisites said only "Calico CNI (v3.22 or later)." Updated this to require Calico IPAM and the IPReservation CRD, with Calico Enterprise v3.22 or later as an example, because the official IPReservation reference is scoped to Calico Enterprise IPAM.
- The verification command used `calicoctl get ... -o jsonpath`, but the official `calicoctl get` output formats do not include `jsonpath`. Replaced it with a supported Go template output.
- The verification comment said "Verify total reserved count" for a command that only counts slash-containing YAML lines, not the number of individual reserved IP addresses inside CIDR ranges. Updated the comment to describe it as counting reserved CIDR entries in YAML output.
- The `calicoctl ipam show` comment claimed it verifies that utilization accounts for reservations, which the command reference describes more generally as reporting IP usage. Updated the comment to "Review IPAM utilization alongside reservations."
- The troubleshooting guidance only mentioned high-churn scenarios. Updated it to include documented causes: reservations created after an IP is already allocated and annotations that request specific IPs.

## Review Notes
The YAML resource examples use the documented `apiVersion`, `kind`, metadata, and `spec.reservedCIDRs` fields. The IPPool example uses documented fields and accepted values for `cidr`, `vxlanMode`, `natOutgoing`, `nodeSelector`, and `blockSize`. The Bash automation example is syntactically valid for the stated purpose, though a production version should add input validation before applying generated manifests.
