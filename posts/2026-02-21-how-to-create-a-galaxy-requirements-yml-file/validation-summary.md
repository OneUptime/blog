# Validation Summary: How to Create a Galaxy requirements.yml File

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy
- Galaxy role requirements files
- Galaxy collection requirements files
- YAML
- Make
- GitLab CI/CD

## Sources Consulted
- Ansible Community Documentation: Galaxy User Guide, installing multiple roles from a file and installing roles and collections from the same requirements.yml file: https://docs.ansible.com/projects/ansible/latest/galaxy/user_guide.html
- Ansible Community Documentation: Installing collections with ansible-galaxy, requirements.yml keys, collection source types, and version range identifiers: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible CLI documentation for ansible-galaxy role and collection install options: https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html

## Issues Found
- The post said two separate commands were required and that `ansible-galaxy install -r requirements.yml` processes only roles. Current Ansible documentation says `ansible-galaxy install -r requirements.yml` can install both roles and collections when default paths are used, while `ansible-galaxy role install -r` and `ansible-galaxy collection install -r` process only their respective sections. Updated the basic install guidance and custom-path examples accordingly.
- The large-project examples used `ansible-galaxy install -r` followed by `ansible-galaxy collection install -r`, which could reinstall collections when default paths are used. Changed the first command to `ansible-galaxy role install -r` so the two-command workflow is unambiguous.
- The Makefile and CI examples used `ansible-galaxy install -r` with a role path. Because combined role-and-collection installation has caveats with custom paths, changed those commands to `ansible-galaxy role install -r`.
- The collection version examples used the compatible-release operator `~=`. The current Ansible collection documentation lists supported range identifiers as `*`, `!=`, `==`, `>=`, `>`, `<=`, and `<`; it does not document `~=`. Replaced the example with the equivalent explicit range `>=3.7.0,<4.0.0`.
- The Python validation example required every role entry to have `name`, but Ansible role requirements may use `src` without `name`. Updated the assertion to allow either `name` or `src` for role entries.
- The post described the role and collection field examples as "all available fields." The official collection requirement keys also include fields such as `signatures`, and supported source types include more than the examples shown. Changed the wording to "common fields" to keep the examples accurate without expanding the scope.

## Review Notes
- The examples use project-local collection installation paths. Ansible appends `ansible_collections` under the path passed with `-p`, and playbook execution must use a collection path Ansible can discover.
