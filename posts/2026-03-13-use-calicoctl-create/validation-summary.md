# Validation Summary: calicoctl Command Guide - Use Create

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes networking
- Calico resource management

## Sources Consulted
- Calico Open Source 3.32 calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico Open Source 3.32 calicoctl create: https://docs.tigera.io/calico/latest/reference/calicoctl/create
- Calico Open Source 3.32 calicoctl apply: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Open Source 3.32 calicoctl get: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source 3.32 calicoctl delete: https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico Open Source 3.32 calicoctl patch: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico Open Source 3.32 calicoctl validate: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico Open Source 3.32 calicoctl node commands: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico Open Source 3.32 calicoctl ipam commands: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source 3.32 calicoctl cluster commands: https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/overview
- Calico Open Source 3.32 FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
No technical issues found.

## Review Notes
The commands and explanations align with current Calico Open Source 3.32 documentation. `calicoctl create -f` treats existing resources as a terminating error unless `--skip-exists` is used, `calicoctl apply -f` creates or replaces resources, `calicoctl get` supports `-o yaml`, `-o wide`, and `--all-namespaces`, `calicoctl patch` supports `-p/--patch`, and `calicoctl validate -f` validates resource files without applying them. The FelixConfiguration patch example uses the documented `logSeverityScreen` field and `Info` value.
