# Validation Summary: How to Use calicoctl ipam split with Practical Examples

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Calico IPAM
- Calico IPPool resources
- Kubernetes namespaces and pods
- Bash and Python helper scripting

## Sources Consulted
- Calico Open Source documentation: `calicoctl ipam split` - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/split
- Calico Open Source documentation: `calicoctl ipam show` - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source documentation: IPPool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source documentation: Calico CNI plugin annotations - https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico Open Source documentation: restrict a pod to an IP address range - https://docs.tigera.io/calico/latest/networking/ipam/legacy-firewalls
- Calico Open Source documentation: `calicoctl patch` - https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Project Calico source: `calicoctl ipam split` implementation - https://raw.githubusercontent.com/projectcalico/calico/master/calicoctl/calicoctl/commands/ipam/split.go

## Issues Found
- The post described `calicoctl ipam split` as a planning command that outputs CIDR blocks. Official documentation and source show that it mutates the datastore by splitting an existing IPPool into smaller IPPools. Updated the introduction, examples, troubleshooting, and conclusion to describe actual IPPool creation.
- The post omitted the required datastore lock/unlock workflow. Added `calicoctl datastore migrate lock` and `calicoctl datastore migrate unlock` around split workflows.
- The post said `ipam split` operates on allocation blocks. Calico IPAM blocks are per-node allocation units controlled by `blockSize`; `ipam split` operates on IPPool resources. Corrected the block-size explanation.
- The multi-zone example created new IPPools from CIDRs after running split, which would overlap with the child pools created by split. Replaced it with `calicoctl patch ippool ...` commands to update node selectors on the split child pools.
- The tenant isolation section referred to IPPool namespace selectors, which are not IPPool fields. Replaced this with Calico CNI namespace annotation usage via `cni.projectcalico.org/ipv4pools`, and set split pools to `assignmentMode: Manual` before unlocking.
- The helper script used `calicoctl ipam split` as if it were a dry-run calculator. Replaced it with a Python `ipaddress` calculation that prints planned subnets without modifying Calico resources.
- The verification section claimed `calicoctl ipam show` verifies allocation from new pools. Updated the wording to say it verifies IPAM state.

## Review Notes
- The examples assume the original pool is named `default-ipv4-ippool`; the generated split pool names include the original pool name, so users with a different source pool name must adjust the child pool names.
- The post is now technically aligned with current Calico Open Source documentation and the current Project Calico implementation reviewed on 2026-05-08.
