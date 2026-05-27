# Validation Summary: How to Use Ansible to Deploy Applications to Multiple Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy collections
- kubernetes.core Ansible collection
- Kubernetes Deployments
- Kubernetes ConfigMaps
- Kubernetes Namespaces
- kubeconfig contexts
- Ansible inventory groups

## Sources Consulted
- Ansible Community Documentation: kubernetes.core collection index, supported ansible-core versions: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/
- Ansible Community Documentation: kubernetes.core.k8s module parameters and requirements: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible Community Documentation: kubernetes.core.k8s_info module: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- Ansible Community Documentation: Introduction to Ansible for Kubernetes, kubeconfig and context usage: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/docsite/kubernetes_scenarios/k8s_intro.html
- Ansible Community Documentation: inventory INI host variables and groups: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible Community Documentation: playbook execution strategies and serial behavior: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- Kubernetes Documentation: Deployments, selectors, replicas, and rollout behavior: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The prerequisites listed Ansible 2.12+ and only the Python `kubernetes` library. Current `kubernetes.core` documentation lists ansible-core 2.16+ support and the `k8s` module requirements include Python 3.9+, `kubernetes>=24.2.0`, PyYAML, and jsonpatch. I updated the prerequisite text and install command accordingly.
- The rolling deployment example used `serial: 1` in a `localhost` play and then had separate loops for deploying and checking readiness. `serial` controls inventory host batching, not loop item batching, so the example would deploy to every cluster before running the readiness checks. I changed the task to use the `kubernetes.core.k8s` module's documented `wait`, `wait_sleep`, and `wait_timeout` options so each loop item waits for its Deployment rollout before the next cluster is processed.

## Review Notes
The remaining examples use documented `kubernetes.core.k8s` and `kubernetes.core.k8s_info` parameters such as `context`, `kubeconfig`, `definition`, `state`, `kind`, `name`, and `namespace`. Kubernetes Deployment manifests include the required `apps/v1` selector and matching pod template labels.
