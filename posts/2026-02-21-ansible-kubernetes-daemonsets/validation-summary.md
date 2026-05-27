# Validation Summary: How to Use Ansible to Manage Kubernetes DaemonSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- kubernetes.core Ansible collection
- Kubernetes DaemonSets
- Kubernetes node selectors, tolerations, service accounts, and update strategies
- Fluent Bit
- Prometheus Node Exporter
- NVIDIA DCGM Exporter

## Sources Consulted
- Kubernetes DaemonSet concepts: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes DaemonSet apps/v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/daemon-set-v1/
- Kubernetes node selection documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes service account documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Prometheus Node Exporter documentation: https://github.com/prometheus/node_exporter
- Fluent Bit parser documentation: https://docs.fluentbit.io/manual/3.2/pipeline/parsers/configuring-parser
- NVIDIA DCGM Exporter documentation: https://docs.nvidia.com/datacenter/dcgm/latest/gpu-telemetry/dcgm-exporter.html

## Issues Found
- The prerequisites listed only Ansible 2.12+ and `pip install kubernetes`. The current `kubernetes.core` documentation also specifies Python and Kubernetes Python client version requirements, so the prerequisites and install command were updated to include Python 3.9+ and Kubernetes Python client 24.2.0+.
- The Fluent Bit DaemonSet specified `serviceAccountName: fluent-bit` but the playbook did not create that ServiceAccount. Added a ServiceAccount task so the complete playbook can create pods successfully.
- The Node Exporter playbook created resources in the `monitoring` namespace without creating that namespace. Added a namespace variable and namespace creation task.
- The GPU monitor playbook also used the `monitoring` namespace without creating it. Added a namespace variable and namespace creation task.
- The GPU monitor example used `nvidia.com/gpu: 0` as a resource limit. That is not a useful or accurate way to request GPU access in Kubernetes examples, and NVIDIA documentation shows GPU resources requested as positive integer limits when a workload consumes GPUs. Replaced it with CPU and memory resource settings, and added a caveat that the GPU nodes still need NVIDIA runtime and device plugin or GPU Operator setup.
- The update-strategy example omitted the required DaemonSet selector and dropped fields needed by the earlier Fluent Bit pod template, including the service account and ConfigMap mount. Added the selector and restored the relevant pod template fields so the example remains a valid DaemonSet update.

## Review Notes
- All YAML code blocks were parsed successfully after the edits.
- The Fluent Bit example still uses the Docker parser, which is valid for Docker JSON logs. For clusters using containerd or CRI-O, a CRI parser would be more appropriate.
