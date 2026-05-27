# Validation Summary: How to Use Ansible to Delete Kubernetes Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible `kubernetes.core` collection
- Kubernetes API resources
- Kubernetes garbage collection and cascading deletion
- Kubernetes Pods, Deployments, Services, ConfigMaps, Secrets, Namespaces, Jobs, Ingresses, and HorizontalPodAutoscalers

## Sources Consulted
- Ansible `kubernetes.core.k8s` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible `kubernetes.core` collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/index.html
- Kubernetes garbage collection documentation: https://kubernetes.io/docs/concepts/architecture/garbage-collection/
- Kubernetes cascading deletion task documentation: https://kubernetes.io/docs/tasks/administer-cluster/use-cascading-deletion/
- Kubernetes Pod lifecycle and termination documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes automatic cleanup for finished Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/

## Issues Found
- The prerequisites listed Ansible 2.12+ and only the Python `kubernetes` library. Current `kubernetes.core` documentation lists Ansible Core 2.16+ support and Python dependencies including `kubernetes`, `PyYAML`, and `jsonpatch`, so the prerequisites and install command were updated.
- The bulk deletion by label examples used `label_selectors` with `state: absent` but did not set `delete_all: true`. The `kubernetes.core.k8s` module documents `delete_all: true` as the option for deleting all resources of a kind, optionally restricted by `label_selectors`, so `delete_all: true` was added to each label-based deletion task.
- The completed Jobs cleanup playbook comment said it removed Jobs older than a specified age, but the playbook does not calculate or filter by age. The comment was changed to say it removes completed Jobs.
- The teardown section said `ignore_errors: true` makes the playbook idempotent for resources that were already deleted or never existed. `state: absent` provides that idempotent behavior; `ignore_errors: true` only lets the play continue after a failed deletion. The explanation was corrected.

## Review Notes
Kubernetes also supports automatic cleanup of finished Jobs through `.spec.ttlSecondsAfterFinished`, which may be preferable for routine Job retention policies. The Ansible cleanup example is still valid as an explicit administrative cleanup pattern.
