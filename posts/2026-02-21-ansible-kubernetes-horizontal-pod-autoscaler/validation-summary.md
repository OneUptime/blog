# Validation Summary: How to Use Ansible to Manage Kubernetes Horizontal Pod Autoscaler

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- kubernetes.core Ansible collection
- Kubernetes HorizontalPodAutoscaler
- Kubernetes autoscaling/v2 API
- metrics-server
- Prometheus Adapter / custom metrics

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough
- Ansible kubernetes.core collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible kubernetes.core.k8s_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html

## Issues Found
- The prerequisites listed Ansible 2.12+ and an unconstrained `pip install kubernetes`, but the current documented `kubernetes.core` collection supports ansible-core 2.16+ and its modules require Python 3.9+ with Kubernetes Python client 24.2.0+. Updated the prerequisites and install command accordingly.
- The prerequisites and metrics-server wording implied metrics-server covered all HPA metrics, including custom metrics. Updated the text to clarify that metrics-server provides CPU and memory resource metrics, while custom metrics require a metrics adapter such as Prometheus Adapter.
- The metrics-server readiness assertion accessed `readyReplicas` directly. Because that Deployment status field can be absent before readiness, updated the assertion to default to 0 before comparing.
- The HPA status debug expression only extracted resource metrics, which would not represent Object or other custom metrics correctly. Updated it to display the full `currentMetrics` list.

## Review Notes
The HPA manifests use the current stable `autoscaling/v2` API and the documented fields for Resource metrics, Object custom metrics, multiple metrics, and scaling behavior. The examples still assume the referenced Deployments, Services, metrics-server, and custom metrics adapter already exist and are correctly configured in the target cluster.
