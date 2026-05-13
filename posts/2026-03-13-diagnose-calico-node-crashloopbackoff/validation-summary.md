# Validation Summary: How to Diagnose Calico Node CrashLoopBackOff

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- Kubernetes CNI
- kubectl
- Linux kernel networking modules
- Kubernetes RBAC

## Sources Consulted
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/
- Kubernetes deprecated API migration guide for Events: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico component logs: https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs
- Calico system requirements: https://docs.tigera.io/calico/latest/getting-started/bare-metal/requirements
- Calico hard-way calico/node RBAC and DaemonSet reference: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico IPAM documentation: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses

## Issues Found
- The introduction said new pods "cannot be scheduled" when calico-node is crashing. In Kubernetes, scheduling can still happen; the common failure is pod sandbox creation or CNI setup on the node. Updated the wording to reflect that.
- The introduction implied BGP route churn in all Calico installations. Calico may use other dataplanes or encapsulation modes, so the statement was narrowed to BGP-based clusters.
- The symptom example used `NetworkPlugin calico not installed`, which is less representative of current kubelet messages. Updated it to `NetworkPluginNotReady`, `cni plugin not initialized`, or similar.
- The examples assumed Calico always runs in `kube-system`. Current Calico operator documentation commonly uses `calico-system`, while some manifest or hard-way installs still use `kube-system`. Added a `CALICO_NS` variable with a note to adjust it for manifest-based installs.
- The previous-container log and describe commands used unquoted shell variables. Quoted them to avoid shell parsing issues.
- The RBAC checks impersonated `kube-system:calico-node` unconditionally and checked pod listing only in the current namespace. Updated them to use `CALICO_NS` and `--all-namespaces` for the cluster-scoped pod list check.
- The events command sorted by `.lastTimestamp`, which is deprecated in the newer Kubernetes Events API. Updated it to sort by `.metadata.creationTimestamp`, matching Kubernetes quick reference guidance.
- The kernel module check implied that all required kernel features must appear in `lsmod`. Calico documentation notes kernel dependency names vary, and features may be built into the kernel. Added a caveat.

## Review Notes
The post is technically relevant and the diagnostic workflow is valid. CNI plugin logs may also need to be checked on the host under `/var/log/calico/cni/` for deeper CNI failures, but the existing post intentionally focuses on calico-node CrashLoopBackOff triage.
