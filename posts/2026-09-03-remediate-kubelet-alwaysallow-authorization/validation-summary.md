# Validation Summary: How to Remediate Kubelet `AlwaysAllow` Authorization Findings from kube-hunter

## Status
validated

## Post Type
Security remediation guide

## Technologies Covered
- Kubernetes kubelet authentication and authorization
- Kubernetes RBAC and SubjectAccessReview
- `KubeletConfiguration` (`kubelet.config.k8s.io/v1beta1`)
- `kubectl auth can-i` and user impersonation
- kube-hunter
- Network controls for the kubelet HTTPS port (`10250`)

## Sources Consulted
- [Kubernetes kubelet authentication and authorization](https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/)
- [Kubernetes authorization overview](https://kubernetes.io/docs/reference/access-authn-authz/authorization/)
- [Kubernetes KubeletConfiguration API (v1beta1)](https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/)
- [Kubernetes RBAC good practices](https://kubernetes.io/docs/concepts/security/rbac-good-practices/)
- [Kubernetes `kubectl auth can-i` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [kube-hunter kubelet hunter implementation](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/hunting/kubelet.py)
- [kube-hunter documentation, including active hunting behavior](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)

## Issues Found
No technical issues found.

## Review Notes
- The `KubeletFineGrainedAuthz` mappings are version-dependent: the feature was introduced in Kubernetes 1.32, enabled by default as beta in 1.33, and became stable in 1.36. The post correctly tells readers to use the permission list for their exact cluster release.
- `kubelet.config.k8s.io/v1beta1` remains the documented kubelet configuration API in the current Kubernetes reference. The post appropriately warns readers not to replace a complete kubelet configuration with the partial example.
- The `kubectl auth can-i` examples use supported `TYPE/NAME`, `--subresource`, and `--as` syntax. Their results still depend on the caller having impersonation permission, as the post notes.
- kube-hunter's active mode can perform state-changing container operations and retrieve service-account tokens and environment variables. The production safety warning is supported by the project's documentation and current kubelet hunter implementation.
