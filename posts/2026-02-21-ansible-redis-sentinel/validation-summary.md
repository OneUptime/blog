# Validation Summary: How to Use Ansible to Set Up Redis Sentinel

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and inventory
- Redis Open Source
- Redis Sentinel
- Ubuntu/Debian APT package installation
- Redis replication and failover

## Sources Consulted
- Redis Sentinel high availability documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis Sentinel client specification: https://redis.io/docs/latest/develop/reference/sentinel-clients/
- Redis security documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis Open Source APT installation documentation: https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/apt/
- Ansible `apt_key` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible `get_url` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible `import_playbook` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_playbook_module.html
- Ansible inventory pattern documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html

## Issues Found
- The post said an odd number of Sentinels is required for quorum. Redis Sentinel requires majority authorization for failover and recommends at least three Sentinels; an odd count is common but not strictly required. Updated the wording to distinguish quorum from majority authorization.
- The installation playbook used `ansible.builtin.apt_key`, which relies on deprecated `apt-key`. Replaced it with a keyring file downloaded by `ansible.builtin.get_url` and referenced with `signed-by` in the APT repository definition.
- The Sentinel configuration did not make Sentinel reachable from other hosts. Redis Sentinel's default protected behavior can prevent non-localhost access unless `bind` or `protected-mode` is configured. Added `bind 0.0.0.0` and `protected-mode no` to match the multi-host private-network example.
- The replica Redis configuration hard-coded `port 6379` even though the inventory defines `redis_master_port`. Updated the replica template to use `{{ redis_master_port }}` consistently.

## Review Notes
- The Redis and Sentinel examples intentionally bind to all interfaces and disable protected mode for a private network. In production, this should be paired with firewall rules, private networking, and strong authentication.
- The post uses password-only Redis authentication. Redis 6 and newer support ACLs, which would be a stronger production pattern, but the password-only configuration shown is still valid.
