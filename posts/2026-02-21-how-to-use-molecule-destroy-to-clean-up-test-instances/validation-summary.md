# Validation Summary: How to Use Molecule destroy to Clean Up Test Instances

## Status
validated

## Post Type
Tutorial / DevOps guide

## Technologies Covered
- Ansible Molecule
- Molecule Docker, Vagrant, and cloud drivers
- Docker CLI and Docker labels
- Ansible playbooks and collections
- GitHub Actions
- GitLab CI
- Vagrant

## Sources Consulted
- Ansible Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule workflow reference: https://docs.ansible.com/projects/molecule/workflow/
- Ansible Molecule configuration reference: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule Docker example: https://docs.ansible.com/projects/molecule/examples/docker/
- ansible-community/molecule-plugins repository: https://github.com/ansible-community/molecule-plugins
- community.docker.docker_container module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Docker object labels documentation: https://docs.docker.com/engine/manage-resources/labels/
- Vagrant global-status command documentation: https://developer.hashicorp.com/vagrant/docs/cli/global-status
- Vagrant destroy command documentation: https://developer.hashicorp.com/vagrant/docs/cli/destroy
- Local Molecule 26.4.0 CLI help output for `molecule test`, `molecule destroy`, and `molecule reset`

## Issues Found
- The post said Molecule reads and removes state from a `.molecule/` directory. Current Molecule documentation describes the ephemeral directory as usually `~/.cache/molecule/<project>/<scenario>/`, so the post now refers to that location and says destroy resets scenario state there.
- The `molecule test --destroy=always` example said it destroys only at the end. Current Molecule's test sequence includes destroy before create and at the end, and `--destroy=always` is the default strategy. The example and explanation were corrected.
- The `--destroy=never` explanation implied only final cleanup was skipped. Current Molecule skips destroy actions in the test sequence, including initial stale-instance cleanup, so the text now states that explicitly.
- Docker cleanup commands filtered on `label=creator=molecule`. The current Molecule Docker plugin labels created containers and networks with `owner=molecule`, so Docker cleanup and monitoring commands were updated to use `label=owner=molecule`.
- The Vagrant section said `vagrant global-status --prune` removes stale entries and VMs. Official Vagrant documentation says it prunes invalid global-status entries; actual VM destruction is done with `vagrant destroy`. The wording was corrected.
- The resource monitoring command used command substitution with `docker stats`, which would show all running containers if the filter returned no IDs. It now pipes IDs through `xargs -r`.

## Review Notes
The post is technically valid after the corrections. The examples assume a Linux/GNU userland for `xargs -r`, which is appropriate for the shown Ubuntu and Docker-in-Docker CI examples but is not portable to macOS/BSD without adjustment.
