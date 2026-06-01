# Validation Summary: How to Set Up WordPress on EC2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2
- Amazon Linux 2023
- Apache HTTP Server
- PHP and OPcache
- WordPress
- MariaDB
- Redis
- WP-CLI
- Certbot / Let's Encrypt
- AWS CLI and S3

## Sources Consulted
- Amazon Linux 2023 LAMP tutorial: https://docs.aws.amazon.com/linux/al2023/ug/ec2-lamp-amazon-linux-2023.html
- Amazon Linux 2023 PHP documentation: https://docs.aws.amazon.com/linux/al2023/ug/php.html
- Amazon Linux 2023 package list: https://docs.aws.amazon.com/linux/al2023/release-notes/all-packages-AL2023.11.html
- AWS CLI `run-instances` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI security group ingress documentation: https://docs.aws.amazon.com/cli/latest/userguide/cli-services-ec2-sg.html
- WordPress hosting requirements: https://wordpress.org/about/requirements/
- Apache HTTP Server 2.4 authorization documentation: https://httpd.apache.org/docs/2.4/howto/auth.html
- Apache HTTP Server 2.4 upgrade documentation: https://httpd.apache.org/docs/current/en/upgrading.html
- PHP OPcache runtime configuration: https://www.php.net/manual/en/opcache.configuration.php
- MariaDB `mariadb-secure-installation` documentation: https://mariadb.com/docs/server/clients-and-utilities/deployment-tools/mariadb-secure-installation
- MariaDB `mariadb-dump` documentation: https://mariadb.com/kb/en/mysqldump-options/
- MariaDB query cache documentation: https://mariadb.com/kb/en/query-cache/
- WP-CLI command documentation: https://wpcli.dev/docs/cli

## Issues Found
- The LAMP install commands used older/generic AL2023 package names, including `mariadb105-server`, generic `php-*` packages, and `php-imagick`. Updated them to current AL2023 package names using MariaDB 11.4 and PHP 8.4 packages available in the official AL2023 package list.
- The post said WordPress needs "MySQL" while installing MariaDB. Clarified that WordPress needs MariaDB or MySQL.
- The database setup used legacy MariaDB command names (`mysql_secure_installation`, `mysql`) after switching to current MariaDB packages. Updated them to `mariadb-secure-installation` and `mariadb`.
- The WordPress salt command fetched salts into `SALT_KEYS` but never wrote them into `wp-config.php`. Replaced it with commands that insert the generated WordPress.org salt constants into the config file.
- Several examples used `sudo cat > /root-owned/path`, which does not make shell redirection run as root. Replaced those with `sudo tee ... > /dev/null`.
- The PHP OPcache snippet included `opcache.fast_shutdown`, which PHP removed in 7.2. Removed the obsolete directive.
- The backup script used `mysqldump`; current MariaDB documentation uses `mariadb-dump` and notes the legacy name is deprecated. Updated the script accordingly.
- The backup script block showed script contents but did not actually create or mark `/usr/local/bin/backup-wordpress.sh` executable. Updated it to create the file with `sudo tee` and apply executable permissions.
- The `.htaccess` hardening rules used Apache 2.2 `order allow,deny` / `deny from all` syntax. Updated them to Apache 2.4 `Require all denied`.
- `wp-config.php` was copied with `sudo`, which can leave it owned by root. Added an ownership fix so the later `chmod 600` still leaves the file readable by Apache.

## Review Notes
- Opening SSH to `0.0.0.0/0` is valid AWS CLI syntax, but production guides should normally restrict SSH to a trusted source CIDR or use AWS Systems Manager Session Manager.
- The MariaDB query cache settings are accepted by MariaDB, but query cache effectiveness is workload-dependent and should be benchmarked before using on busy production sites.
