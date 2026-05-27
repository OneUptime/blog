# Validation Summary: How to Use Ansible to Install RabbitMQ

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- RabbitMQ
- Erlang/OTP
- Debian/Ubuntu APT repositories
- systemd
- Linux sysctl tuning
- RabbitMQ plugins and configuration

## Sources Consulted
- RabbitMQ Debian/Ubuntu installation guide: https://www.rabbitmq.com/docs/install-debian
- RabbitMQ Erlang version requirements: https://www.rabbitmq.com/docs/which-erlang
- RabbitMQ configuration guide: https://www.rabbitmq.com/docs/configure
- RabbitMQ rabbitmq-env.conf manual: https://www.rabbitmq.com/docs/man/rabbitmq-env.conf.5
- RabbitMQ management plugin documentation: https://www.rabbitmq.com/docs/management
- RabbitMQ consumers documentation: https://www.rabbitmq.com/docs/consumers
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible apt_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible community.rabbitmq.rabbitmq_plugin module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/rabbitmq/rabbitmq_plugin_module.html

## Issues Found
- The post claimed RabbitMQ 3.12+ requires Erlang 25.x or 26.x and used RabbitMQ 3.13/Erlang 26 examples. Updated the guidance and inventory examples to RabbitMQ 4.3.x with Erlang 27.x, matching current RabbitMQ compatibility documentation.
- The installation playbook used older Cloudsmith mirror URLs and `ansible.builtin.apt_key`. Replaced them with the current Team RabbitMQ `deb1.rabbitmq.com`/`deb2.rabbitmq.com` repositories, a `signed-by` keyring, and non-deprecated Ansible tasks.
- The version pinning task only preferred the old repository origin and did not actually pin the configured package versions. Updated the APT preferences to pin both `erlang*` and `rabbitmq-server` to the inventory wildcard versions.
- The Erlang and RabbitMQ version variables were declared but not used during package installation. Updated package names to install the configured wildcard versions.
- Separate `community.rabbitmq.rabbitmq_plugin` tasks could disable plugins enabled by earlier tasks because `new_only` defaults to `false`. Added `new_only: true` to preserve already-enabled plugins.
- The `rabbitmq-env.conf` example used `RABBITMQ_LOG_BASE`, but variables in `rabbitmq-env.conf` should omit the `RABBITMQ_` prefix. Changed it to `LOG_BASE`.
- The verification playbook attempted to authenticate as the default `guest` user over `ansible_host`, while the config keeps `guest` restricted to localhost. Changed the management API check to `127.0.0.1`.

## Review Notes
YAML snippets parse successfully with the local Python YAML parser. `ansible-playbook --syntax-check` was not run because Ansible is not installed in this workspace.
