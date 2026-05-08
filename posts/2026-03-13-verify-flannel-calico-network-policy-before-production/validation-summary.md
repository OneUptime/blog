# Validation Summary: How to Verify Flannel with Calico Network Policy Before Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes NetworkPolicy
- Calico
- Flannel
- Canal
- calicoctl

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes node debugging with kubectl documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Calico Canal installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/flannel/install-for-flannel
- Calico workload endpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Flannel Kubernetes documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/kubernetes.md
- Flannel backend documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md

## Issues Found
- The subnet allocation check described a Flannel subnet annotation but the command read `.spec.podCIDR`. Updated the explanation to refer to the PodCIDR used by Flannel's kube-subnet-manager.
- The NetworkPolicy enforcement test used ICMP ping. Kubernetes NetworkPolicy is defined for TCP, UDP, and SCTP traffic, so ICMP behavior is plugin-specific and not a reliable validation. Changed the target pod to run nginx and changed the policy test to use HTTP over TCP.
- The workload endpoint command assumed a `deploy/calicoctl` deployment exists in `kube-system`, which is not part of the standard Canal manifest. Changed the command to use `calicoctl` directly and noted that it must be run from an environment where `calicoctl` is installed and configured.

## Review Notes
- The `kubectl debug node` command is valid, and Kubernetes documents that the node filesystem is mounted at `/host`; however, `chroot /host` can depend on the image and cluster security profile.
- Canal manifests and labels can vary by installation method and version. The reviewed commands match the current Calico Canal manifest pattern with a `canal` DaemonSet labeled `k8s-app=canal`.
