# Validation Summary: Rolling Back Safely After Using calicoctl ipam split

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Calico IPAM
- Kubernetes
- kubectl
- Bash

## Sources Consulted
- Calico `calicoctl ipam split` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/split
- Calico `calicoctl ipam check` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show/
- Calico `calicoctl ipam release` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl delete` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The post treated recovery from `calicoctl ipam split` as if the operation might be read-only. Official Calico documentation describes `ipam split` as a state-changing operation that splits one IP pool into smaller IP pools and requires locking the Calico datastore. Updated the recovery wording to describe the split operation accurately.
- The post implied IPAM state is derived from pods and IP pool configuration. Calico documentation describes `calicoctl ipam check` as checking IPAM data structures against Kubernetes, and IPPool resources as Calico-managed allocation pools. Updated the restoration section to focus on datastore lock/unlock, IPPool inspection, IPAM checks, and report-based remediation.
- The remediation guidance did not show the documented report workflow for leaked addresses. Updated the `calicoctl ipam check` command to write `report.json` and added `calicoctl ipam release --from-report report.json`, with a warning to review releases first.
- The verification command `kubectl run recovery-test --image=busybox --restart=Never -- sleep 10` passed `sleep 10` as container args rather than the command. Kubernetes documents `--command --` for overriding the container command, so the example was updated.
- The cleanup command used `kubectl delete pod recovery-test --grace-period=0`. Current Kubernetes documentation says grace period 0 can only be used with `--force`; updated the example to a normal delete with `--ignore-not-found`.
- The troubleshooting section suggested exact previous IP assignments cannot be restored, but did not mention the datastore backup exception or lack of an `ipam merge` rollback command. Updated the guidance to state that exact restoration requires restoring the underlying Calico datastore from backup and that there is no direct merge rollback command.

## Review Notes
The post is now technically accurate as a high-level recovery guide. It still intentionally avoids a fully prescriptive manual IPPool rollback procedure, because deleting or recreating pools after a split is cluster-specific and can orphan live allocations if done without checking current IPAM state.
