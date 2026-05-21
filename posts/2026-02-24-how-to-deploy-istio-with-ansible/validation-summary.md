# Validation Summary: How to Deploy Istio with Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- kubernetes.core Ansible collection
- Kubernetes
- Helm
- Istio
- Istio Gateway and VirtualService resources

## Sources Consulted
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible kubernetes.core.k8s_cluster_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_cluster_info_module.html
- Ansible kubernetes.core.helm module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/helm_module.html
- Ansible community.kubernetes deprecation notice: https://docs.ansible.com/ansible/5/collections/community/kubernetes/docsite/deprecation.html
- Istio Helm installation documentation: https://istio.io/latest/docs/setup/install/helm/
- Istio ingress gateway documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio gateway installation documentation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio 1.22.0 Helm chart archives from the official Istio chart repository: https://istio-release.storage.googleapis.com/charts

## Issues Found
- The post installed and recommended `community.kubernetes`, which is deprecated in favor of `kubernetes.core`. Removed the extra collection install and updated the explanatory text.
- The Python dependency command included `openshift` and `helm`. Current `kubernetes.core` Kubernetes modules require the Kubernetes Python client, PyYAML, and jsonpatch, while Helm is required as a CLI binary for the Helm module. Updated the pip command accordingly.
- The Helm examples used `wait_timeout`, which the current `kubernetes.core.helm` documentation marks as deprecated. Replaced it with `timeout`.
- The inventory defined `kubeconfig`, but the playbook did not pass it to the Kubernetes and Helm modules. Added `module_defaults` so the inventory variable is actually used.
- The post used `istioctl verify-install`, which is not present in the current official `istioctl` command reference. Replaced it with `istioctl analyze --all-namespaces`, the supported command for live Istio configuration analysis.

## Review Notes
The Gateway selector `istio: ingress` is correct for the post's `istio/gateway` Helm release name `istio-ingress`; the Istio gateway chart derives the default `istio` selector label from the release name with the leading `istio-` prefix removed. The post pins Istio 1.22.0, which is older than the current Istio release line; the examples were validated against the 1.22.0 chart behavior and current Ansible module documentation.
