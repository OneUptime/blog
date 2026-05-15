# Validation Summary: How to Configure PHP-FPM Pool Tuning for High-Traffic Sites on RHEL

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Red Hat Enterprise Linux
- PHP-FPM
- Nginx FastCGI configuration
- systemd
- Linux process and memory monitoring

## Sources Consulted
- PHP manual: FPM configuration directives - https://www.php.net/manual/en/install.fpm.configuration.php
- PHP manual: FPM status page - https://www.php.net/manual/en/fpm.status.php
- Nginx official documentation: ngx_http_fastcgi_module - https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- Nginx official documentation: ngx_http_access_module - https://nginx.org/en/docs/http/ngx_http_access_module.html
- Red Hat documentation: Using PHP with web servers on RHEL - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/installing_and_using_dynamic_programming_languages/installing_and_using_dynamic_programming_languages
- Local procps help output for `ps` and `free`

## Issues Found
- The original PHP-FPM worker memory command used `ps -ylC php-fpm --sort:rss | awk '{sum += $8; n++}'`, which included the header row in the average and could include the PHP-FPM master process even though the text described worker memory. Changed it to use explicit `ps` output columns and average only process titles matching PHP-FPM pool workers.
- The status page snippet showed `pm.status_path` and `ping.path` as commented shell lines inside a Bash block. Since these must be active PHP-FPM pool directives, changed that part to an `ini` snippet with uncommented settings.

## Review Notes
- The PHP-FPM pool directives (`pm`, `pm.max_children`, `pm.start_servers`, `pm.min_spare_servers`, `pm.max_spare_servers`, `pm.max_requests`, `request_terminate_timeout`, `slowlog`, and `request_slowlog_timeout`) match current PHP-FPM documentation.
- The Nginx `fastcgi_pass`, `fastcgi_param`, `allow`, and `deny` directives are valid in the shown contexts. The `/run/php-fpm/www.sock` path and `/etc/php-fpm.d/www.conf` pool file align with common RHEL PHP-FPM packaging, but deployments should still confirm the pool `listen` value on their host.
