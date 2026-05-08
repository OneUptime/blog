# Validation Summary: How to Create the Calico IPReservation Resource

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Calico IPReservation resource
- Calico IPAM
- calicoctl
- Kubernetes
- kubectl
- IPv4 and IPv6 CIDR notation

## Sources Consulted
- Calico Open Source IPReservation resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- Calico Open Source "Use a specific IP address with a pod" documentation: https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- Calico Open Source calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Open Source calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico v3.22 release notes archive: https://docs.tigera.io/archive/v3.22/release-notes/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post described IPReservation as preventing IPs from ever being assigned to pods. Calico IPReservation applies to automatic Calico IPAM assignments; explicit pod IP annotations can still use reserved IPs. Updated the description, introduction, troubleshooting note, and conclusion to say "automatically assigned" and to mention explicit IP requests.
- The field description implied individual IPs must be written only as /32 or /128 CIDRs. Official Calico documentation accepts both plain IP addresses and CIDRs. Updated the field description accordingly.
- The post recommended organizing reservations into multiple separate resources. Official Calico documentation recommends using one or two IPReservation resources with multiple addresses because reservations are checked on each automatic IPAM allocation request. Updated the section to group the example reservations into a single resource.
- After grouping reservations into a single resource, the directory apply command no longer matched the example. Updated it to apply a single YAML file.

## Review Notes
The remaining examples use valid `projectcalico.org/v3` IPReservation manifests and current `calicoctl` / `kubectl` command forms. The v3.22 prerequisite is consistent with the archived Calico v3.22 documentation including IPReservation in the resource reference.
