# Validation Summary: How to Diagnose Calico Pod CIDR Conflicts

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico IP pools and IPAM
- Kubernetes networking
- kubeadm cluster networking configuration
- kubectl and calicoctl CLI commands
- Linux routing diagnostics

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IP address management overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico multiple IP pools documentation: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes kubeadm v1beta4 networking configuration reference: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes JSONPath support for kubectl: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes node status reference: https://kubernetes.io/docs/reference/node/node-status

## Issues Found
- The post described `calicoctl ipam check` as reporting CIDR conflicts or unreachable addresses. Calico documents this command as checking IPAM data structure integrity against Kubernetes and showing leaked or improperly allocated IPs. Updated the symptom, Step 5 explanation, and conclusion to avoid overstating what the command detects.
- The diagnosis flow checked only Kubernetes node InternalIP values while the root cause describes overlap with node host subnets. Added a Calico node address/subnet check and updated the overlap instructions and flowchart to compare both node IPs and node subnets.
- The post used `calicoctl get ippool -o jsonpath=...`, but the calicoctl get reference lists output formats such as yaml, json, wide, custom-columns, and go-template, not jsonpath. Replaced this with `kubectl get ippools -o jsonpath=...`, which matches Kubernetes JSONPath support and Calico documentation showing `kubectl get ippools`.

## Review Notes
The remaining commands are environment-dependent but technically valid for common kubeadm and Calico deployments. The kubeadm ConfigMap check applies only to kubeadm-created clusters, which the post already implies by naming `kubeadm-config`.
