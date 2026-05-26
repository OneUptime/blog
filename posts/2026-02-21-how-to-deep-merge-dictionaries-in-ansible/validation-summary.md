# Validation Summary: How to Deep Merge Dictionaries in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible `ansible.builtin.combine` filter
- YAML playbooks
- Kubernetes Deployment manifests

## Sources Consulted
- Ansible `ansible.builtin.combine` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/combine_filter.html
- Ansible playbook filters guide, combining hashes/dictionaries: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The post described `append_rp` and `prepend_rp` as general duplicate-removal strategies with "keep last occurrence" and "keep first occurrence" behavior. Ansible documents these modes as appending or prepending newer entries while removing matching entries from the older list. Updated the option descriptions and example task label.
- The Kubernetes Deployment example omitted `spec.template.metadata.labels`. In `apps/v1`, `.spec.selector` must match `.spec.template.metadata.labels`, so the generated manifest would be rejected by the Kubernetes API. Added matching Pod template labels.
- The description mentioned "custom merge strategies," but the article covers built-in `list_merge` strategies rather than custom strategy implementation. Updated the description accordingly.

## Review Notes
- The Ansible `combine(..., recursive=true)` examples and default shallow merge behavior match the official filter documentation.
- The Kubernetes overlay example still uses the default list behavior, so the `containers` list is replaced rather than merged by container name. This is accurate for Ansible `combine`, but readers should be aware that list items are not key-merged automatically.
