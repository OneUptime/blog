# Validation Summary: How to Use Ansible for Blue/Green Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and inventory
- Ansible built-in modules and filters
- Nginx upstream configuration and reloads
- AWS Application Load Balancer target groups
- AWS CLI elbv2 commands
- GitHub Actions workflow_dispatch pipelines
- Blue/green deployment patterns

## Sources Consulted
- Ansible `env` lookup documentation: https://docs.ansible.com/projects/ansible/3/collections/ansible/builtin/env_lookup.html
- Ansible `default` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_filter.html
- Ansible variable and `set_fact` documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible `uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- AWS CLI `elbv2 modify-listener` documentation: https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-listener.html
- AWS Elastic Load Balancing target health documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/check-target-health.html
- GitHub Actions contexts documentation: https://docs.github.com/en/actions/learn-github-actions/contexts
- GitHub Actions workflow_dispatch documentation: https://docs.github.com/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow

## Issues Found
- The project structure listed `health-check.yml` but the post uses `determine-target.yml` as the separate target-detection playbook. Updated the structure to include `determine-target.yml` and remove the unused `health-check.yml` entry.
- The inventory variable comment said `active_environment` gets updated by the switch playbook, but the shown switch playbook derives state from the Nginx configuration and does not write back to `group_vars/all.yml`. Updated the comment to match the implementation.
- The first play in `deploy.yml` referenced `deploy_version` before defining it. Added the same `deploy_version` variable definition to that play.
- The Ansible environment lookup used `default('latest')`, which does not replace the empty string returned by an unset environment variable. Updated it to `default('latest', true)` so the fallback works when `DEPLOY_VERSION` is unset.
- The AWS ALB target health wait condition passed for non-healthy states such as `initial` because it only checked that `unhealthy` was absent. Updated the condition to require at least one returned state and all returned states to be `healthy`.
- The GitHub Actions rollback job could run after a deployment failure that occurred before traffic was switched, which would make the rollback playbook switch traffic to the inactive environment. Added a job output set only after a successful switch and gated the rollback job on that output.

## Review Notes
- The examples use short Ansible module names such as `uri`, `template`, and `systemd`. These still work for built-in modules, although Ansible documentation recommends fully qualified collection names for clarity.
- The examples are intentionally infrastructure-specific and use placeholder artifact and application URLs. They are plausible examples but require environment-specific service units, templates, credentials, and artifact hosting to run as-is.
