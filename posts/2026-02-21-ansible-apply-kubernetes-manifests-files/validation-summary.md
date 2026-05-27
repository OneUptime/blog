# Validation Summary: How to Use Ansible to Apply Kubernetes Manifests from Files

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible-core
- kubernetes.core Ansible collection
- Kubernetes manifests
- YAML
- cert-manager

## Sources Consulted
- Ansible `kubernetes.core.k8s` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible Kubernetes.Core collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/index.html
- Ansible `ansible.builtin.find` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible `ansible.builtin.combine` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/combine_filter.html
- Ansible playbook search paths documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbook_pathing.html
- cert-manager v1.13 installation documentation: https://cert-manager.io/v1.13-docs/installation/
- cert-manager GitHub release asset URL checked: https://github.com/cert-manager/cert-manager/releases/download/v1.13.3/cert-manager.yaml

## Issues Found
- The post claimed the `kubernetes.core.k8s` module supports applying entire directories directly. The module documents `src` as a path to manifest files, so the wording was changed to explain that directories are handled by finding files and looping over them.
- The prerequisites listed Ansible 2.12+ and only `pip install kubernetes`. Current Kubernetes.Core documentation lists ansible-core 2.16+ support, and the `k8s` module requires additional Python packages such as `jsonpatch`; schema validation requires `kubernetes-validate`. The prerequisites and install command were updated.
- The `src` path description said paths are relative to the playbook. This was made more precise by recommending absolute paths or `{{ playbook_dir }}` for playbook-anchored paths.
- The variable override section said to combine `src` with lookup/template capabilities, but the example uses `definition`. The wording was corrected.
- The container image override example replaced the entire `containers` list with a minimal container object, which would discard existing fields such as ports and resources. The example now combines the image override into the existing first container.
- The dry-run example used an unsupported `dry_run: true` parameter for `kubernetes.core.k8s`. It was replaced with Ansible check mode, which the module officially supports, and the validation-only example was clarified.

## Review Notes
The cert-manager v1.13.3 manifest URL is still reachable, but it is not the latest cert-manager release. This is acceptable because the post uses it as an example pinned release URL rather than a latest-version recommendation.
