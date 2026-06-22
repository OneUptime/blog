# Validation Summary: How to Install and Configure PHP-FPM on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (installation, configuration, and optimization walkthrough)

## Technologies Covered
- PHP 8.3 / 8.2 / 8.1 (PHP-FPM, FastCGI Process Manager)
- Ubuntu (APT, Ondrej Sury PPA, `update-alternatives`, systemd)
- Nginx (FastCGI integration via Unix sockets)
- Apache (mod_proxy_fcgi integration)
- OPcache and JIT compilation
- PHP-FPM pool/process manager configuration (static, dynamic, ondemand)
- Bash monitoring/diagnostic scripts, logrotate

## Sources Consulted
- PHP-FPM configuration manual — https://www.php.net/manual/en/install.fpm.configuration.php
- PHP runtime configuration directives — https://www.php.net/manual/en/ini.list.php
- OPcache configuration — https://www.php.net/manual/en/opcache.configuration.php
- OPcache JIT documentation — https://www.php.net/manual/en/opcache.configuration.php#ini.opcache.jit
- `opcache_get_status()` — https://www.php.net/manual/en/function.opcache-get-status.php
- magic_quotes removal history — https://www.php.net/manual/en/migration54.removed-ext-and-sapis.php (removed in PHP 5.4.0)
- Ondrej Sury PHP PPA — https://launchpad.net/~ondrej/+archive/ubuntu/php
- Nginx `ngx_http_fastcgi_module` — https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- Apache mod_proxy_fcgi — https://httpd.apache.org/docs/2.4/mod/mod_proxy_fcgi.html

## Issues Found
- **Inaccurate `magic_quotes_gpc` removal version (comment, php.ini security section).** The post stated `magic_quotes_gpc is removed in PHP 8.0+`. `magic_quotes_gpc` was actually removed in PHP 5.4.0 and has not existed for years; it is unrelated to PHP 8.0. Corrected the comment to `magic_quotes_gpc was removed in PHP 5.4+ (not present in PHP 8)`.

## Review Notes
- Package names, the Ondrej Sury PPA workflow, `update-alternatives` usage, and systemd service names (`php8.3-fpm`) are all correct for current Ubuntu releases.
- Pool directives (`pm`, `pm.max_children`, `pm.start_servers`, `pm.min/max_spare_servers`, `pm.max_requests`, `pm.process_idle_timeout`, `listen.backlog`, `request_terminate_timeout`, access/slow log formats) are valid and the access-log format tokens (`%R`, `%{mili}d`, `%{kilo}M`, etc.) are correct.
- `php_admin_value[disable_functions]` / `open_basedir` in pool configs are valid — PHP-FPM applies these `PHP_INI_SYSTEM` directives at pool startup.
- OPcache directives, including `opcache.jit = 1255`, `opcache.jit_buffer_size`, `opcache.file_cache`, `opcache.file_cache_consistency_checks`, `opcache.interned_strings_buffer`, and `opcache.optimization_level = 0x7FFEBFFF`, are all real and accurate for PHP 8.x.
- The `opcache_get_status()` JSON fields referenced in the monitoring script (`opcache_hit_rate`, `current_wasted_percentage`, `blacklist_misses`, `num_cached_scripts`, `jit`) are correct.
- Nginx and Apache integration blocks (try_files guard, `fastcgi_split_path_info`, `SetHandler "proxy:unix:...|fcgi://localhost"`, `a2enmod proxy_fcgi`) are correct best practice.
- Minor non-error consistency note for future polish: the custom `myapp` pool uses `pm.start_servers = 5` while the later tuning guideline suggests `start_servers = (min_spare + max_spare) / 2` (which would be 20). Both are valid; not changed.
- Setting `session.cookie_secure = 1` globally requires HTTPS; this is a reasonable production default but would break sessions on plain HTTP — worth a caveat for readers testing locally. Left as-is since it is a security recommendation, not an error.
