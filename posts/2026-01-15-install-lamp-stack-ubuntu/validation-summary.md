# Validation Summary: How to Install a LAMP Stack (Linux, Apache, MySQL, PHP) on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Ubuntu (22.04 / 24.04 LTS)
- Apache2 web server
- MySQL Server (8.0)
- PHP (8.1 on 22.04 / 8.3 on 24.04) with libapache2-mod-php
- UFW firewall
- mysqli (PHP MySQL driver)
- Apache virtual hosts, mod_rewrite

## Sources Consulted
- Ubuntu Server documentation — Apache HTTP Server: https://documentation.ubuntu.com/server/how-to/web-servers/install-apache2/
- Ubuntu Server documentation — MySQL: https://documentation.ubuntu.com/server/how-to/databases/install-mysql/
- MySQL 8.0 Reference Manual — mysql_secure_installation: https://dev.mysql.com/doc/refman/8.0/en/mysql-secure-installation.html
- MySQL 8.0 Reference Manual — CREATE USER / GRANT: https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- PHP Manual — mysqli class and phpinfo(): https://www.php.net/manual/en/book.mysqli.php / https://www.php.net/manual/en/function.phpinfo.php
- Apache HTTP Server 2.4 Documentation — VirtualHost / DirectoryIndex: https://httpd.apache.org/docs/2.4/
- UFW manual / Ubuntu UFW application profiles (Apache, Apache Full, Apache Secure)

## Issues Found
No technical issues found.

## Review Notes
- The UFW application profiles (`Apache`, `Apache Full`, `Apache Secure`) are installed by the `apache2` package; `"Apache Full"` correctly opens both ports 80 and 443. Accurate.
- `sudo mysql` (without a password) works on a fresh Ubuntu MySQL 8.0 install because the root account uses the `auth_socket` authentication plugin by default. The post relies on this correctly.
- The `DirectoryIndex` reordering to place `index.php` first matches Apache's default `dir.conf` entry and is the standard approach.
- The PHP version references in the troubleshooting section (`php8.1` / `php8.3`) align with the default PHP versions shipped in Ubuntu 22.04 and 24.04 respectively.
- Security guidance is sound: removing `info.php`/`db_test.php` after testing, creating a dedicated non-root MySQL user, `ServerTokens Prod`, and `Options -Indexes` are all valid hardening steps.
- Minor (non-blocking) future improvement: the db_test.php example connects as `root`; the post already advises against using root for applications in Step 7, so pointing the test script at `myapp_user` would be more consistent, but this is a stylistic suggestion, not a technical error.
