# Validation Summary: How to Use Ansible to Manage Kubernetes Annotations and Labels

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- `kubernetes.core` Ansible collection
- Kubernetes labels and annotations
- Kubernetes Deployments, Services, ConfigMaps, Secrets, and Ingress resources
- ingress-nginx annotations

## Sources Consulted
- Ansible `kubernetes.core.k8s` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible `kubernetes.core.k8s_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- Ansible `kubernetes.core.k8s_json_patch` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_json_patch_module.html
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Annotations documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/
- Kubernetes Recommended Labels documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
- ingress-nginx annotation documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Kubernetes Ingress NGINX retirement announcement: https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/
- Kubernetes v1.36 release notes mentioning March 24, 2026 Ingress NGINX retirement: https://kubernetes.io/blog/2026/04/22/kubernetes-v1-36-release/

## Issues Found
- The prerequisites only installed `kubernetes`, but the current `kubernetes.core.k8s` documentation also lists `PyYAML` and `jsonpatch` as Python requirements, with Python 3.9+ required. Updated the prerequisites and install command accordingly.
- The `git rev-parse HEAD` pipe lookup fallback used Ansible's `default` filter, which does not make a failing shell command return `unknown`. Updated the command to handle non-Git directories with `2>/dev/null || echo unknown`.
- The ingress-nginx section described the community controller as a straightforward current example. Updated it to note that Kubernetes retired ingress-nginx on March 24, 2026 and recommends Gateway API or another maintained controller for new deployments.
- The ingress example used `nginx.ingress.kubernetes.io/websocket-services`, which is not listed in the current ingress-nginx annotation documentation. Removed that stale annotation.
- The removal section claimed patching but used `kubernetes.core.k8s` with `force: true` and a partial Deployment definition, which can replace an existing object rather than applying a focused label removal. Replaced it with `kubernetes.core.k8s_json_patch` and a JSON Patch `remove` operation.

## Review Notes
All YAML snippets parse successfully after the fixes. The examples assume the named Kubernetes resources already exist; otherwise, partial `kubernetes.core.k8s` definitions that only contain metadata would not be sufficient to create resources such as Deployments or Ingresses from scratch.
