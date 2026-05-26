# Validation Summary: How to Publish Ansible Roles to Galaxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible roles
- Ansible Galaxy
- ansible-galaxy CLI
- Galaxy role metadata in `meta/main.yml`
- GitHub Actions
- Molecule
- ansible-lint and yamllint

## Sources Consulted
- Ansible Community Documentation: `ansible-galaxy` CLI reference, https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible Community Documentation: Galaxy User Guide, https://docs.ansible.com/projects/ansible/latest/galaxy/user_guide.html
- Ansible Galaxy Documentation: Creating Roles and role metadata, https://old-galaxy.ansible.com/docs/contributing/creating_role.html
- Ansible Galaxy Documentation: Importing Content and role imports, https://old-galaxy.ansible.com/docs/contributing/importing.html
- Ansible Galaxy Documentation: Content Scoring, https://old-galaxy.ansible.com/docs/contributing/content_scoring.html

## Issues Found
- The post said Galaxy strips the `ansible-role-` prefix automatically. Current Galaxy documentation says Galaxy no longer performs that calculation; it keeps the repository name with normalization unless `role_name` is set. Updated the explanation to tell readers to set `role_name`.
- The README example used nested fenced code blocks but closed them with mismatched fences such as ```` ```bash ```` and ```` ```text ````. Changed the outer fence to four backticks and closed nested examples correctly.
- The token storage examples used undocumented `ANSIBLE_GALAXY_TOKEN` and `~/.ansible/galaxy_token` patterns. Replaced them with the documented `ansible.cfg` Galaxy server token configuration and mentioned the `--token` CLI option.
- The `--role-name` import example was described as specifying a Galaxy namespace. The option only overrides the role name, so the surrounding text and comment were corrected.
- Several examples used older bare role commands such as `ansible-galaxy install`, `info`, `search`, and `list`. Updated them to the current documented `ansible-galaxy role ...` forms.
- The GitHub Actions import example depended on a third-party action. Replaced it with an official `ansible-galaxy role import --token ...` command after installing Ansible.
- The versioning section implied all Git tags become Galaxy versions and used a `v1.1.0` tag. Galaxy imports tags that match Semantic Versioning, so the text and examples now use `1.1.0`.
- The quality checklist used `ansible-galaxy role info .` to verify local metadata, but the documented command reports installed/Galaxy role information rather than validating the current directory. Replaced it with `yamllint meta/main.yml`.
- The badge section described a static badge as a quality score badge. Updated the wording to call it a Galaxy badge.

## Review Notes
The local environment did not have `ansible-galaxy` installed, so CLI behavior was checked against current official Ansible CLI documentation rather than local `--help` output.
