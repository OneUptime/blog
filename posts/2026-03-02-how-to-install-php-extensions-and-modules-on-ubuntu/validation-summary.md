# Validation Summary: How to Install PHP Extensions and Modules on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PHP 8.3 (and 8.2)
- Ubuntu (apt, dpkg, apt-cache)
- PECL (PHP Extension Community Library)
- PHP-FPM
- Common PHP extensions: mysql, pgsql, sqlite3, mongodb, redis, memcached, gd, imagick, mbstring, xml, xmlrpc, curl, soap, zip, bz2, bcmath, gmp, intl
- OPcache (including JIT)
- Xdebug
- phpenmod / phpdismod tooling (Ubuntu/Debian PHP packaging)
- phpize / php-config build tooling

## Sources Consulted
- [PPA for PHP : Ondřej Surý](https://launchpad.net/~ondrej/+archive/ubuntu/php)
- [Ubuntu Packages — php8.3-openssl search](https://packages.ubuntu.com/search?keywords=php8.3-openssl&searchon=names&suite=all&section=all)
- [Ubuntu Packages — php8.3-iconv search](https://packages.ubuntu.com/search?keywords=php8.3-iconv&searchon=names&suite=all&section=all)
- [Ubuntu Packages — php8.3-mongodb search](https://packages.ubuntu.com/search?keywords=php8.3-mongodb&searchon=names&suite=all&section=all)
- [Ubuntu Packages — php8.3-xmlrpc search](https://packages.ubuntu.com/search?keywords=php8.3-xmlrpc&searchon=names&suite=all&section=all)
- [PHP: dl - Manual (extension API numbers)](https://www.php.net/manual/en/function.dl.php)
- [phpredis INSTALL docs](https://github.com/phpredis/phpredis/blob/develop/INSTALL.md)
- [phpredis configuration discussion (INI entries via `php --re redis`)](https://github.com/phpredis/phpredis/discussions/2066)

## Issues Found
1. **Non-existent `php8.3-openssl` package.** The post listed `sudo apt install php8.3-openssl -y` as a way to add SSL/TLS support. No such package exists in Ubuntu repos or the Ondrej PPA — OpenSSL is built into the core `php8.3-cli` / `php8.3-fpm` binaries. Replaced the command with an inline note clarifying that OpenSSL support comes built into the main PHP package.
2. **Non-existent `php8.3-iconv` package.** Similarly, the post recommended `sudo apt install php8.3-iconv -y`. No such standalone package exists; iconv is bundled into core PHP on Debian/Ubuntu. Replaced with a clarifying note.
3. **Wrong extension API directory for PHP 8.3.** The post used `/usr/lib/php/20220829` (which is the PHP **8.2** Zend module API number) in three places — the example output of `php-config8.3 --extension-dir`, the `ls *.so` command, and the `ldd` command. Updated all three to `/usr/lib/php/20230831`, which is the correct PHP 8.3 module API number.

## Review Notes
- `php8.3-mongodb`, `php8.3-xmlrpc`, `php8.3-imagick`, and the other apt packages listed are valid (mostly via the Ondrej PPA / `packages.sury.org`, which the post mentions).
- `redis.serializer` is a real phpredis INI entry (visible via `php --re redis | grep Entry`), so the Redis configuration snippet was kept as-is.
- The `opcache.jit=tracing` and `opcache.jit_buffer_size` settings are valid for PHP 8.0+.
- The PECL `imagick-beta` syntax (stability suffix) is valid PECL syntax for fetching the latest beta release.
- `phpize8.3` and `php-config8.3` are the version-suffixed wrappers shipped by the Ondrej packaging — both correct.
- Minor wording polish was not in scope; only technical errors were corrected.
