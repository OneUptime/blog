# Validation Summary: How to Validate Resolution of Calico Node CrashLoopBackOff

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl
- Calico
- calicoctl
- CNI
- BGP
- Alertmanager API access through Kubernetes service proxy

## Sources Consulted
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Assigning Pods to Nodes documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico Kubernetes requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico CNI plugin installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-cni-plugin
- CNI project documentation: https://github.com/containernetworking/cni

## Issues Found
- The pod placement examples used `spec.nodeName`, which bypasses Kubernetes scheduling. This conflicted with the post's claim that the test exercises the scheduler path. Changed the examples to use `nodeSelector` with `kubernetes.io/hostname` so Kubernetes still schedules the Pod onto the target node.
- The post described BGP verification as route advertisement verification and implied all Calico clusters use BGP. Changed the wording to verify BGP peer establishment and added a caveat that this applies when BGP is enabled.
- The expected `calicoctl node status` wording said peers should show `Established` generally. Calico's documented output shows `STATE` as `up` and `INFO` as `Established`, so the expected result now points specifically to `Established` in the INFO column.

## Review Notes
- The CNI paths `/etc/cni/net.d` and `/opt/cni/bin` match Calico and CNI documentation, including Calico's Kubernetes requirements.
- The Alertmanager service proxy example is plausible for Prometheus Operator deployments, but the namespace and service name can vary by installation.
