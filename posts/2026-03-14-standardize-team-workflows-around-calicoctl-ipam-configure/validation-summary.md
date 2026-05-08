# Validation Summary: Standardizing Team Workflows Around calicoctl ipam configure

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Calico IPAM
- Kubernetes
- Bash

## Sources Consulted
- Calico documentation: calicoctl ipam configure, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/configure
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: IPAMConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/ipamconfig
- Calico documentation: Configure calicoctl, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Kubernetes documentation: kubectl run, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl delete, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The post used `calicoctl ipam configure show` to display current IPAM configuration. Official Calico documentation shows `calicoctl ipam configure` as the command for modifying IPAM configuration, while current configuration is displayed with `calicoctl ipam show --show-configuration`. Updated the compliance check and wrapper script to use `calicoctl ipam show --show-configuration`.
- The compliance check parsed the value with `awk '{print $2}'`, which does not match the table output documented for `calicoctl ipam show --show-configuration`. Updated the parsing to split on `|`, trim spaces, and read the value column for `StrictAffinity`.

## Review Notes
The verification pod command is syntactically valid, but it may be flaky in slow clusters because it sleeps for a fixed five seconds before reading pod status. A future improvement could wait for the pod to become Ready before checking its assigned IP.
