# Validation Summary: How to Set Up ansible-lint in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-lint
- ansible-galaxy collections
- GitHub Actions
- GitHub Code Scanning SARIF uploads
- yamllint
- tj-actions/changed-files

## Sources Consulted
- Ansible-lint usage documentation: https://docs.ansible.com/projects/lint/usage/
- Ansible collection installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- GitHub Actions setup-python documentation: https://github.com/actions/setup-python
- GitHub Actions checkout documentation: https://github.com/actions/checkout
- GitHub Actions cache documentation: https://github.com/actions/cache
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/uploading-a-sarif-file-to-github
- GitHub CodeQL upload-sarif action documentation: https://github.com/github/codeql-action
- tj-actions/changed-files documentation: https://github.com/tj-actions/changed-files

## Issues Found
- The GitHub-owned actions used older major versions than current documentation examples. Updated `actions/checkout` to `v6`, `actions/setup-python` to `v6`, `actions/cache` to `v5`, and `github/codeql-action/upload-sarif` to `v4`.
- The SARIF workflow used `ansible-lint --sarif-file ... || true` with `continue-on-error: true`, which allowed lint violations to upload SARIF but left the job green. Removed `|| true`, gave the lint step an `id`, and added a final failure step when the lint step outcome is `failure`.
- The pull request annotations section referred to a problem matcher even though ansible-lint emits GitHub Actions annotations automatically when running in GitHub Actions. Updated the wording to match ansible-lint documentation.
- The PR annotations example used `ANSIBLE_FORCE_COLOR: "false"` to disable color. ansible-lint documents `NO_COLOR=1` and `--nocolor` for disabling color, so the example now uses `NO_COLOR: "1"`.
- The changed-files example passed a space-separated file list directly to `ansible-lint`, which can break paths containing spaces. Added a newline separator and passed the list through `xargs -r -d '\n'`.
- The `tj-actions/changed-files` example used an older major version. Updated it to `v47`, matching the current documented major version.

## Review Notes
The examples use current GitHub Actions major versions that require a recent Actions runner. This is fine for GitHub-hosted `ubuntu-latest` runners, but self-hosted runners should be kept current before adopting the newest action majors.
