# Validation Summary: How to Use Podman with Packer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Packer
- Podman
- Docker-compatible container APIs / Packer Docker plugin
- Ansible
- GitHub Actions
- HCL2
- YAML
- Shell scripting

## Sources Consulted
- Packer Install docs — https://developer.hashicorp.com/packer/install
- Packer Docker builder docs — https://developer.hashicorp.com/packer/integrations/hashicorp/docker/latest/components/builder/docker
- Packer Docker push post-processor docs — https://developer.hashicorp.com/packer/integrations/hashicorp/docker/latest/components/post-processor/docker-push
- Packer file provisioner docs — https://developer.hashicorp.com/packer/docs/provisioners/file
- Packer build command reference — https://developer.hashicorp.com/packer/docs/commands/build
- Packer HCL templates overview — https://developer.hashicorp.com/packer/docs/templates/hcl_templates
- Packer variables guide — https://developer.hashicorp.com/packer/guides/hcl/variables
- Packer Ansible provisioner docs — https://developer.hashicorp.com/packer/integrations/hashicorp/ansible/latest/components/provisioner/ansible
- Podman system service docs — https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Installing Ansible — https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- Ansible apt module docs — https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible pip module docs — https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html
- GitHub Actions workflow syntax — https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions variables docs — https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables

## Issues Found
1. The Linux install commands mixed Fedora and RHEL instructions and used an outdated Debian/Ubuntu repo stanza. I split Fedora and RHEL into their correct official repository flows and updated the APT example to the current HashiCorp format.

2. The Podman socket example hardcoded a rootless socket path and presented the command too generically. I changed it to the documented `$XDG_RUNTIME_DIR/podman/podman.sock` form and clarified that the `systemctl --user` example is for Linux hosts.

3. The Ansible section was incomplete for a working Docker/Podman-backed container build. I added the required Packer plugin declarations, bootstrapped `python3` and `python3-apt` before running Ansible, made `use_proxy = true` explicit for the Docker builder, removed `become: true` from the container playbook, and updated the `pip` task for modern Ubuntu 24.04 / PEP 668 behavior.

4. The multi-stage example would not work as written. It tried to build into `/output/server` without first creating `/output`, attempted to run `podman` inside the runtime container, and depended on build ordering even though `packer build` runs builds in parallel by default. I changed it to download the compiled binary with Packer's file provisioner, upload it into the runtime image, and added the required `-parallel-builds=1` build command.

5. The variable-driven build command targeted only `parameterized.pkr.hcl` even though the variable declarations were shown in a separate `.pkr.hcl` file. I changed the command to build the directory so Packer loads both files together.

6. The registry push example used standalone `post-processor` blocks for `docker-tag` and `docker-push`. Per the documented Docker builder flow, those steps need to be chained in a `post-processors` block so the tagged artifact is passed into the push step. I rewrote that snippet accordingly.

7. The GitHub Actions example was outdated and unreliable. It hard-coded an old Packer version, used a user systemd socket pattern that is a poor fit for ephemeral CI, and set `DOCKER_HOST` using shell syntax inside YAML `env`. I updated it to install current Packer from the HashiCorp repo, start `podman system service` directly in the build step, use a fixed socket path, and initialize the specific Packer template file.

## Review Notes
- The post is now technically sound, but the Podman setup examples remain Linux-oriented. macOS and Windows users generally need `podman machine` rather than a local user systemd socket.
- The manual `packer plugins install github.com/hashicorp/docker` command is still valid, but `required_plugins` plus `packer init` is the more reproducible pattern for self-contained templates.
- Some pinned base image tags in the examples are illustrative and may need periodic refreshes as upstream images age out of support.
