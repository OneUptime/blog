# Validation Summary: How to Use Ansible Galaxy to Install Roles from GitHub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Galaxy
- Ansible roles
- Git and GitHub repositories
- SSH authentication
- HTTPS personal access token authentication
- GitHub Actions
- Ansible configuration

## Sources Consulted
- Ansible Galaxy User Guide: https://docs.ansible.com/projects/ansible/latest/galaxy/user_guide.html
- Ansible Galaxy CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- GitHub personal access token documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitHub repository refs for `geerlingguy/ansible-role-nginx`: https://github.com/geerlingguy/ansible-role-nginx
- Local verification with `ansible-galaxy` from `ansible-core` 2.21.0

## Issues Found
- The post used `v3.1.0` for `geerlingguy/ansible-role-nginx`, but that repository publishes the tag as `3.1.0` without the `v` prefix. Updated the tag and related examples.
- The branch example used `develop`, but that repository currently exposes `master` as the branch. Updated the branch example.
- The commit example used a placeholder SHA that would not install. Replaced it with the current valid commit SHA for the repository.
- The post showed `ansible-galaxy install ... --name nginx`, but `ansible-galaxy role install` does not support a `--name` option. Updated the section to show custom role naming via `requirements.yml`, which is the documented supported method.
- The HTTPS token examples used `oauth2` as the username. GitHub documents HTTPS Git authentication as a username plus personal access token password, so the examples now use `YOUR_USERNAME:YOUR_TOKEN`.
- The `ansible.cfg` example labeled `role_skeleton_ignore` as a timeout setting. Replaced it with the documented `[galaxy] server_timeout = 60` setting and corrected the comment.

## Review Notes
- Verified the corrected public GitHub role install examples and the custom-name `requirements.yml` example with `ansible-galaxy` in temporary directories.
- `ansible-galaxy install` remains accepted as an alias for role installation in current Ansible CLI behavior, although the explicit modern form is `ansible-galaxy role install`.
