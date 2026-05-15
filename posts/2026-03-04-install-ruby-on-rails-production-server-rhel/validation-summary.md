# Validation Summary: How to Install Ruby on Rails and Set Up a Production Server on RHEL

## Status
validated

## Post Type
Tutorial / production setup guide

## Technologies Covered
- Red Hat Enterprise Linux
- DNF and AppStream modules
- Ruby and RubyGems
- Ruby on Rails
- PostgreSQL
- Puma
- systemd
- Nginx
- SELinux and firewall deployment considerations

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, distribution of content in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_distribution-of-content-in-rhel-9_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux Application Streams life cycle: https://access.redhat.com/support/policy/updates/rhel-app-streams-life-cycle
- RubyGems FAQ, user install executable path: https://guides.rubygems.org/faqs/
- Ruby on Rails Guides, command line and `rails new --database=postgresql`: https://guides.rubyonrails.org/command_line.html
- Ruby on Rails Guides, asset precompilation: https://guides.rubyonrails.org/asset_pipeline.html
- PostgreSQL official Red Hat family Linux package notes: https://www.postgresql.org/download/linux/redhat/
- Puma official DSL documentation: https://puma.io/puma/Puma/DSL.html
- Nginx official upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx official proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Red Hat Enterprise Linux 9 documentation, systemd unit files: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_systemd_unit_files_to_customize_and_optimize_your_system/using_systemd_unit_files_to_customize_and_optimize_your_system

## Issues Found
- The RubyGems user-install PATH used `$HOME/.local/share/gem/ruby/3.2.0/bin`, but RubyGems documents user-installed executables under `Gem.user_dir` such as `~/.gem/ruby/<version>/bin`. Changed the verification and Rails app creation commands to compute the path with `ruby -r rubygems -e "puts Gem.user_dir"`.
- The systemd unit ran as `User=deploy`, but the guide did not create that user or make `/var/www` writable for it. Added commands to create the `deploy` user and prepare `/var/www`.
- The Rails app was created as the invoking shell user, while Puma later ran as `deploy`. Changed app creation to run as `deploy` so the service can read and write expected runtime files.
- The Puma config redirected output directly to `/var/www/myapp/config/puma.rb`, which can fail after `/var/www` is owned by `deploy` or can leave root-owned files. Changed it to run `tee` as `deploy`.
- The Puma socket and PID directories were referenced but not created. Added `mkdir -p` for `tmp/sockets` and `tmp/pids` before writing the Puma config.
- The systemd service used `/usr/local/bin/bundle`, but RHEL's `rubygem-bundler` package provides Bundler through the system Ruby installation path. Changed `ExecStart` to `/usr/bin/bundle`.
- The production database and asset commands ran as the current user, not the deployment user. Changed them to run as `deploy`; added `SECRET_KEY_BASE_DUMMY=1` to asset precompilation, matching Rails guidance for build-time production asset compilation without production secrets.

## Review Notes
The remaining commands and configuration are technically plausible for a RHEL deployment, but production deployments still need environment-specific database credentials, firewall rules, SELinux policy or labels, TLS configuration, and secret management. I did not execute the RHEL-specific package, service, or database commands locally because the review environment is not a RHEL host.
