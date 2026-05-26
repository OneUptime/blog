# Validation Summary: How to Install Roles from GitHub with Ansible Galaxy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible Galaxy
- Git
- GitHub
- YAML
- SSH authentication
- HTTPS token authentication

## Sources Consulted
- Ansible Galaxy User Guide: https://docs.ansible.com/projects/ansible/latest/galaxy/user_guide.html
- Ansible Galaxy CLI Reference: https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html
- GitHub Docs, Managing personal access tokens: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitHub Docs, About remote repositories: https://docs.github.com/en/get-started/getting-started-with-git/about-remote-repositories
- GitHub release tag for geerlingguy/ansible-role-nginx 3.1.0: https://github.com/geerlingguy/ansible-role-nginx/releases/tag/3.1.0

## Issues Found
- The HTTPS token template used the token as the URL username without providing a password component. GitHub's documented HTTPS Git authentication flow requires a username and uses the personal access token in place of the password. Updated the example to use `https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/...`.
- The GitHub release tarball section said Git is not required on the target system. `ansible-galaxy` installs roles on the control machine where the command runs, not on managed hosts. Updated the wording to "the machine running `ansible-galaxy`."

## Review Notes
The Ansible requirements file attributes `src`, `scm`, `version`, and `name`, the direct Git install syntax with a comma-separated version, role naming behavior, tarball URL support, and branch/tag/commit version pinning are consistent with current Ansible documentation. The local environment did not have `ansible-galaxy` installed, so CLI behavior was checked against official Ansible documentation rather than local `--help` output.
