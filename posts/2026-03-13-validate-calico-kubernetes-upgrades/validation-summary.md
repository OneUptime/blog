# Validation Summary: How to Validate Calico on Kubernetes Upgrades

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- Tigera Operator
- kubectl
- calicoctl
- Bash
- Kubernetes networking and DNS
- Calico IPAM

## Sources Consulted
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico TigeraStatus reference: https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- Calico IP pool documentation: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl ipam check reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Calico calicoctl ipam release reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/

## Issues Found
- The description and introduction said the validation covered policy enforcement, but the script does not create or test Kubernetes or Calico network policies. Changed those references to DNS resolution to match the actual script.
- The script used `calicoctl get ippools --no-headers`, but the official `calicoctl get` reference does not document a `--no-headers` flag. Changed the check to `kubectl get ippools --no-headers`, which aligns with Calico documentation showing `kubectl get ippools`.
- The IPAM remediation example used `calicoctl ipam release <problem-ip>`, but the official command requires `--ip=<IP>` or `--from-report=<REPORT>`. Changed it to `calicoctl ipam release --ip=<problem-ip>`.

## Review Notes
The script assumes an operator-managed Calico installation with resources in `calico-system` and an `Installation` resource named `default`. Manifest-based or heavily customized Calico installations may need namespace, label, and component-name adjustments.
