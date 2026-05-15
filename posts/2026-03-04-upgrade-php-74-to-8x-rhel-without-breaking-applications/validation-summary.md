# Validation Summary: How to Upgrade PHP from 7.4 to 8.x on RHEL Without Breaking Applications

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Red Hat Enterprise Linux 8/9
- DNF module streams
- Remi RPM repository
- PHP 7.4, PHP 8.x, PHP 8.2
- PHP-FPM
- PHPStan and PHPUnit

## Sources Consulted
- PHP manual, PHP 8.0 migration guide: https://www.php.net/manual/en/migration80.incompatible.php
- PHP manual, PHP 8.0 new features: https://www.php.net/manual/en/migration80.new-features.php
- PHP 8.0 release announcement: https://www.php.net/releases/8.0/en
- Red Hat Enterprise Linux 8 documentation, installing and using PHP and module streams: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_basic_system_settings/installing-and-using-dynamic-programming-languages_configuring-basic-system-settings
- Remi RPM repository, PHP 8.2 module stream and upgrade guidance: https://blog.remirepo.net/post/2023/04/19/Install-PHP-8.2-on-Fedora-RHEL-CentOS-Alma-Rocky-or-other-clone
- Remi RPM repository, PHP 8.2 Software Collection package behavior: https://blog.remirepo.net/post/2022/06/10/PHP-8.2-as-Software-Collection
- DNF5 distro-sync command reference: https://dnf5.readthedocs.io/en/latest/commands/distro-sync.8.html

## Issues Found
- The guide used Remi module streams and `php82-*` packages without stating that the commands apply to RHEL 8/9 with DNF and a configured Remi repository. I added that scope and a prerequisite note so the commands are reproducible.
- The `dnf distro-sync --allowerasing -y` command synchronized the whole system even though the surrounding text said to synchronize installed PHP packages. I restricted it to `'php*'` packages.
- The PHP-FPM restore step blindly copied an old pool file over the upgraded package configuration. I changed it to a diff/merge review step, matching the caution already given for `php.ini`.
- The rollback sentence implied PHP 7.4 would always be available. I qualified it as dependent on the configured repositories still providing PHP 7.4 packages.

## Review Notes
The PHP language examples and migration notes were consistent with the official PHP 8.0 migration documentation: named arguments affect `call_user_func_array()` associative-array handling, union types are runtime checked when declared, `str_contains()`/`str_starts_with()`/`str_ends_with()`, `match`, and the null-safe operator were introduced in PHP 8.0, and many invalid internal-function calls now raise exceptions such as `TypeError`, `ValueError`, or `ArgumentCountError`. The exact available PHP module streams and PHP 7.4 rollback path depend on the enabled RHEL and Remi repositories.
