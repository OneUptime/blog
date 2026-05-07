# Validation Summary: How to Use Podman with Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Podman
- `containers.podman` Ansible collection
- `ansible.posix` Ansible collection
- systemd
- Quadlet
- PostgreSQL
- Redis
- Prometheus `node_exporter`

## Sources Consulted
- Ansible `containers.podman` collection index: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/index.html
- Ansible `containers.podman.podman_container` module docs: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_container_module.html
- Ansible `containers.podman.podman_image` module docs: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_image_module.html
- Ansible `containers.podman.podman_tag` module docs: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_tag_module.html
- Ansible `containers.podman.podman_pod` module docs: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_pod_module.html
- Ansible `containers.podman.podman_prune` module docs: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_prune_module.html
- Ansible `containers.podman.podman_generate_systemd` module docs: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_generate_systemd_module.html
- Ansible `ansible.posix.synchronize` module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/synchronize_module.html
- Podman `podman generate systemd` docs: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Podman Quadlet / `podman-systemd.unit` docs: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman restart-policy docs: https://docs.podman.io/en/v4.6.1/markdown/options/restart.html
- Prometheus `node_exporter` README: https://github.com/prometheus/node_exporter/blob/master/README.md?plain=1

## Issues Found
- The build example used `ansible.builtin.synchronize`, but `synchronize` is provided by the `ansible.posix` collection. I changed it to `ansible.posix.synchronize` and added the required collection install note.
- The build example did not mention that `ansible.posix.synchronize` requires `rsync` on both the control node and the target host. I added that requirement so the example is runnable as written.
- The pod example published `9090:9090` for `prom/node-exporter`, but `node_exporter` listens on port `9100` by default. I corrected the published port to `9100:9100`.
- The rolling deployment cleanup task used `containers.podman.podman_image` with `name: "{{ app_image }}"` and `state: absent`, which does not accurately implement removal of older unused images. I replaced it with `containers.podman.podman_prune` configured to prune unused images, which matches the task intent.
- The systemd note said the deprecated `podman generate systemd` workflow may be removed in a future Podman release. Current Podman documentation says there are no plans to remove the command, but Quadlet is recommended for new deployments. I updated the note to reflect that.
- The systemd example combined `generate_systemd.new: true` with a container-level `restart_policy`, omitted `rm: true`, and used the older `time` alias. I removed the container restart policy, added `rm: true` for the `new: true` flow, and changed `time` to `stop_timeout` to match current Ansible/Podman guidance.

## Review Notes
- The post is technically valid after the fixes above.
- The systemd section still demonstrates the older generated-unit workflow for compatibility, but new Podman deployments should prefer Quadlet.
- Podman documents that user-scoped units in `~/.config/systemd/user/` start on user login, and `loginctl enable-linger` is needed if they must keep running without an active login session.
- `node_exporter` is primarily intended for host metrics; if the goal is host-level monitoring from a container, additional mounts and flags may be needed beyond the simplified example shown here.
