# Validation Summary: Safely Updating the Calico IPAMConfiguration Resource in Kubernetes

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico IPAMConfiguration resources
- Kubernetes custom resources
- kubectl
- calicoctl IPAM and node status commands
- Kubernetes RBAC and audit/event inspection

## Sources Consulted
- Calico IPAMConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/ipamconfig
- Calico resource definitions reference: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico calicoctl configuration guide: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl ipam configure reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/configure
- Calico calicoctl ipam overview: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post used `calicoctl get ipamconfiguration` and `calicoctl apply -f` for IPAMConfiguration manifests. Current Calico documentation recommends `kubectl` for most Calico API resource operations when the Calico API server is available, while `calicoctl` remains required for `calicoctl ipam` and `calicoctl node` subcommands. I changed IPAMConfiguration export, diff, apply, verification, rollback, and multi-cluster comparison examples to use `kubectl get ipamconfigurations default` and `kubectl apply -f`.
- The description claimed the process updates production without downtime. I changed this to reducing downtime risk, because the workflow lowers operational risk but cannot guarantee no downtime.
- The introduction said a misconfigured IPAMConfiguration can break BGP peerings. IPAMConfiguration controls global IPAM behavior, not BGP peering configuration. I changed the impact description to focus on pod IP allocation and address allocation failures.
- The log-check example looked for generic Felix configuration reload messages. I changed it to look for IPAM, allocation, and block-related messages in calico-node logs, which better matches the resource being changed.
- The troubleshooting section said unknown fields are silently ignored by kubectl. Modern Kubernetes field validation and CRD behavior may warn, reject, or prune fields depending on the server and CRD configuration. I changed the guidance to check apply output and verify the stored resource.
- The CRD version check listed CRD names and creation timestamps, not served CRD versions. I changed it to query `.spec.versions[*].name` on the IPAMConfiguration CRD.
- The RBAC check combined `kubectl auth can-i --list` with a specific verb/resource and described listing who has access. `kubectl auth can-i` checks whether the current identity can perform an action. I changed the example to check whether the current identity can update the IPAMConfiguration resource.
- The capacity planning section referred to a Calico metrics endpoint for IPAM utilization without a concrete documented command in the post. I changed it to use `calicoctl ipam show`, which is the documented Calico IPAM status command.

## Review Notes
The post is now technically valid as a Kubernetes/Calico API-server workflow for managing the singleton `IPAMConfiguration` named `default`. Environments that have not enabled the Calico API server may need a datastore-specific `calicoctl` workflow instead, but the reviewed prerequisites now explicitly require `kubectl` access to Calico API resources.
