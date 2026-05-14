# Validation Summary: How to Set Up WP-CLI for WordPress Management on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- WordPress
- WP-CLI
- PHP
- Bash
- Cron

## Sources Consulted
- WP-CLI installation handbook: https://make.wordpress.org/cli/handbook/guides/installing/
- WP-CLI command reference: https://developer.wordpress.org/cli/commands/
- `wp core update` command reference: https://developer.wordpress.org/cli/commands/core/update/
- `wp plugin` command reference: https://developer.wordpress.org/cli/commands/plugin/
- `wp user` command reference: https://developer.wordpress.org/cli/commands/user/
- `wp user create` command reference: https://developer.wordpress.org/cli/commands/user/create/
- `wp db` command reference: https://developer.wordpress.org/cli/commands/db/
- `wp search-replace` command reference: https://developer.wordpress.org/cli/commands/search-replace/
- `wp cache` command reference: https://developer.wordpress.org/cli/commands/cache/
- `wp cli update` command reference: https://developer.wordpress.org/cli/commands/cli/

## Issues Found
- The tab completion download URL was pinned to WP-CLI v2.9.0 while the installation section downloads the current Phar. Updated it to the current upstream completion script URL used by the WP-CLI project.
- The user management example said it created an admin user, but the command used `--role=editor`. Updated the comment to say "editor user" so it matches the command and WP-CLI role values.
- The cron automation snippet wrote directly to `/opt/wp-update.sh` and changed its mode without `sudo`, which would fail for a normal administrative user. Updated the snippet to use `sudo tee` and `sudo chmod`.
- The cron job runs as `apache` but redirects output to `/var/log/wp-update.log`; that user usually cannot create files directly in `/var/log`. Added commands to create the log file and assign it to `apache` before installing the cron entry.

## Review Notes
The WP-CLI command examples otherwise match the current command reference. In production, automated core, plugin, and theme updates should be paired with tested backups and a rollback process, but that is an operational caveat rather than a command correctness issue.
