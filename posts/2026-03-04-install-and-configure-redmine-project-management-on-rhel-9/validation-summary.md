# Validation Summary: How to Install and Configure Redmine Project Management on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Redmine
- Red Hat Enterprise Linux 9
- Ruby and Bundler
- PostgreSQL
- systemd
- DNF

## Sources Consulted
- Redmine official installation guide: https://www.redmine.org/projects/redmine/wiki/RedmineInstall
- Red Hat Enterprise Linux 9 documentation for DNF software management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Red Hat Enterprise Linux 9 documentation for PostgreSQL installation and service setup: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/index
- Red Hat Enterprise Linux 9 documentation for managing systemd services: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/index

## Issues Found
- The original post used placeholders such as `<package-name>`, `<service>`, and `<service-name>` instead of Redmine-specific packages, configuration files, and services. Replaced these with concrete RHEL 9 package installation, PostgreSQL initialization, Redmine download, and systemd commands.
- The original configuration path `/etc/<service>/config.conf` was not valid for Redmine. Replaced it with Redmine's `config/database.yml` configuration workflow.
- The original guide did not create a database, database role, application user, or Redmine application directory. Added the required PostgreSQL role/database setup and Redmine installation commands.
- The original guide did not run Redmine's required Bundler, secret token, migration, or default data tasks. Added the Redmine initialization commands from the official installation procedure.
- The original guide did not account for gem installation permissions when running Redmine as a dedicated system user. Added a local Bundler path under the Redmine application directory.
- The original service management commands referenced a nonexistent placeholder service. Added a `redmine.service` unit using Puma through `bundle exec rails server` and updated the enable/start/status/log commands accordingly.
- The original verification and troubleshooting commands used placeholders and could not validate Redmine. Updated them to check `redmine.service`, inspect Redmine logs, and confirm the application responds on `127.0.0.1:3000`.

## Review Notes
This guide now installs Redmine 5.1.12 because Redmine documents that branch as compatible with Ruby 3.0 and PostgreSQL versions newer than 9.2, matching the base RHEL 9 Ruby and PostgreSQL packages. Newer Redmine 6.x releases require newer Ruby and PostgreSQL versions, so a future update could add RHEL module stream instructions for Ruby 3.3 and PostgreSQL 16.
