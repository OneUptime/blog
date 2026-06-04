# Validation Summary: How to Use kubectl debug Node to Create Debug Pods on Specific Kubernetes Nodes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- kubectl
- kubectl debug
- Kubernetes node debugging

## Sources Consulted
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes Debugging Kubernetes Nodes With Kubectl: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The post described `kubectl debug node` as creating privileged debug containers by default. Kubernetes documentation states that node debug pods run in the host IPC, Network, and PID namespaces and mount the node filesystem at `/host`, but the pod is not privileged by default. Updated the description and introductory paragraph to say debug pods are not privileged by default and to mention `--profile=sysadmin` or a manually created privileged pod when privileged access is required.
- The post included a Kubernetes 1.20+ version note without enough context. Removed the version-specific parenthetical to avoid implying that this exact default behavior is tied only to Kubernetes 1.20+.

## Review Notes
The post is brief and does not include executable command examples. The remaining technical claims align with the official Kubernetes documentation for node debugging with `kubectl debug`.
