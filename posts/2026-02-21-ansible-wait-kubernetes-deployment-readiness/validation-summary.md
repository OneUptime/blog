# Validation Summary: How to Use Ansible to Wait for Kubernetes Deployment Readiness

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- kubernetes.core Ansible collection
- Kubernetes Deployments
- Kubernetes StatefulSets
- Kubernetes DaemonSets
- Kubernetes Pods and Jobs
- Kubernetes Services and EndpointSlices
- CI/CD deployment workflows

## Sources Consulted
- Ansible kubernetes.core.k8s_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible playbook loops and until documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes DaemonSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/daemon-set-v1/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes Job API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/
- Kubernetes Endpoints API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/endpoints-v1/
- Kubernetes EndpointSlice API reference: https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/

## Issues Found
- The rollback example had two `register` keys on the same wait task. YAML duplicate keys are unsafe, and the second `register` would override the first in parsers that accept it, leaving the `until` expressions pointed at the wrong variable. I changed the task to register `wait_result` once and updated the wait expressions to use that variable.
- The pod wait snippet comment said it waited for a pod to be in the Running phase, but the code correctly waited for terminal phases, `Succeeded` or `Failed`. I corrected the comment to match the code.
- The service readiness examples used the legacy `Endpoints` API. Kubernetes v1.33+ deprecates Endpoints and recommends `discovery.k8s.io/v1` EndpointSlices for complete service endpoint information. I updated both examples to query `EndpointSlice` resources by the `kubernetes.io/service-name` label and count ready endpoints.

## Review Notes
The examples are otherwise technically sound as polling patterns. In a production playbook, the waits could be made more defensive by adding `resources | length > 0` checks before every indexed access and by checking failed Job conditions explicitly to fail faster instead of waiting for the full retry window.
