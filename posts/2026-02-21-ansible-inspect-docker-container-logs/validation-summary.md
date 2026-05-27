# Validation Summary: How to Use Ansible to Inspect Docker Container Logs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Docker Engine
- Docker CLI
- Docker logging drivers
- YAML

## Sources Consulted
- Docker Docs: docker container logs CLI reference - https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Docs: View container logs - https://docs.docker.com/engine/logging/
- Docker Docs: JSON File logging driver - https://docs.docker.com/engine/logging/drivers/json-file/
- Ansible Documentation: ansible.builtin.command module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible Documentation: community.docker.docker_container module - https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html

## Issues Found
- The basic retrieval section claimed it used `docker_container_info`, but the example did not use that module. Changed the wording to accurately describe using `ansible.builtin.shell`.
- Several examples registered only `stdout` from `docker logs`, which can miss container stderr output. Updated log collection examples to use `ansible.builtin.shell` with `2>&1` where the intent is combined log output.
- The polling example used shell features (`2>&1 | wc -l`) with `ansible.builtin.command`, which Ansible documents as not processing shell metacharacters. It also referenced an undefined `current_count` variable and built a negative `--tail` value, which Docker treats as invalid. Replaced it with a polling task that checks recent logs using `--since`.
- The stdout/stderr section said it retrieved only stderr, but the command shown retrieved both streams. Updated it to use shell redirection so only stderr remains in the registered result.
- The Docker logging explanation implied JSON file storage for all configurations. Clarified that JSON files under `/var/lib/docker/containers/` apply to the default `json-file` logging driver and generalized the diagram to logging driver storage.
- The summary still referred to the `command` module after the examples were corrected to use `shell` for merged stdout/stderr. Updated the summary wording.

## Review Notes
The examples are syntactically valid YAML. The Docker `json-file` log rotation options shown (`max-size`, `max-file`, and `compress`) are supported, and the Ansible `community.docker.docker_container` example correctly specifies `log_driver`, which is required for `log_options` to take effect.
