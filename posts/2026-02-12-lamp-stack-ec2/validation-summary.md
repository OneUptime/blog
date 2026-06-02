# Validation Summary: How to Set Up a LAMP Stack on EC2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2
- Amazon Linux 2023
- AWS CLI
- Apache HTTP Server
- MariaDB
- PHP and PHP-FPM
- Certbot / Let's Encrypt
- Linux shell, systemd, cron, and backups

## Sources Consulted
- AWS: Tutorial: Install a LAMP server on AL2023 - https://docs.aws.amazon.com/linux/al2023/ug/ec2-lamp-amazon-linux-2023.html
- AWS CLI: ec2 run-instances command reference - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI: ec2 authorize-security-group-ingress command reference - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- Amazon Linux 2023 package list - https://docs.aws.amazon.com/linux/al2023/release-notes/all-packages-AL2023.11.html
- Amazon Linux 2023 PHP documentation - https://docs.aws.amazon.com/linux/al2023/ug/php.html
- MariaDB 10.11 release notes and maintenance status - https://mariadb.com/kb/en/changes-improvements-in-mariadb-1011/
- MariaDB query cache documentation - https://mariadb.com/docs/server/ha-and-performance/optimization-and-tuning/buffers-caches-and-threads/query-cache
- PHP OPcache runtime configuration - https://www.php.net/manual/en/opcache.configuration.php
- Apache HTTP Server 2.4 virtual host documentation - https://httpd.apache.org/docs/2.4/vhosts/
- Apache HTTP Server 2.4 configuration sections documentation - https://httpd.apache.org/docs/2.4/sections.html

## Issues Found
- The post recommended `mariadb105-server`. MariaDB 10.5 is no longer a maintained upstream release, so the command was updated to `mariadb1011-server`, a maintained LTS version available in Amazon Linux 2023.
- The MariaDB description claimed MariaDB is a fully compatible drop-in replacement for MySQL. This was softened to say it is a community-developed fork that works with many MySQL clients and applications, which avoids overstating compatibility.
- The PHP install command included packages that are not appropriate as standalone AL2023 package names in the current package set (`php-json`, `php-curl`). The command was narrowed to PHP, MySQL/PDO-related, common extension, OPcache, zip, intl, and PHP-FPM packages.
- The PHP section said to restart Apache to load the PHP module. On AL2023's documented LAMP setup, PHP-FPM is used, so the post now starts/enables `php-fpm` and restarts Apache.
- Several root-owned file creation snippets used `sudo cat > file`, but shell redirection would still run as the unprivileged user. These were changed to `sudo tee ... > /dev/null << 'EOF'`.
- The OPcache configuration included `opcache.fast_shutdown`, which PHP removed in 7.2.0. The directive was removed.
- After changing PHP settings, the post restarted only Apache. It now restarts PHP-FPM as well.
- The MariaDB query cache comment was overly broad. It now says the query cache is optional for cacheable, read-heavy workloads.
- The Certbot renewal wording said it always sets up a cron job. This was changed to a scheduled renewal task, since modern installations may use systemd timers instead of cron.
- The backup cron example did not make the backup script executable before scheduling it. A `sudo chmod +x /usr/local/bin/backup-db.sh` step was added.
- The EC2 sizing guidance called `t3.small` a starting point for small to medium sites. This was narrowed to small sites because 2 GB RAM is too broad to recommend for medium production workloads without more context.

## Review Notes
The AWS CLI examples use placeholder VPC, subnet, AMI, key, and security group IDs, so they are syntactically valid examples but must be replaced with region- and account-specific values before use. The SSH rule still allows `0.0.0.0/0`; it works technically, but should be restricted to a trusted source IP range in a production hardening pass.
