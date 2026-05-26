# Validation Summary: How to Use Ansible Galaxy Token Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Galaxy
- ansible-galaxy CLI
- Ansible configuration
- Red Hat Automation Hub
- Galaxy NG
- OAuth2 refresh tokens
- Environment variables
- HashiCorp Vault
- Ansible Vault
- GitHub Actions
- GitLab CI

## Sources Consulted
- Ansible Galaxy user guide: https://docs.ansible.com/ansible/latest/galaxy/user_guide.html
- ansible-galaxy CLI reference: https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html
- Ansible configuration settings: https://docs.ansible.com/ansible/latest/reference_appendices/config.html
- Galaxy NG API documentation: https://docs.ansible.com/projects/galaxy-ng/en/latest/community/api_v3.html
- Red Hat Automation Hub hosted service documentation: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/
- Red Hat Hybrid Cloud Console: https://console.redhat.com/

## Issues Found
- Updated Red Hat hosted Automation Hub URLs from `cloud.redhat.com` to `console.redhat.com`, which is the current Hybrid Cloud Console host used in Red Hat documentation.
- Clarified that GitHub personal access tokens and `ansible-galaxy login --github-token` apply to older role-oriented workflows. Current Ansible Galaxy collection publishing uses Galaxy API tokens, and the latest `ansible-galaxy` CLI documentation does not list the legacy `login` subcommand.
- Replaced the undocumented Galaxy NG token rotation API example with the documented Red Hat SSO refresh-token request used to keep Automation Hub offline tokens active, plus UI-based guidance for private automation hub API token replacement.
- Corrected the private Galaxy NG debugging API path from a generic `/api/galaxy/v3/collections/` endpoint to the documented collection index path under `/api/galaxy/v3/plugin/ansible/content/published/collections/index/`.
- Hardened the Ansible Vault extraction example by shell-quoting exported values and quoting the command substitution used with `eval`.

## Review Notes
The local environment did not have `ansible-galaxy` installed, so CLI details were verified against official Ansible documentation instead of local `--help` output.
