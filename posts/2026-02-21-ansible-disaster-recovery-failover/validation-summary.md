# Validation Summary: How to Use Ansible to Automate Disaster Recovery Failover

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules
- Ansible community.general collection
- Ansible amazon.aws collection
- PostgreSQL 15 standby promotion
- Amazon Route 53 DNS records
- UFW firewall management
- Cron scheduling

## Sources Consulted
- Ansible `amazon.aws.route53` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/route53_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible privilege escalation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible retry/until loop documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible `ansible.builtin.setup` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible `ansible.builtin.hostname` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- PostgreSQL 15 failover documentation: https://www.postgresql.org/docs/15/warm-standby-failover.html
- PostgreSQL `pg_ctl` documentation: https://www.postgresql.org/docs/current/app-pg-ctl.html
- Amazon Route 53 record TTL documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-shared.html

## Issues Found
- The DNS switching task used the short module name `route53`. Changed it to `amazon.aws.route53` because the current Route 53 module is provided by the `amazon.aws` collection and the fully qualified collection name is the reliable documented form.
- The infrastructure provisioning example used `ansible.builtin.timezone`. Changed it to `community.general.timezone` because the current timezone module is documented in the `community.general` collection.
- The PostgreSQL promotion tasks specified `become_user: postgres` without `become: true`. Added `become: true` because Ansible's privilege escalation documentation states that `become_user` does not imply privilege escalation.
- The PostgreSQL recovery check ran regardless of `dr_db_type`. Added the same `when: dr_db_type == 'postgresql'` condition used by the promotion task so non-PostgreSQL configurations do not run a PostgreSQL-specific command.

## Review Notes
- The failover examples are illustrative and still require environment-specific inventory groups, PostgreSQL paths, AWS credentials, and service startup tasks.
- The health-check retry pattern is valid for current Ansible behavior, where `retries` without `until` retries a failed task up to the configured count.
- The Route 53 example updates records with a low TTL, but existing resolver caches can still delay failover until previously cached TTLs expire.
