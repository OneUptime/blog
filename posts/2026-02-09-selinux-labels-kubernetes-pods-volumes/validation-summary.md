# Validation Summary: How to Enforce SELinux Labels on Kubernetes Pods and Volumes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Pods, StatefulSets, PersistentVolumeClaims, and security contexts
- SELinux labels, MCS levels, and container SELinux types
- CSI volume mount behavior and SELinux relabeling
- Linux SELinux audit and policy tools

## Sources Consulted
- Kubernetes documentation: Configure a Security Context for a Pod or Container, including SELinux labels and efficient SELinux volume relabeling: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes API reference: Pod v1 `seLinuxOptions` and security context fields: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes API reference: CSIDriver `seLinuxMount`: https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/csi-driver-v1/
- Kubernetes blog: SELinux Volume Label Changes goes GA, covering `SELinuxMount` and `seLinuxChangePolicy`: https://kubernetes.io/blog/2026/04/22/breaking-changes-in-selinux-volume-labeling/
- Red Hat Enterprise Linux SELinux documentation, including SELinux contexts and MCS ranges: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/using_selinux/
- SELinux Project manual page for `audit2allow` and `audit2why`: https://www.man7.org/linux/man-pages/man1/audit2why.1.html

## Issues Found
- The post implied that Kubernetes directly sets SELinux labels on volumes. Updated the wording to explain that Kubernetes sets pod/container SELinux contexts and volume labeling is handled by the container runtime or by mount options when supported.
- The post stated that most modern CSI drivers automatically handle SELinux labeling. Replaced this with the documented requirement that mount-time labeling needs Kubernetes support, applicable access modes or feature gates, and a volume plugin or CSI driver that explicitly supports SELinux mount options.
- The PVC section said the CSI driver relabels the volume during mount. Corrected this to distinguish kubelet passing `-o context` for supported configurations from the default recursive relabeling path.
- The hostPath section stated that hostPath volumes require specific SELinux types and presented `spc_t` too broadly. Updated the text to clarify that hostPath volumes are not automatically relabeled and that `spc_t` is a super-privileged container type for trusted infrastructure pods.
- The StatefulSet example used MCS categories `c1100,c1200`, which exceed the common `c0.c1023` category range. Changed the example to `c110,c120`.
- The StatefulSet explanation implied that sharing the same SELinux level is generally desirable. Updated it to note that same-label access matters when replicas share a volume on the same node, and that compatible labels or recursive relabeling are needed in that case.

## Review Notes
The manifests use current Kubernetes API fields and valid YAML structure. Some examples are intentionally illustrative and still require cluster-specific policy, admission, storage driver, and SELinux configuration to run successfully.
