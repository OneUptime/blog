# Validation Summary: How to Use Ansible to Generate Kubernetes YAML from Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Podman
- Kubernetes manifests
- YAML
- Jinja2 templates
- Python PyYAML

## Sources Consulted
- Podman `podman kube generate` official documentation: https://docs.podman.io/en/latest/markdown/podman-kube-generate.1.html
- Podman `podman kube play` official documentation: https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html
- Ansible `containers.podman.podman_pod` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_pod_module.html
- Ansible `containers.podman.podman_container` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_container_module.html
- Ansible `containers.podman.podman_volume` module documentation: https://docs.ansible.com/projects/ansible/devel/collections/containers/podman/podman_volume_module.html
- Ansible `from_yaml_all` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/from_yaml_all_filter.html
- Kubernetes volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/

## Issues Found
- Updated `podman generate kube` examples and text to the current documented `podman kube generate` command form.
- Updated `podman play kube` examples and text to the current documented `podman kube play` command form.
- Added the missing output directory creation task to the multi-container playbook so the later `copy` task can write `fullapp-pod.yaml`.
- Updated the Deployment wrapper template to preserve generated Pod volumes when copying container `volumeMounts`; without the matching `spec.volumes` entries, generated Deployments with mounted volumes would be invalid.
- Updated the Python YAML validation command to consume the `yaml.safe_load_all` generator with `list(...)`, ensuring multi-document YAML parsing is actually performed.

## Review Notes
The examples assume the `containers.podman` Ansible collection and Podman are installed on the managed hosts. The local review environment did not have `podman` or `ansible-doc` installed, so command and module behavior was verified against official documentation instead of local CLI help.
