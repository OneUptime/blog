# Validation Summary: How to Use Ansible with Kustomize for Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Kustomize
- Kubernetes
- kubectl
- YAML
- Kubernetes Ansible collection
- community.general Ansible collection

## Sources Consulted
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl kustomize reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kustomize Kustomization API source: https://github.com/kubernetes-sigs/kustomize/blob/master/api/types/kustomization.go
- Kustomize label field source: https://github.com/kubernetes-sigs/kustomize/blob/master/api/types/labels.go
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible ansible.builtin.lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/timezone_module.html

## Issues Found
- The base Kustomize example used `commonLabels`, which current Kustomize marks as deprecated. Changed it to the `labels` field with `includeSelectors: true` to preserve the selector behavior of `commonLabels`.
- The production overlay used `bases`, which current Kustomize marks as deprecated. Changed it to `resources`.
- The production overlay listed `patches/hpa.yaml` under `patches`, but an HPA manifest is an additional resource unless it patches an existing HPA. Moved `hpa.yaml` to the production overlay root in the layout and listed it under `resources`.
- The infrastructure provisioning example used `ansible.builtin.timezone`, but the current documented FQCN is `community.general.timezone`. Updated the task to use `community.general.timezone`.

## Review Notes
The YAML examples parse successfully. Local execution with `kubectl`, `kustomize`, or `ansible-playbook` was not possible because those commands are not installed in the review environment. The deployment playbook assumes `app_version` is supplied by inventory, extra vars, or another variable source, and the target namespace exists before applying namespaced resources.
