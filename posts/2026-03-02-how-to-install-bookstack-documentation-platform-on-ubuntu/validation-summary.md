# Validation Summary: How to Install BookStack Documentation Platform on Ubuntu

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Ubuntu 22.04 and 24.04
- BookStack
- PHP-FPM
- MariaDB / MySQL
- Nginx
- Composer
- LDAP
- Certbot / Let's Encrypt
- cron backups

## Sources Consulted
- BookStack installation documentation: https://www.bookstackapp.com/docs/admin/installation/
- BookStack update documentation: https://www.bookstackapp.com/docs/admin/updates/
- BookStack LDAP authentication documentation: https://www.bookstackapp.com/docs/admin/ldap-auth/
- BookStack email and webhooks documentation: https://www.bookstackapp.com/docs/admin/email-webhooks/
- BookStack backup and restore documentation: https://www.bookstackapp.com/docs/admin/backup-restore/
- BookStack file upload documentation: https://www.bookstackapp.com/docs/admin/upload-config/
- BookStack cache and session documentation: https://www.bookstackapp.com/docs/admin/cache-session-config/
- BookStack Markdown editor documentation: https://www.bookstackapp.com/docs/user/markdown-editor/
- BookStack roles and permissions documentation: https://www.bookstackapp.com/docs/user/roles-and-permissions/
- BookStack migration-to-Codeberg announcement: https://www.bookstackapp.com/blog/project-migrated-to-codeberg/
- Official BookStack Ubuntu install scripts: https://codeberg.org/bookstack/devops/src/branch/main/scripts/

## Issues Found
- Updated BookStack requirements from PHP 8.1+ and MySQL 5.7+ to PHP 8.2+ and MySQL 8.0+ or MariaDB 10.6+, matching current BookStack requirements.
- Changed the PHP package examples from PHP 8.2 to Ubuntu 24.04's PHP 8.3 packages and removed the non-existent `php8.2-tokenizer` package. The tokenizer extension is provided by the PHP package set rather than a separate Ubuntu package.
- Clarified the Ubuntu prerequisite because Ubuntu 22.04 needs a supported PHP 8.2+ package source for current BookStack releases.
- Replaced the GitHub clone URL with BookStack's currently recommended production Git mirror, `https://source.bookstackapp.com/bookstack.git`.
- Added Composer's root-user environment flag and `--no-plugins` to match the official BookStack install script behavior when Composer is run through `sudo`.
- Fixed the database connection mismatch by changing `DB_HOST=127.0.0.1` to `DB_HOST=localhost`, matching the created MariaDB user `'bookstack'@'localhost'`.
- Replaced the blank inline `APP_KEY` example with a placeholder generated key format so users do not overwrite the generated key with an empty value.
- Added `public/uploads` to writable paths and permission troubleshooting, since BookStack local image uploads are stored there by default.
- Updated PHP-FPM socket, service, logs, and `php.ini` paths from PHP 8.2 to PHP 8.3.
- Changed the Certbot flow from `certbot certonly --nginx` to standalone certificate issuance with Nginx stop/start hooks, since the enabled HTTPS server block references certificate files that do not exist until issuance succeeds.
- Updated LDAP user filter placeholders from `${user}` to `{user}`, which is the current documented placeholder format.
- Corrected the Markdown editor instructions: Markdown is switched per page from the editor draft status menu or set as the default for new pages in Settings > Customization, and users need the relevant role permission.
- Expanded backups to include both `public/uploads` and `storage/uploads`, plus `themes`, in line with BookStack backup guidance.
- Added `sudo` to backup script creation and chmod commands because `/usr/local/bin` is root-owned.
- Removed claims that the post configures Apache or social authentication, since the article only provides Nginx and LDAP setup.
- Clarified the hierarchy description to reflect that Books can contain both Chapters and Pages.

## Review Notes
The guide is technically valid after correction. For a future revision, consider adding a separate Ubuntu 22.04 package setup path or recommending the official BookStack installation script for fresh Ubuntu 22.04 systems, since the manual package block now targets Ubuntu 24.04 packages.
