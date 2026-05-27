# Validation Summary: How to Use Ansible to Deploy Kubernetes Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- kubernetes.core Ansible collection
- Kubernetes Deployments
- Kubernetes rolling updates and rollbacks
- Kubernetes Services, Ingress, HorizontalPodAutoscaler, and PodDisruptionBudget
- kubectl rollout commands

## Sources Consulted
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible kubernetes.core.k8s_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- Ansible kubernetes.core.k8s_scale module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_scale_module.html
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes pod topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes HorizontalPodAutoscaler documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes kubectl rollout history reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_history/
- Kubernetes kubectl rollout undo reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/

## Issues Found
- Several `kubernetes.core.k8s_info` and `kubernetes.core.k8s_scale` examples identified a Deployment only with `kind: Deployment`. The Ansible modules document `api_version` as defaulting to `v1`, while Kubernetes Deployments are `apps/v1`. Added `api_version: apps/v1` to those Deployment lookup and scaling tasks so the examples are explicit and portable.
- The explanation for `strategy.rollingUpdate.maxUnavailable: 0` said it ensures no downtime by keeping all old pods running until new ones are ready. Kubernetes guarantees availability relative to the desired replica count, not absolute end-to-end application availability, and it may scale old pods down incrementally as new pods become available. Reworded the claim to say it helps avoid downtime by preventing available pods from dropping below the desired replica count.

## Review Notes
- The Kubernetes manifests use current stable API versions for Deployments (`apps/v1`), Ingress (`networking.k8s.io/v1`), HorizontalPodAutoscaler (`autoscaling/v2`), and PodDisruptionBudget (`policy/v1`).
- The rollback section uses `kubectl` commands inside Ansible rather than the `kubernetes.core.k8s_rollback` module. The commands are valid, but a future revision could use the Ansible module for a more consistently Ansible-native workflow.
- `kubectl` was not installed in the local workspace, so command flags were verified against the official Kubernetes generated command reference.
