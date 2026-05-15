# Validation Summary: How to Configure OPcache for PHP Performance on RHEL

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- RHEL
- PHP
- PHP-FPM
- OPcache
- DNF
- systemd

## Sources Consulted
- PHP Manual: OPcache runtime configuration - https://www.php.net/manual/en/opcache.configuration.php
- PHP Manual: opcache_get_status - https://www.php.net/manual/en/function.opcache-get-status.php
- PHP Manual: opcache_reset - https://www.php.net/manual/en/function.opcache-reset.php
- Red Hat Enterprise Linux 9 documentation: Installing and using dynamic programming languages - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages/installing_and_using_dynamic_programming_languages

## Issues Found
- The post said OPcache "typically ships with PHP" without noting RHEL's package split. Changed the wording to clarify that OPcache is bundled with PHP upstream but may be installed separately as `php-opcache` on RHEL.
- The `opcache.enable_cli=0` setting was described as enabling OPcache for CLI scripts. Updated the comments to state that CLI OPcache is disabled by default and should be enabled only for CLI workers that benefit from it.
- The `opcache.revalidate_freq=0` comments implied that this setting causes production deployments to require manual restarts. Updated the comments to match PHP's documented behavior: `0` checks on every request when timestamp validation is enabled, and the setting is ignored when `opcache.validate_timestamps=0`.
- The CLI verification command used `opcache_get_status()` while the sample configuration disabled CLI OPcache. Updated it to enable CLI OPcache for that one PHP process and pass `false` to avoid dumping per-script status details.
- The deployment reset example used `systemctl reload php-fpm` while describing a restart. Changed it to `systemctl restart php-fpm` and clarified that `opcache_reset()` should be called from PHP code served by PHP-FPM, not assumed to reset the FPM cache from an unrelated CLI process.
- The final sentence claimed a specific 50-70% page-load reduction. Replaced it with a general performance improvement statement because that exact percentage is workload-dependent and was not supported by the official documentation consulted.

## Review Notes
PHP is not installed in the review workspace, so the examples could not be executed locally. The PHP snippets and OPcache directives were reviewed against the PHP manual, and the RHEL package/service guidance was checked against Red Hat documentation. The JIT and huge page settings are valid OPcache directives, but production benefit depends heavily on workload and operating system configuration.
