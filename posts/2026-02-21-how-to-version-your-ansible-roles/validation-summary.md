# Validation Summary: How to Version Your Ansible Roles

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible roles
- Ansible Galaxy
- YAML role requirements and role metadata
- Git tags
- Semantic Versioning
- GitHub Releases and GitHub CLI
- GitHub Actions
- Bash scripting

## Sources Consulted
- Ansible Galaxy User Guide: https://docs.ansible.com/projects/ansible/latest/galaxy/user_guide.html
- Ansible Galaxy CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Semantic Versioning 2.0.0: https://semver.org/
- Git tag documentation: https://git-scm.com/docs/git-tag.html
- GitHub CLI `gh release create` manual: https://cli.github.com/manual/gh_release_create
- Local `gh release create --help`
- Local `git --version` and `git tag` documentation check

## Issues Found
- The post incorrectly stated that standalone role versions should be kept in `galaxy_info.version` inside `meta/main.yml`. Ansible role metadata documents fields such as `author`, `description`, `license`, `min_ansible_version`, `platforms`, and `galaxy_tags`, while Galaxy imports matching Git tags as role versions. I removed the undocumented `version` field and changed the section to explain that role versions live in Git tags.
- The release workflow and automation script updated `meta/main.yml` as the source of truth for releases. I changed the workflow to tag releases directly and changed the script to calculate the next version from existing version tags instead of editing role metadata.
- The CI example compared the Git tag against the removed metadata version field. I replaced it with a tag-format validation check for `vMAJOR.MINOR.PATCH` and prerelease tags such as `v1.2.3-rc1`.
- The tag naming guidance overgeneralized the `v` prefix. I clarified that `v` tags work for direct Git installs when consumers specify the matching tag, while Galaxy-imported role versions should use semantic version tags without extra prefixes.

## Review Notes
The direct Git `requirements.yml` examples using `version: v1.1.0` are valid when the repository has matching `v`-prefixed tags. Role version ranges are not supported for Ansible roles, so the post's exact pinning guidance is appropriate.
