# Validation Summary: How to Use Ansible k8s_info Module to Query Kubernetes Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- kubernetes.core collection
- kubernetes.core.k8s_info module
- kubernetes.core.k8s module
- Kubernetes label selectors
- Kubernetes field selectors
- Jinja2 / Ansible filters
- community.general.json_query / JMESPath

## Sources Consulted
- Ansible kubernetes.core.k8s_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible kubernetes.core collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/index.html
- Ansible community.general.json_query filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/json_query_filter.html
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The prerequisites listed Ansible 2.12+ and only the `kubernetes` Python package. Current `kubernetes.core` documentation lists supported ansible-core versions as 2.16.0 or newer, and the `k8s_info` module requires Python >= 3.9, `kubernetes >= 24.2.0`, and `PyYAML >= 3.11`. Updated the prerequisites and install commands accordingly.
- The post used the unqualified `json_query` filter without documenting its dependency. Current Ansible documentation places this filter in `community.general` and requires `jmespath`. Updated the prerequisites and examples to use `community.general.json_query`.
- The degraded deployment query ignored Deployments where `status.readyReplicas` is absent, which is common when zero replicas are ready. Updated the query to treat missing `readyReplicas` as 0 and missing `spec.replicas` as the Kubernetes default of 1.
- The "specific image registry" example did not actually filter by registry. Updated the example to select Deployments with container images starting with `registry.internal.example.com/` and display the resulting count.
- The field selector note omitted supported Pod fields used by the examples, especially `spec.serviceAccountName`. Updated the note to reflect Kubernetes' current documented field selector support for Pods.
- The cluster audit example task names claimed to find pods running as root and identify privileged containers, but the condition actually finds containers without a `securityContext`. Updated the task names to match the code.

## Review Notes
The examples are illustrative and assume that referenced namespaces, resource names, CRDs, labels, and registries exist in the target cluster. The Kubernetes and Ansible APIs used are current and non-deprecated as of the validation date.
