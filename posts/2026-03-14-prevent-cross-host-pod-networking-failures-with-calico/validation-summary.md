# Validation Summary: Preventing Cross-Host Pod Networking Failure Errors in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- calicoctl
- kubectl
- Calico IPAM
- Calico IPPool resources
- BGP, IP-in-IP, and VXLAN networking

## Sources Consulted
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes API health endpoint reference: https://kubernetes.io/docs/reference/using-api/health-checks/
- Project Calico v3.26.0 calicoctl source for apply/ipam command availability: https://github.com/projectcalico/calico/tree/v3.26.0/calicoctl
- Project Calico v3.31.0 calicoctl source for validate command availability: https://github.com/projectcalico/calico/tree/v3.31.0/calicoctl

## Issues Found
- `calicoctl apply -f ... --dry-run` was incorrect. The official `calicoctl apply` command does not support a `--dry-run` flag. Replaced those examples with `calicoctl validate -f ...`, which is the documented Calico command for offline resource validation.
- The prerequisites said Calico v3.26+, but `calicoctl validate` is available in Calico v3.31+ based on the official source tree. Updated the prerequisite to Calico v3.31+ so the examples match the stated version range.
- The recovery validation command used the deprecated Kubernetes API `/healthz` endpoint over plain HTTP. Replaced it with `/readyz` over HTTPS, which Kubernetes documentation recommends for readiness checks and which matches the Kubernetes service's default HTTPS endpoint.
- The recovery validation checklist labeled a command as pod-to-pod connectivity even though it checks a pod reaching the Kubernetes service. Updated the label to pod-to-service connectivity.

## Review Notes
Most Calico IPPool fields and IPAM commands were accurate. The example overflow IPPool is intentionally disabled, so it creates a pool definition without immediately assigning pod IPs from it. In future revisions, the post could mention that Calico installations may use `calico-system` or `kube-system` depending on installation method.
