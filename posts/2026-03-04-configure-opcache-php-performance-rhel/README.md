# How to Configure OPcache for PHP Performance on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PHP, OPcache, Performance, Optimization, Linux

Description: Boost PHP application performance on RHEL by configuring OPcache to cache compiled bytecode, reducing repeated script parsing and compilation overhead.

---

OPcache stores precompiled PHP bytecode in shared memory, eliminating the need to parse and compile scripts on every request. Proper tuning can dramatically improve PHP performance on RHEL.

## Install OPcache

OPcache typically ships with PHP. Verify it is installed:

```bash
# Check if OPcache is loaded
php -m | grep -i opcache

# If not installed, install it
sudo dnf install -y php-opcache

# Restart PHP-FPM
sudo systemctl restart php-fpm
```

## Configure OPcache

Edit the OPcache configuration file:

```bash
sudo tee /etc/php.d/10-opcache.ini << 'INI'
[opcache]
; Enable OPcache
opcache.enable=1

; Enable for CLI scripts (useful for long-running workers)
opcache.enable_cli=0

; Memory allocated for storing cached scripts (MB)
; Increase for large applications with many files
opcache.memory_consumption=256

; Memory for interned strings (MB)
opcache.interned_strings_buffer=16

; Maximum number of PHP files that can be cached
; Use: find /var/www -name "*.php" | wc -l to estimate
opcache.max_accelerated_files=20000

; How often to check for file changes (seconds)
; Set to 0 in production (requires manual restart for changes)
; Set to 2 in development
opcache.revalidate_freq=0

; Validate file timestamps (disable in production for best performance)
opcache.validate_timestamps=0

; Save compiled scripts to disk for faster restarts
opcache.file_cache=/tmp/opcache

; Enable huge pages for better performance (if available)
opcache.huge_code_pages=1

; JIT compilation (PHP 8.0+)
opcache.jit=1255
opcache.jit_buffer_size=128M
INI
```

## Apply and Verify

```bash
# Restart PHP-FPM to apply changes
sudo systemctl restart php-fpm

# Verify OPcache is active
php -i | grep -A 20 "opcache"

# Check OPcache status via CLI
php -r "var_dump(opcache_get_status());" | head -30
```

## Monitor OPcache

Create a simple status page:

```php
<?php
// /var/www/html/opcache-status.php
// Restrict access in production!
$status = opcache_get_status();

echo "Memory Used: " . round($status['memory_usage']['used_memory'] / 1048576, 2) . " MB\n";
echo "Memory Free: " . round($status['memory_usage']['free_memory'] / 1048576, 2) . " MB\n";
echo "Cached Scripts: " . $status['opcache_statistics']['num_cached_scripts'] . "\n";
echo "Hit Rate: " . round($status['opcache_statistics']['opcache_hit_rate'], 2) . "%\n";
echo "Misses: " . $status['opcache_statistics']['misses'] . "\n";
```

## Reset OPcache After Deployments

Since we disabled timestamp validation for production, you must reset OPcache after deploying new code:

```bash
# Restart PHP-FPM (clears OPcache)
sudo systemctl reload php-fpm

# Or reset via PHP function in your deploy script
php -r "opcache_reset();"
```

A properly configured OPcache can reduce page load times by 50-70% for PHP applications by eliminating redundant compilation work.
