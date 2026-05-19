# Validation Summary: How to Deploy a Rails Application on Ubuntu with Puma and Nginx

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Ruby
- Ruby on Rails
- rbenv
- Bundler
- Puma
- systemd
- Nginx
- PostgreSQL

## Sources Consulted
- Puma restart documentation: https://puma.io/puma/file.restart.html
- Puma DSL documentation: https://puma.io/puma/Puma/DSL.html
- Puma README / cluster mode hooks: https://puma.io/puma/
- Bundler `bundle install` documentation: https://bundler.io/man/bundle-install.1.html
- Bundler `bundle config` documentation: https://bundler.io/man/bundle-config.1.html
- Ruby maintenance branches: https://www.ruby-lang.org/en/downloads/branches/
- Ruby 3.4.9 release announcement: https://www.ruby-lang.org/en/news/2026/03/11/ruby-3-4-9-released/
- Rails debugging guide / log file behavior: https://guides.rubyonrails.org/debugging_rails_applications.html
- Heroku Rails stdout logging reference: https://github.com/heroku/rails_stdout_logging
- rbenv README: https://github.com/rbenv/rbenv
- ruby-build README: https://github.com/rbenv/ruby-build
- NGINX release documentation: https://docs.nginx.com/nginx/releases/
- NGINX SSL termination documentation: https://docs.nginx.com/nginx/admin-guide/security-controls/terminating-ssl-http/
- systemd 255 local `systemctl --version` output

## Issues Found
- The Ruby example installed Ruby 3.3.0, which is outdated as of 2026-05-19. Changed the example to Ruby 3.4.9, a current normal-maintenance Ruby branch release.
- The Puma configuration enabled `preload_app!` while the post describes phased restarts for code upgrades. Puma documentation states phased restarts for application upgrades require `preload_app!` to be disabled and `prune_bundler` enabled. Replaced `preload_app!` with `prune_bundler`.
- The Puma configuration did not set the `directory` option to the `current` symlink, which Puma uses during restart to re-evaluate the release path. Added `directory "#{app_dir}/current"`.
- The Puma hook used `on_worker_boot`, which is still accepted but is now documented as an alias for `before_worker_boot` in current Puma. Updated it to `before_worker_boot`.
- The Bundler install command used deprecated remembered CLI flags: `--deployment` and `--without`. Replaced them with `bundle config set --local deployment true`, `bundle config set --local without 'development test'`, and `bundle install`.
- The post monitored `/var/www/myapp/shared/log/production.log`, but the deployment commands did not link the release `log` directory to `shared/log`. Added commands to replace the release `log` directory with a symlink to `/var/www/myapp/shared/log`.
- The environment file set `RAILS_LOG_TO_STDOUT=true` while the post instructs readers to monitor `shared/log/production.log`. Removed it so Rails writes to the shared production log path instead of stdout.

## Review Notes
- The Nginx sample uses `listen 443 ssl http2;`. Current upstream NGINX marks the `http2` listen parameter deprecated in favor of the separate `http2` directive, but Ubuntu 22.04 and 24.04 repository packages may not support the newer directive. I left the snippet compatible with the Ubuntu versions named in the prerequisites.
