# Validation Summary: How to Use the Ansible k8s Module to Create Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- kubernetes.core.k8s module
- Kubernetes resources and manifests
- YAML
- Jinja2 templates
- Kubernetes Service, RBAC, Ingress, PersistentVolumeClaim, Deployment, Job, ConfigMap, and Secret APIs

## Sources Consulted
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible Kubernetes object scenario documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/docsite/kubernetes_scenarios/scenario_k8s_object.html
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Job API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/

## Issues Found
- The post said `state: present` updates an existing resource to match the full definition. The official module documentation describes existing objects as being patched when attributes differ, so the wording was changed to say the module patches the object with the attributes in the definition.
- The Mermaid flowchart labeled the unchanged path as "Skipped" and ended at "Resource Ready". An unchanged Ansible task is not necessarily skipped, and the k8s module does not wait for readiness by default, so the labels were changed to "No Change" and "Task Complete".
- The `wait` section said the parameter ensures the resource is running. The official module documentation says waiting is implemented only for certain resource kinds by default and can use explicit conditions, so the wording was narrowed to supported resources and the Deployment `Available` condition.
- The `force` section said `force: true` deletes and recreates resources. The official module documentation says it replaces an existing object when `state: present`, so the wording was changed from delete/recreate to replace.
- The summary repeated the overly broad readiness and force wording. It was updated to match the documented `wait` and `force` behavior.

## Review Notes
The Kubernetes manifests use current stable API versions and valid resource shapes. The NodePort example uses port 30080, which is within Kubernetes' default NodePort range of 30000-32767. The AWS LoadBalancer annotation shown is provider-specific and plausible, but production usage may vary by AWS Load Balancer Controller or cloud provider version.
