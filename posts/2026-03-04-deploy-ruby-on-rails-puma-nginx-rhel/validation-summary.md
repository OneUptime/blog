# Validation Summary: How to Deploy a Ruby on Rails Application with Puma and Nginx on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Ruby
- Ruby on Rails
- Bundler
- Puma
- Nginx
- systemd
- SELinux
- firewalld
- PostgreSQL client development libraries

## Sources Consulted
- Red Hat Enterprise Linux 9 Application Streams Life Cycle: https://access.redhat.com/support/policy/updates/rhel-app-streams-life-cycle
- Red Hat Enterprise Linux 9 DNF content installation documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Puma official README and configuration documentation: https://puma.io/puma/
- RubyGems Bundler guide: https://guides.rubygems.org/getting_started/
- systemd.exec official manual: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- systemd.service official manual: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- NGINX static content and try_files documentation: https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/
- NGINX compression documentation for gzip_static: https://docs.nginx.com/nginx/admin-guide/web-server/compression/
- Rails Asset Pipeline guide: https://guides.rubyonrails.org/asset_pipeline.html

## Issues Found
- The prerequisite command used `ruby:3.2`, but Red Hat's current RHEL 9 Application Streams lifecycle lists Ruby 3.3 and not Ruby 3.2 as a supported RHEL 9 Ruby stream. Changed the command to enable `ruby:3.3`.
- The systemd unit used `/usr/local/bin/bundle`, which is not the path provided by the RHEL `rubygem-bundler` package. Changed it to `/usr/bin/bundle`.
- The `.env` example left `SECRET_KEY_BASE` as a placeholder even though the surrounding commands implied the deployment was ready to run. Changed the snippet to generate the Rails secret first and write it into `.env`.
- The one-off migration and asset precompile commands set only `RAILS_ENV`; they did not load `DATABASE_URL` or `SECRET_KEY_BASE` from `.env`. Added shell sourcing of `.env` before running `rails db:migrate` and `rails assets:precompile`.
- The original Puma/Nginx example used a Unix socket while the SELinux fix enabled `httpd_can_network_connect`, which applies to outbound network connections. Changed Puma and Nginx to use `127.0.0.1:3000` so the SELinux guidance matches the proxy transport.
- Removed creation of the now-unused Puma socket directory after changing the upstream from a Unix socket to loopback TCP.

## Review Notes
The post is now technically consistent for a RHEL 9 deployment using the supported Ruby 3.3 AppStream, Puma managed by systemd, and Nginx proxying to Puma over localhost. Future improvements could add HTTPS/TLS setup and Rails credentials handling, but those are outside the scope of the current correction.
