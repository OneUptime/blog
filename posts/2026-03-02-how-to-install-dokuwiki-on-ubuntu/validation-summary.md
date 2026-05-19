# Validation Summary: How to Install DokuWiki on Ubuntu

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Ubuntu
- DokuWiki
- nginx
- PHP-FPM
- PHP extensions
- Let's Encrypt / Certbot
- DokuWiki plugins and file-based backups

## Sources Consulted
- DokuWiki installation guide: https://www.dokuwiki.org/install
- DokuWiki system requirements: https://www.dokuwiki.org/requirements
- DokuWiki PHP configuration and extensions: https://www.dokuwiki.org/install:php
- DokuWiki file permissions: https://www.dokuwiki.org/install:permissions
- DokuWiki nginx configuration: https://www.dokuwiki.org/install:nginx
- DokuWiki security guidance for nginx directory access: https://www.dokuwiki.org/security#deny_directory_access_in_nginx
- DokuWiki URL rewriting: https://www.dokuwiki.org/rewrite
- DokuWiki savedir setting: https://www.dokuwiki.org/config:savedir
- DokuWiki userewrite setting: https://www.dokuwiki.org/config:userewrite
- DokuWiki Extension Manager documentation: https://www.dokuwiki.org/plugin:extension
- DokuWiki Discussion plugin page: https://www.dokuwiki.org/plugin:discussion
- Certbot user guide for nginx plugin: https://eff-certbot.readthedocs.io/en/stable/using.html#nginx
- Ubuntu release information: https://releases.ubuntu.com/
- Ubuntu package listings for PHP packages: https://packages.ubuntu.com/

## Issues Found
- The prerequisites listed Ubuntu 20.04, whose standard support has ended. Updated the supported examples to Ubuntu 22.04 or 24.04, matching currently supported LTS releases and PHP package availability.
- The package install command omitted `php-bz2`, which DokuWiki recommends for archive handling and plugin installs. Added `php-bz2` and included `bz2` in the troubleshooting module check.
- The nginx hidden-file rule blocked `/.well-known`, which can interfere with ACME HTTP validation. Updated the rule to preserve access to `.well-known`, matching DokuWiki's nginx example.
- The nginx config denied `install.php` before the web installer could run. Commented that block in the initial config and clarified it should be enabled only after setup or replaced by deleting `install.php`.
- The manual plugin installation example used a stale GitHub URL for the Discussion plugin. Updated it to the current plugin repository URL from the official DokuWiki plugin page and corrected the extracted directory name.
- The plugin download example used `wget`, which was not installed earlier in the tutorial. Changed it to `curl`, which the tutorial already installs, and used the correct `-o` output-file option.

## Review Notes
The tutorial is now technically valid for a source-tarball DokuWiki install on Ubuntu with nginx and PHP-FPM. Future improvements could mention that the PHP-FPM socket path differs by Ubuntu release, for example PHP 8.1 on Ubuntu 22.04 and PHP 8.3 on Ubuntu 24.04, but the post already tells readers to verify the running PHP-FPM version before editing nginx.
