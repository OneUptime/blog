# Validation Summary: How to Validate Migrating Calico IP Pools

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- Calico IPAM
- Calico IPPool resources
- calicoctl
- kubectl

## Sources Consulted
- Calico Open Source documentation: Migrate from one IP pool to another, https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico Open Source documentation: IP pool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source documentation: calicoctl ipam command reference, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source documentation: calicoctl ipam show command reference, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source documentation: calicoctl ipam check command reference, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: Configure calicoctl, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Kubernetes documentation: kubectl get command reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
No technical issues found.

## Review Notes
The IPPool YAML uses the correct `projectcalico.org/v3` API group, `IPPool` kind, and valid `cidr`, `blockSize`, and `natOutgoing` fields. Calico documentation notes that `blockSize` can only be set when the pool is created. The `calicoctl ipam show --show-blocks` and `calicoctl ipam check -o ipam-report.json` commands are documented in current Calico Open Source references. The post's `kubectl get pods -A -o wide` command is valid for listing pods across namespaces with extended output, including pod IPs.
