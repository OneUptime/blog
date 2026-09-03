# Validation Summary: How to Fix Anonymous Kubelet Access Detected by kube-hunter

## Status
validated

## Post Type
Technical remediation guide

## Technologies Covered
- Kubernetes
- kubelet authentication and authorization
- `KubeletConfiguration` (`kubelet.config.k8s.io/v1beta1`)
- TokenReview and SubjectAccessReview webhooks
- Kubernetes RBAC and node subresources
- kube-hunter
- curl
- kubectl
- kubeadm certificates

## Sources Consulted
- [Kubernetes kubelet authentication and authorization](https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/)
- [Kubernetes KubeletConfiguration API (v1beta1)](https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/)
- [Set kubelet parameters via a configuration file](https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/)
- [Kubernetes ports and protocols](https://kubernetes.io/docs/reference/networking/ports-and-protocols/)
- [kubectl auth can-i reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [kubeadm certificate management and kubelet serving certificates](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/)
- [kube-hunter kubelet discovery source](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/kubelet.py)
- [kube-hunter kubelet hunting source](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/hunting/kubelet.py)
- [kube-hunter usage documentation](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)

## Issues Found
No technical issues found.

## Review Notes
- The credential-free `401`/`403` distinction matches both Kubernetes documentation and kube-hunter's current discovery logic: `401` indicates anonymous authentication is disabled, while `403` indicates the anonymous request was authenticated as `system:anonymous` and then denied by authorization.
- The `KubeletConfiguration` fields and values are valid. The client CA path is correctly presented as an example that must be adapted to the distribution.
- Fine-grained kubelet authorization for endpoints such as `/pods` is version-dependent. The post appropriately tells readers to use subresources supported by their Kubernetes version rather than asserting universal support.
- kube-hunter's default (non-`--active`) scan does not perform its state-changing active-hunting tests. Pinning the scanner version, as the post recommends, remains important because behavior can change between releases.
