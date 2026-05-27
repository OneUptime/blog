# Validation Summary: How to Use Ansible to Perform Rolling Updates in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible `kubernetes.core` collection
- Kubernetes Deployments
- Kubernetes rolling updates
- Kubernetes readiness, liveness, and startup probes
- Kubernetes canary deployments

## Sources Consulted
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes Deployments concept documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes rolling update task documentation: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Ansible `kubernetes.core` collection index: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/index.html
- Ansible `kubernetes.core.k8s` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible `kubernetes.core.k8s_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- Ansible `ansible.builtin.pause` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/pause_module.html
- Ansible `ansible.builtin.failed` test documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/failed_test.html
- Ansible `ansible.builtin.include_tasks` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html

## Issues Found
- The prerequisite version said Ansible 2.12+. The current `kubernetes.core` collection documentation lists support for ansible-core 2.16.0 or newer, so the prerequisite was updated.
- The prerequisite command installed only the Kubernetes Python client. The current `kubernetes.core.k8s` module requirements also list `PyYAML` and `jsonpatch`, so the command was updated to install all required Python packages.
- The percentage example said 25% means 2-3 pods for 10 replicas. Kubernetes rounds `maxUnavailable` percentages down and `maxSurge` percentages up, so the text now states the exact result: 2 unavailable pods and 3 surge pods.
- The heading "Rolling Update with Readiness Gates" used Kubernetes terminology incorrectly. The section configures readiness probes, not Pod readiness gates, so the heading was corrected.
- The `terminationGracePeriodSeconds` note implied Kubernetes alone guarantees in-flight request completion. The text now clarifies that the application must handle termination gracefully.
- The canary approval task combined `minutes` with a prompt telling the operator to press Enter. Ansible does not support prompting for input during a timed pause, so the timed pause was changed to a manual approval prompt.

## Review Notes
The examples are written for existing Deployments and rely on `kubernetes.core.k8s` strategic merge behavior when applying partial Deployment definitions. That is technically valid for updating existing built-in Kubernetes resources, but a future improvement could explicitly mention that full Deployment manifests are required when creating resources from scratch.
