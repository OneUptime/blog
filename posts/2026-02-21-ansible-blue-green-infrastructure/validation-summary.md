# Validation Summary: How to Use Ansible to Set Up Blue-Green Infrastructure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and roles
- Blue-green deployments
- HAProxy-style load balancer configuration
- Ansible handlers and `meta: flush_handlers`
- Ansible facts, templates, copy, slurp, URI checks, cron, and UFW modules
- Integration testing with `pytest`

## Sources Consulted
- Ansible `include_role` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible delegation documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible `meta` module documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/meta_module.html
- Ansible `uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible loops and retries documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible `slurp` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/slurp_module.html
- Ansible `copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- Community General `timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Community General `ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- The deployment role used `delegate_to` directly on `include_role`. Ansible documents that task keywords apply to the include statement itself, and delegation is not meaningful for the include action. Changed the example to use `include_role.apply.delegate_to` with an explicit loop variable so the included role tasks run against each inactive server.
- The traffic switch notified the HAProxy reload handler but verified live traffic before handlers would normally run. Added `ansible.builtin.meta: flush_handlers` after the load balancer template task so the reload happens before the stabilization pause and health check.
- The rollback example switched HAProxy back to the previous environment but did not update the active environment marker. Added a `set_fact` task for the previous environment and servers, then updated `/opt/blue-green/active_env` after flushing the reload handler.
- The infrastructure workflow used `ansible.builtin.timezone`, but current Ansible documentation lists the timezone module in the `community.general` collection. Changed it to `community.general.timezone`.
- The post referred to the blue-green pattern as "this module" in two places even though the post is not about an Ansible module. Changed those references to "this pattern."

## Review Notes
The YAML examples parse successfully. `ansible-playbook` is not installed in this workspace, so a full Ansible syntax check could not be run locally. The examples remain illustrative and assume supporting files such as `haproxy_backend.cfg.j2`, `deploy-bg.yml`, `rollback-bg.yml`, inventory groups, handlers, and the `app_deploy` role exist.
