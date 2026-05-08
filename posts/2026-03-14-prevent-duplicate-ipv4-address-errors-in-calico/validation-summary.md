# Validation Summary: Preventing Duplicate IPv4 Address Errors in Calico

## Status
validated

## Post Type
Troubleshooting / Operations Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- calicoctl
- kubectl
- Calico IPPool resources
- Calico IPAM

## Sources Consulted
- Calico Open Source calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico Open Source calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Open Source calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico Open Source calicoctl IPAM reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico Open Source calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico Open Source IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post used `calicoctl apply -f ... --dry-run` for manifest validation, but the current Calico Open Source `calicoctl apply` reference does not document a `--dry-run` flag. The examples were changed to `calicoctl validate -f ...`, which is the documented offline validation command for Calico resource manifests.
- The post showed `calicoctl node status` without noting that Calico documents node commands as needing to run directly on a compute host running Calico. Comments were added before those examples.
- The automated post-deployment check claimed to verify zero calico-node restarts but only checked pod status. The shell pipeline now fails if any selected pod is not `Running` or has a nonzero restart count.
- The connectivity check used HTTP against `kubernetes.default.svc/healthz`, which is not a reliable current Kubernetes API service check. It now uses a temporary curl pod to make an HTTPS request to `https://kubernetes.default.svc`.

## Review Notes
The IPPool example fields `cidr`, `blockSize`, `ipipMode`, `natOutgoing`, and `disabled` match the current Calico Open Source IPPool resource schema. The recommended capacity thresholds are operational guidance rather than Calico-enforced limits.
