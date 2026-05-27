# Validation Summary: How to Use Ansible to Manage Podman Pods

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- containers.podman Ansible collection
- Podman pods
- Podman containers
- Linux namespaces
- systemd user services
- PostgreSQL
- PgBouncer
- Prometheus Postgres exporter

## Sources Consulted
- Ansible `containers.podman.podman_pod` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_pod_module.html
- Ansible `containers.podman.podman_container` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_container_module.html
- Ansible `containers.podman.podman_pod_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_pod_info_module.html
- Ansible `containers.podman.podman_container_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_container_info_module.html
- Ansible `containers.podman.podman_generate_systemd` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_generate_systemd_module.html
- Ansible `ansible.builtin.systemd` module documentation: https://docs.ansible.com/projects/ansible/7/collections/ansible/builtin/systemd_module.html
- Podman `podman-pod-create` documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman `podman-run` documentation: https://docs.podman.io/en/stable/markdown/podman-run.1.html

## Issues Found
- The post described the Podman infra container as usually `k8s.gcr.io/pause`. Current Podman documentation says that, unless an infra image is specified, Podman builds a custom local pause image. I changed the wording to describe it generically as a lightweight pause container.

## Review Notes
- The Ansible examples use valid module names and parameters for the current `containers.podman` collection, including `podman_pod` states, pod-level `ports`, container `pod`, container health check settings, pod/container info modules, and `podman_generate_systemd`.
- Podman documents that pod port publishing must be done on the pod, not individual containers, and cannot be modified after the pod is created. The post's examples follow that model.
- For rootless user systemd services, Ansible's `systemd` module requires access to the user's systemd/dbus session, normally through `XDG_RUNTIME_DIR`. The post's systemd example is technically correct, but real deployments may need environment setup depending on how Ansible connects to the host.
