# Validation Summary: How to Use the Community Execution Environment Image

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Execution Environments
- Ansible community EE images
- ansible-navigator
- ansible-builder
- Podman
- skopeo
- Ansible collections
- YAML configuration

## Sources Consulted
- Ansible Community Documentation: Running Ansible with the community EE image - https://docs.ansible.com/projects/ansible/latest/getting_started_ee/run_community_ee_image.html
- Ansible Community Documentation: Running your EE - https://docs.ansible.com/projects/ansible/latest/getting_started_ee/run_execution_environment.html
- Ansible Navigator settings documentation - https://docs.ansible.com/projects/navigator/settings/
- Ansible Navigator subcommands documentation - https://docs.ansible.com/projects/navigator/subcommands/
- Ansible Builder execution environment definition documentation - https://docs.ansible.com/projects/builder/en/stable/definition/
- Ansible Builder CLI usage documentation - https://docs.ansible.com/projects/builder/en/latest/usage/
- Ansible Development Tools container documentation - https://docs.ansible.com/projects/dev-tools/container/
- Ansible community forum announcement for community EE images - https://forum.ansible.com/t/execution-environments-getting-started-guide-community-ee-images-availability/1341
- GHCR registry tag API for `ansible-community/community-ee-minimal` - https://ghcr.io/v2/ansible-community/community-ee-minimal/tags/list
- GHCR registry tag API for `ansible-community/community-ee-base` - https://ghcr.io/v2/ansible-community/community-ee-base/tags/list

## Issues Found
- The post used `quay.io/ansible/community-ee-minimal`, but the official community EE image references are `ghcr.io/ansible-community/community-ee-minimal` and `ghcr.io/ansible-community/community-ee-base`. Updated all affected pull, run, save, ansible-navigator, ansible-builder, and skopeo examples.
- The post described `community-ee-minimal` as including minimal collections and listed `ansible.posix` and `ansible.utils` under the minimal image. Official documentation states `community-ee-minimal` includes only `ansible-core`, while `community-ee-base` includes base collections. Updated the explanation and collection inspection examples accordingly.
- The test playbook uses `ansible.posix.synchronize`, which is not available in the minimal image. Updated the test run and default ansible-navigator configuration to use `community-ee-base`.
- The post suggested `community.general` was included in the community EE set used by the examples. Updated the recommendation to collections documented for the base image: `ansible.posix`, `ansible.utils`, and `ansible.windows`.
- The pinned image example used `2.16-latest`, which is not a current tag pattern in GHCR for these images. Updated it to the current available tag `2.20.6-1`.
- The comparison examples mixed the minimal image with the dev tools image while describing community EE image comparison. Updated them to compare `community-ee-minimal` and `community-ee-base`.

## Review Notes
The ansible-navigator command options and configuration keys matched the official settings documentation. The ansible-builder version 3 structure, inline Galaxy dependency format, and `--tag` / `--verbosity` options matched the official builder documentation.
