# Validation Summary: How to Use Custom Collections in Execution Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible collections
- Ansible Builder execution environments
- ansible-galaxy requirements files
- Red Hat Automation Hub and private Galaxy servers
- Git-based collection installs
- Local collection tarballs
- Podman and ansible-navigator

## Sources Consulted
- Ansible Builder execution environment definition: https://docs.ansible.com/projects/builder/en/stable/definition/
- Ansible Builder CLI usage: https://docs.ansible.com/projects/builder/en/stable/usage/
- Ansible collection installation and requirements file format: https://docs.ansible.com/projects/ansible/6/user_guide/collections_using.html
- Ansible Navigator settings, including execution environment image and pull policy: https://docs.ansible.com/projects/navigator/settings/
- Ansible execution environment run example: https://docs.ansible.com/projects/ansible/latest/getting_started_ee/run_execution_environment.html
- Red Hat Automation Hub configuration: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.4/html-single/getting_started_with_automation_hub/index
- community.general json_query filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/json_query_filter.html
- community.general random_string lookup documentation: https://docs.ansible.com/ansible/latest/collections/community/general/random_string_lookup.html

## Issues Found
- The local tarball requirement referenced `./collections/myorg-myapp-1.0.0.tar.gz`, but the EE example copies the tarball directory to `/tmp/collections/` before Galaxy installation. Changed the requirement path to `/tmp/collections/myorg-myapp-1.0.0.tar.gz` so it matches the build-stage copy location.
- The verification example treated `community.general.json_query` as a module and checked it with plain `ansible-doc`. It is a filter plugin and also requires the `jmespath` Python package. Changed the example to verify and use the `community.general.random_string` lookup plugin with `ansible-doc -t lookup`, avoiding an undeclared Python dependency.
- The "Check for available updates" shell loop only listed installed collections and did not query available updates. Changed the comment and parsing to accurately list currently installed collection versions before the user updates `requirements.yml` and rebuilds.

## Review Notes
The Ansible Builder v3 schema fields, `additional_build_files`, `additional_build_steps`, `dependencies.galaxy`, Automation Hub `ansible.cfg` fields, Git collection requirement syntax, `ansible-builder build --tag --verbosity`, Podman collection listing, and `ansible-navigator run --execution-environment-image --mode stdout --pull-policy missing` usage matched the referenced official documentation. The environment used for this review did not have `ansible-galaxy` or `ansible-builder` installed, so command behavior was verified against official documentation rather than local execution.
