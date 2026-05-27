# Validation Summary: How to Use Ansible to Deploy a PHP Laravel Application

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Ansible
- Laravel
- PHP and PHP-FPM
- Composer
- Nginx
- systemd
- cron
- Ansible Vault

## Sources Consulted
- Ansible apt_repository module documentation: https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/apt_repository_module.html
- Ansible apt module documentation: https://ansible.readthedocs.io/projects/ansible-core/devel/collections/ansible/builtin/apt_module.html
- Ansible git module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible systemd module documentation: https://docs.ansible.com/projects/ansible-core/2.13/collections/ansible/builtin/systemd_module.html
- Ansible Vault documentation: https://docs.ansible.com/projects/ansible/2.9/user_guide/playbooks_vault.html
- community.general Composer module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/composer_module.html
- Composer CLI documentation: https://getcomposer.org/doc/03-cli.md
- Composer installer documentation: https://getcomposer.org/download/
- Laravel deployment documentation: https://laravel.com/docs/11.x/deployment
- Laravel queue documentation: https://laravel.com/docs/10.x/queues
- Laravel scheduler documentation: https://laravel.com/docs/11.x/scheduling
- Laravel filesystem documentation: https://laravel.com/docs/11.x/filesystem
- Laravel encryption documentation: https://laravel.com/docs/11.x/encryption
- PHP-FPM configuration documentation: https://www.php.net/manual/en/install.fpm.configuration.php

## Issues Found
- The deployment tasks generated a Laravel APP_KEY with `php artisan key:generate --force` whenever the Git checkout changed, while the `.env` template already expected a vaulted `vault_app_key`. This could overwrite the production key and break encrypted data, sessions, and cookies. I replaced the task with a validation step that fails deployment when `vault_app_key` is missing and points readers to `php artisan key:generate --show`.
- The queue worker unit was templated and then immediately enabled/started before Ansible handlers would run `systemd daemon-reload`. I added `daemon_reload: yes` to the `systemd` task that enables and starts the worker, so systemd can see the newly created unit file during the same play.

## Review Notes
The remaining Ansible tasks, Laravel Artisan commands, Nginx configuration, PHP-FPM directives, Composer install options, scheduler cron entry, and systemd service options are technically consistent with the consulted documentation. The Composer task uses the `composer` module short name; in current Ansible environments this normally means the `community.general.composer` module must be available.
