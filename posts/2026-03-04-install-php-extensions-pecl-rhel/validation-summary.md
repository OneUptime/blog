# Validation Summary: How to Install PHP Extensions Using PECL on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- PHP
- PECL
- PEAR command-line tooling
- PHP extensions
- PHP-FPM
- DNF

## Sources Consulted
- PHP Manual: Installation of PECL extensions - https://www.php.net/manual/en/install.pecl.php
- PHP Manual: Compiling shared PECL extensions with the pecl command - https://www.php.net/manual/en/install.pecl.pear.php
- PHP Manual: Compiling shared PECL extensions with phpize - https://www.php.net/manual/en/install.pecl.phpize.php
- PHP Manual: Installing from packages on GNU/Linux distributions that use DNF - https://www.php.net/manual/en/install.unix.dnf.php
- PEAR Manual: Command list - https://pear.php.net/manual/en/guide.users.commandline.commands.php
- PECL package page: redis - https://pecl.php.net/package/redis
- PECL package page: imagick - https://pecl.php.net/package/imagick
- PECL package page: gRPC - https://pecl.php.net/package/gRPC
- Red Hat Enterprise Linux 9 documentation: Installing and using dynamic programming languages - https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages
- Red Hat Enterprise Linux 8 Package Manifest - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/package_manifest/package_manifest
- Google Cloud PHP gRPC installation guidance - https://docs.cloud.google.com/php/grpc

## Issues Found
- The Search for Extensions section described `pecl remote-info redis` as showing available versions of an extension. The PEAR command list defines `remote-info` as showing information about remote packages, and the PECL package page is the source that lists available release versions. Changed the comment to "Show remote package information" so it matches the command behavior.

## Review Notes
- The PECL install, specific-version install, extension enabling via `extension=name.so`, and phpize/manual build flow match the PHP manual.
- The prerequisite packages are appropriate for RHEL-family systems using DNF: `php-devel` supplies PHP build headers and phpize, `php-pear` supplies PEAR/PECL tooling, and the listed compiler/build tools are required for source builds.
- Restarting `php-fpm` is correct for PHP-FPM deployments. Systems using a different PHP SAPI may need to restart that service instead.
