# Validation Summary: How to Use the kubernetes.core Collection in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- kubernetes.core Ansible collection
- Kubernetes
- Helm
- YAML
- Jinja2 templates

## Sources Consulted
- Ansible Community Documentation: kubernetes.core collection index, https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/
- Ansible Community Documentation: kubernetes.core.k8s module, https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible Community Documentation: kubernetes.core.k8s_cluster_info module, https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_cluster_info_module.html
- Ansible Community Documentation: kubernetes.core.k8s_info module, https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- Ansible Community Documentation: kubernetes.core.k8s_exec module, https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_exec_module.html
- Ansible Community Documentation: kubernetes.core.k8s_log module, https://docs.ansible.com/ansible/latest/collections/kubernetes/core/k8s_log_module.html
- Ansible Community Documentation: kubernetes.core.k8s_scale module, https://docs.ansible.com/projects/ansible/devel/collections/kubernetes/core/k8s_scale_module.html
- Ansible Community Documentation: kubernetes.core.helm module, https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/helm_module.html
- Ansible Community Documentation: kubernetes.core.k8s inventory plugin removal notice, https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_inventory.html

## Issues Found
- The post described the current collection as including inventory plugins and showed the `k8s` inventory plugin. The current kubernetes.core 6.x documentation says that inventory plugin was removed in version 6.0.0. I replaced the inventory-plugin references with the current filter plugin category and the `k8s_config_resource_name` filter.
- The installation section listed `openshift` as a required Python dependency and described it as adding strategic merge patch capabilities. Current module requirements list `kubernetes`, `PyYAML`, and `jsonpatch` for the `k8s` module, not `openshift`. I updated the install command and dependency explanation.
- The post said the `kubernetes` Python library is required for all modules. That is too broad because Helm modules use the Helm CLI. I narrowed the statement to Kubernetes resource modules and added the Helm CLI requirement.

## Review Notes
The remaining examples align with the current Ansible module documentation at the time of review. Some examples omit optional fields such as `api_version` where module defaults or discovery can apply; that is acceptable for a beginner guide, but future updates could make examples more explicit for readers working with multiple API groups.
