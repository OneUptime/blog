# Validation Summary: How to Install a LEMP Stack (Linux, Nginx, MySQL, PHP) on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- Ubuntu (20.04, 22.04, 24.04 LTS)
- Nginx
- MySQL (8.0)
- PHP 8.3 / PHP-FPM
- UFW firewall
- Certbot / Let's Encrypt
- OPcache
- phpMyAdmin
- Composer / Laravel (deployment example)

## Sources Consulted
- Nginx documentation — https://nginx.org/en/docs/
- MySQL 8.0 Reference Manual (mysql_secure_installation, user/grant syntax, InnoDB tuning) — https://dev.mysql.com/doc/refman/8.0/en/
- PHP-FPM and php.ini documentation — https://www.php.net/manual/en/install.fpm.php
- Ubuntu package documentation for php-fpm, php-mysql, certbot, phpmyadmin
- Certbot / Let's Encrypt nginx plugin docs — https://certbot.eff.org/instructions
- phpMyAdmin on Nginx (Ubuntu) — DigitalOcean tutorial confirming the apt package only configures apache2/lighttpd, not nginx — https://www.digitalocean.com/community/tutorials/how-to-install-and-secure-phpmyadmin-with-nginx-on-an-ubuntu-20-04-server

## Issues Found
- **phpMyAdmin web server selection (incorrect instruction):** The post told readers to "Select nginx (press space, then Enter)" during `apt install phpmyadmin`. The phpMyAdmin Debian/Ubuntu package's debconf prompt only offers `apache2` and `lighttpd` — nginx is not a selectable option. Following the original instruction would mislead the reader. Fixed the comment to instruct leaving both unselected (TAB to `<Ok>`, then Enter) and relying on the manually created symlink to serve phpMyAdmin under Nginx.

## Review Notes
- PHP version is consistently referenced as 8.3, which is correct for Ubuntu 24.04. The post already notes "Adjust version number as needed," which appropriately covers 22.04 (PHP 8.1) and 20.04 (PHP 7.4) where socket/config paths differ.
- The Nginx site config has both `location ~ /\.ht` and a broader `location ~ /\.` block; the latter already covers `.ht*` files, so the first is redundant but not incorrect.
- `innodb_log_file_size` is deprecated in MySQL 8.0.30+ in favor of `innodb_redo_log_capacity`, but it still functions and is widely used; left as-is since it remains valid.
- Installing Certbot via apt (`certbot python3-certbot-nginx`) works on Ubuntu; the EFF currently recommends the snap package, but the apt path remains functional and is acceptable.
- Editing `/etc/php/8.3/fpm/conf.d/10-opcache.ini` works because it is a symlink to the mods-available file; settings take effect after restarting PHP-FPM. Correct as written.
- mysqli usage, GRANT/CREATE USER syntax, UFW `Nginx Full` profile, and PHP-FPM pool settings are all accurate.
