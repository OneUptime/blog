# Validation Summary: Diagnosing FailedCreatePodSandBox Errors in Calico

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- kubectl
- Container Network Interface (CNI)

## Sources Consulted
- Calico Troubleshooting and diagnostics documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico `calicoctl ipam` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico `calicoctl get` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico CNI plugin installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-cni-plugin
- Calico Helm installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Kubernetes `kubectl debug` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The diagnostic bundle command used `calicoctl node diag`, but official Calico documentation uses `calicoctl node diags`. Changed the command to `sudo calicoctl node diags`, matching Calico's documented command and privilege guidance.
- The post assumed `calico-system` for all Calico installs. Calico's operator-managed installs commonly use `calico-system`, while other install methods may use `kube-system`. Added a prerequisite and command comments telling readers to use the namespace that matches their installation.
- The advanced configuration section referred to a "basic manifest shown above", but the post contains diagnostics rather than a manifest. Changed that phrase to "basic diagnostics shown above".
- The labels section said "Labels on Calico resources" while the example labels Kubernetes nodes. Reworded the claim to describe labels and selectors generally, and Kubernetes node labels specifically.
- The debug pod command could fail on nodes where pod sandbox creation is already broken. Clarified that this connectivity test should be run from a debug pod that can be scheduled successfully.

## Review Notes
The remaining commands are valid diagnostic examples, but several are environment-dependent. In particular, `calicoctl node status` is most useful for BGP-based Calico networking, and `kubectl logs -l k8s-app=calico-node` depends on labels present in the Calico installation manifests.
