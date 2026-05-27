# Validation Summary: How to Use Ansible with ArgoCD for GitOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- kubernetes.core Ansible collection
- community.general Ansible collection
- Argo CD
- Kubernetes
- GitOps
- Argo CD CLI

## Sources Consulted
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible kubernetes.core.k8s_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible ansible.builtin.hostname module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible ansible.builtin.cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD declarative setup and AppProject documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD app sync command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD app wait command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_wait/
- Argo CD FAQ for initial admin password: https://argo-cd.readthedocs.io/en/latest/faq/

## Issues Found
- The Argo CD Deployment readiness lookup omitted `api_version: apps/v1`. The current `kubernetes.core.k8s_info` module defaults to `v1`, while Kubernetes Deployments are in `apps/v1`; added the explicit API version.
- The infrastructure workflow used `ansible.builtin.timezone`, but the current documented FQCN is `community.general.timezone`; updated the module name.
- Several generic Common Use Cases comments referred to "this module" even though the post is not about a single Ansible module; updated those comments to refer to Ansible automation/tasks/patterns.
- The fallback command in the error handling example would stop the play before the final reporting and explicit failure task if the fallback command failed; added `failed_when: false`.
- The cron automation example copied a script into `/opt/scripts` without ensuring the directory existed; added an `ansible.builtin.file` task to create the directory first.

## Review Notes
The Argo CD Application and AppProject manifests, automated sync settings, `CreateNamespace=true` sync option, installation manifest URL pattern, initial admin secret reference, and `argocd app sync` / `argocd app wait` flags are consistent with current official documentation. YAML snippets were parsed locally after edits; `ansible-playbook` was not installed in this environment, so a full Ansible syntax check was not run.
