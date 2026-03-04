# How to Upgrade PHP from 7.4 to 8.x on RHEL Without Breaking Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PHP, Upgrade, Migration, Web Development, Linux

Description: Safely upgrade PHP from 7.4 to 8.x on RHEL by testing compatibility, handling deprecations, and performing the switch with minimal downtime.

---

Upgrading PHP from 7.4 to 8.x brings performance improvements and new features but also introduces breaking changes. This guide covers a safe migration path on RHEL.

## Pre-Upgrade Checklist

```bash
# Check current PHP version and extensions
php -v
php -m > /tmp/php74-modules.txt

# Back up PHP configuration
sudo cp -r /etc/php.d /etc/php.d.bak
sudo cp /etc/php.ini /etc/php.ini.bak

# Back up PHP-FPM pool configs
sudo cp -r /etc/php-fpm.d /etc/php-fpm.d.bak
```

## Test Compatibility Before Upgrading

```bash
# Install PHP 8.2 alongside 7.4 using Remi (does not replace 7.4)
sudo dnf install -y php82-php-cli php82-php-mysqlnd php82-php-xml \
  php82-php-mbstring php82-php-curl

# Run your application's test suite with PHP 8.2
cd /var/www/myapp
php82 vendor/bin/phpunit

# Use PHPStan or Psalm for static analysis
php82 vendor/bin/phpstan analyse src/ --level=5
```

## Common Breaking Changes to Fix

Key changes from PHP 7.4 to 8.x:

```php
<?php
// 1. Named arguments (new feature, but can break if you have
//    functions with parameters named like reserved words)

// 2. Union types now enforced strictly
// Old: function foo($bar) -- accepted anything
// New: function foo(string|int $bar) -- type checked

// 3. str_contains/str_starts_with/str_ends_with replace strpos hacks
// Old:
if (strpos($haystack, $needle) !== false) { }
// New:
if (str_contains($haystack, $needle)) { }

// 4. match expression replaces switch in many cases
// 5. Null-safe operator ?->
// 6. Many functions now throw TypeError instead of returning false
```

## Perform the Upgrade

```bash
# Stop PHP-FPM
sudo systemctl stop php-fpm

# Reset and switch the PHP module stream
sudo dnf module reset php -y
sudo dnf module enable php:remi-8.2 -y

# Remove old PHP packages and install new ones
sudo dnf swap php-\* php-\* --allowerasing -y

# Or more explicitly:
sudo dnf remove -y php php-cli php-common php-fpm
sudo dnf install -y php php-cli php-common php-fpm php-mysqlnd \
  php-xml php-mbstring php-curl php-zip php-gd php-intl \
  php-bcmath php-opcache

# Compare installed modules with the saved list
php -m > /tmp/php82-modules.txt
diff /tmp/php74-modules.txt /tmp/php82-modules.txt
```

## Restore Configuration

```bash
# Review and merge your PHP configuration changes
# Do not blindly copy 7.4 configs as some directives changed
diff /etc/php.ini /etc/php.ini.bak

# Restore PHP-FPM pool settings (these are usually compatible)
sudo cp /etc/php-fpm.d.bak/www.conf /etc/php-fpm.d/www.conf

# Start PHP-FPM
sudo systemctl start php-fpm

# Verify
php -v
sudo systemctl status php-fpm
```

## Post-Upgrade Verification

```bash
# Test your web application
curl -s -o /dev/null -w "%{http_code}" http://localhost

# Check PHP error log for deprecation notices
sudo tail -f /var/log/php-fpm/www-error.log

# Run your test suite
cd /var/www/myapp && php vendor/bin/phpunit
```

If issues arise, you can quickly switch back by enabling the PHP 7.4 module stream and reinstalling the old packages.
