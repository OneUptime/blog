# Validation Summary: How to Upgrade Calico on Windows Nodes with the Operator Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Tigera Operator
- Kubernetes
- Windows nodes
- Kubernetes DaemonSets
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Upgrade Calico on Kubernetes: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico documentation: Install Calico for Windows using the Operator: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Calico documentation: Windows requirements and limitations: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico v3.27.0 Tigera Operator manifest: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The Tigera Operator upgrade command used plain `kubectl apply`. Updated it to use server-side apply with `--force-conflicts`, matching current Calico operator upgrade guidance.
- The post advised directly patching the operator-managed `calico-node-windows` DaemonSet with `kubectl set image`. Replaced this with image verification plus `tigerastatus` and operator log checks, because the Tigera Operator manages the Windows DaemonSet and direct changes may be overwritten.
- The tag list used `Window` instead of `Windows`. Corrected the tag to match the technology name.

## Review Notes
The post uses Calico v3.27.0 as its example target version. That version-specific example is plausible, but readers should substitute the intended Calico release and check that release's notes before upgrading a real cluster.
