# Validation Summary: How to Use Ansible to Deploy a Ruby on Rails Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ruby on Rails
- Ruby
- rbenv
- Bundler
- Puma
- Nginx
- systemd
- PostgreSQL
- Ubuntu

## Sources Consulted
- Ansible 2.9 `apt` module documentation: https://docs.ansible.com/ansible/2.9/modules/apt_module.html
- Ansible 2.9 `git` module documentation: https://docs.ansible.com/ansible/2.9/modules/git_module.html
- Ansible 2.9 task includes documentation: https://docs.ansible.com/ansible/2.9/user_guide/playbooks_reuse_includes.html
- Ansible `user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible 2.9 `group` module documentation: https://ansible.readthedocs.io/projects/ansible/2.9/modules/group_module.html
- Ansible `file` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible `template` module documentation: https://docs.ansible.com/ansible/8/collections/ansible/builtin/template_module.html
- Ansible `systemd` module documentation: https://docs.ansible.com/projects/ansible-core/2.13/collections/ansible/builtin/systemd_module.html
- Bundler `bundle install` manual: https://bundler.io/man/bundle-install.1.html
- Bundler `bundle config` manual: https://bundler.io/man/bundle-config.1.html
- rbenv installation documentation: https://github.com/rbenv/rbenv
- ruby-build documentation: https://github.com/rbenv/ruby-build
- Puma systemd documentation: https://puma.io/puma/file.systemd.html
- Rails configuration guide for database configuration and `DATABASE_URL`: https://guides.rubyonrails.org/v5.0/configuring.html
- Rails command line guide for `db:migrate`, `db:seed`, and `assets:precompile`: https://guides.rubyonrails.org/command_line.html
- systemd execution environment documentation for `EnvironmentFile`: https://www.freedesktop.org/software/systemd/man/247/systemd.exec.html
- Heroku Rails stdout logging reference for Rails environment variables: https://github.com/heroku/rails_stdout_logging

## Issues Found
- The Ansible role used `become_user: "{{ app_user }}"` and assigned files to `app_user`/`app_group`, but never created that user or group. Added `group` and `user` tasks before the rbenv installation tasks so the later tasks have valid accounts to use.
- The Bundler example used `bundle install --deployment --without development test`. Bundler documents these remembered options as deprecated. Replaced them with `bundle config set --local deployment 'true'`, `bundle config set --local without 'development test'`, and `bundle install`.
- The playbook deployed `{{ app_dir }}/current/.env`, but the Puma systemd unit did not load it. Added `EnvironmentFile={{ app_dir }}/current/.env` so `SECRET_KEY_BASE`, `DATABASE_URL`, and the Rails environment variables are available to the service process.
- The environment template set `RAILS_LOG_TO_STDOUT=false`. In typical Rails production templates, the presence of `RAILS_LOG_TO_STDOUT` enables stdout logging, so the string `false` is still present and misleading. Changed it to `RAILS_LOG_TO_STDOUT=true`, which matches the intended systemd/journald deployment pattern.
- The seed-data command omitted the production inventory and vault password flag used by the main deployment command. Updated it to `ansible-playbook -i inventory/production.yml deploy.yml --ask-vault-pass -e "seed_database=true"`.

## Review Notes
- The snippets remain generic and assume the target Rails app has a compatible `config/puma.rb`, PostgreSQL database/user already provisioned, and valid vault variables. Those are acceptable assumptions for this focused deployment role, but a production-ready role could add database provisioning, TLS, SSH host key handling, and more granular idempotence around migrations and asset compilation.
