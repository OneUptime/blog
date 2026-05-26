# Validation Summary: How to Create an Ansible Inventory from Kubernetes Pods

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Kubernetes
- kubernetes.core Ansible collection
- Kubernetes Python client
- kubectl connection plugin
- Dynamic inventory scripts
- YAML
- Python

## Sources Consulted
- Ansible kubernetes.core.k8s inventory documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_inventory.html
- Ansible kubernetes.core.k8s_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- Ansible kubernetes.core.kubectl connection documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/kubectl_connection.html
- Ansible dynamic inventory development documentation: https://docs.ansible.com/ansible/latest/dev_guide/developing_inventory.html
- Ansible inventory documentation: https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The post recommended the `kubernetes.core.k8s` inventory plugin as the first method. This plugin has been removed in `kubernetes.core` 6.0.0, and the official documentation recommends using `kubernetes.core.k8s_info` with `ansible.builtin.add_host` instead. Replaced that section with a current `k8s_info` and `add_host` example.
- The custom Python inventory script claimed an empty namespace list meant all namespaces, but the code would call `list_namespaced_pod` with an empty namespace. Updated the script to call `list_pod_for_all_namespaces` when `K8S_NAMESPACES` is empty.
- The dynamic inventory script generated group names directly from namespaces and labels. Kubernetes label values commonly contain hyphens, dots, or slashes, which are not safe in Ansible group names. Added group-name sanitization and applied it to namespace, app, custom group, and stable app group names.
- The post used standard Ansible modules against containers without noting the target-container Python requirement. Added a caveat that modules such as `copy`, `template`, and `command` require Python in the target container, and that minimal images should use `raw` for simple commands or include the needed tooling.

## Review Notes
The remaining examples are technically valid as patterns, but using Ansible to mutate running pods should stay limited to operational tasks because changes are lost on pod replacement. The post already includes that caveat.
