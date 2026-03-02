# How to Install PHP Extensions and Modules on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, PHP, Extensions, Web Server

Description: Install PHP extensions and modules on Ubuntu using apt, PECL, and manual compilation, including common extensions for databases, caching, and image processing.

---

A base PHP installation is minimal by design. Most practical applications need additional extensions for database connectivity, image manipulation, caching, cryptography, or XML processing. Ubuntu provides many extensions as pre-built packages, while others require installation via PECL or manual compilation.

## Finding Available Extensions

Before installing, find what is available:

```bash
# Search for PHP 8.3 extensions in the package manager
apt-cache search php8.3 | grep "^php8.3-" | sort

# Search for any PHP package
apt-cache search php | grep -i extension | head -30

# Check what's already installed
dpkg -l | grep "php8.3"

# See what extensions PHP currently loads
php -m

# Get detailed information about a specific extension package
apt-cache show php8.3-redis
```

## Installing Extensions via apt

The simplest method - packages from the Ubuntu repositories or Ondrej PPA are pre-compiled and tested:

```bash
# Database extensions
sudo apt install php8.3-mysql -y     # MySQL and MariaDB (PDO + mysqli)
sudo apt install php8.3-pgsql -y     # PostgreSQL (PDO + native)
sudo apt install php8.3-sqlite3 -y   # SQLite
sudo apt install php8.3-mongodb -y   # MongoDB (from PPA)

# Caching extensions
sudo apt install php8.3-redis -y     # Redis
sudo apt install php8.3-memcached -y # Memcached

# Image processing
sudo apt install php8.3-gd -y        # GD library (basic images)
sudo apt install php8.3-imagick -y   # ImageMagick (more powerful)

# String and encoding
sudo apt install php8.3-mbstring -y  # Multibyte string functions
sudo apt install php8.3-iconv -y     # Character encoding conversion

# XML and data formats
sudo apt install php8.3-xml -y       # XML parsing and generation
sudo apt install php8.3-xmlrpc -y    # XML-RPC protocol

# Network and cryptography
sudo apt install php8.3-curl -y      # HTTP client
sudo apt install php8.3-soap -y      # SOAP web services
sudo apt install php8.3-openssl -y   # SSL/TLS (usually compiled in)

# Compression
sudo apt install php8.3-zip -y       # ZIP file support
sudo apt install php8.3-bz2 -y       # bzip2 compression

# Math
sudo apt install php8.3-bcmath -y    # Arbitrary precision math
sudo apt install php8.3-gmp -y       # GNU Multiple Precision arithmetic

# Internationalization
sudo apt install php8.3-intl -y      # Internationalization support
```

After installing extensions, reload PHP-FPM:

```bash
sudo systemctl reload php8.3-fpm
```

## Verifying Extension Installation

```bash
# Check if a specific extension is loaded
php -m | grep redis
php -m | grep -i imagick

# Get detailed extension information
php -r "echo phpversion('redis') . PHP_EOL;"
php -r "print_r(gd_info());"

# Check extension is loaded in FPM (not just CLI)
# Create a quick test
php -r "var_dump(extension_loaded('redis'));"
```

## Installing Extensions via PECL

PECL (PHP Extension Community Library) hosts extensions not in the standard repositories. Install the PECL tool first:

```bash
# Install build tools and PECL
sudo apt install php8.3-dev php-pear build-essential -y

# Install an extension via PECL
sudo pecl install swoole

# Install a specific version
sudo pecl install redis-6.0.2

# Install a beta version
sudo pecl install imagick-beta
```

After PECL installs the extension, enable it:

```bash
# PECL usually tells you the .so file name
# Enable it by creating a config file
echo "extension=swoole.so" | sudo tee /etc/php/8.3/mods-available/swoole.ini

# Enable for all SAPIs (CLI, FPM, Apache)
sudo phpenmod -v 8.3 swoole

# Or enable only for FPM
sudo phpenmod -v 8.3 -s fpm swoole

# Verify
php -m | grep swoole
```

## Installing Extensions by Compiling from Source

For extensions not in PECL or when you need a specific build:

```bash
# Example: installing a custom extension from source

# Install build dependencies
sudo apt install php8.3-dev build-essential autoconf -y

# Download the extension source
wget https://github.com/example/php-extension/archive/refs/tags/v1.0.tar.gz
tar xzf v1.0.tar.gz
cd php-extension-1.0

# Prepare the build
phpize8.3

# Configure, compile, and install
./configure --with-php-config=/usr/bin/php-config8.3
make
sudo make install

# The .so file is now in the PHP extension directory
php-config8.3 --extension-dir
# Example output: /usr/lib/php/20220829

# Enable the extension
echo "extension=your_extension.so" | sudo tee /etc/php/8.3/mods-available/your_extension.ini
sudo phpenmod -v 8.3 your_extension
```

## Common Extension Configuration

Some extensions need configuration beyond just installing:

**Redis:**
```ini
; /etc/php/8.3/mods-available/redis.ini
extension=redis.so

; Optional: set default serializer
redis.serializer = php
```

**OPcache (usually installed but may need configuration):**
```ini
; /etc/php/8.3/mods-available/opcache.ini
zend_extension=opcache.so
opcache.enable=1
opcache.memory_consumption=128
opcache.max_accelerated_files=10000
opcache.revalidate_freq=2
opcache.jit=tracing
opcache.jit_buffer_size=64M
```

**Xdebug (for development only):**
```bash
sudo apt install php8.3-xdebug -y
```

```ini
; /etc/php/8.3/mods-available/xdebug.ini
zend_extension=xdebug.so
xdebug.mode=debug
xdebug.start_with_request=yes
xdebug.client_host=127.0.0.1
xdebug.client_port=9003
```

**Never enable Xdebug in production - it significantly slows PHP.**

## Enabling and Disabling Extensions

Ubuntu's PHP packaging provides convenient tools:

```bash
# Enable an extension for all SAPIs
sudo phpenmod -v 8.3 redis

# Enable for FPM only
sudo phpenmod -v 8.3 -s fpm redis

# Enable for CLI only
sudo phpenmod -v 8.3 -s cli redis

# Disable an extension
sudo phpdismod -v 8.3 xdebug

# Check which SAPIs an extension is enabled for
ls /etc/php/8.3/*/conf.d/ | grep redis
```

## Extension Management for Multiple PHP Versions

Install the same extension for multiple versions:

```bash
# Install Redis for both PHP 8.2 and 8.3
sudo apt install php8.2-redis php8.3-redis -y

# Install imagick for PHP 8.2 only
sudo apt install php8.2-imagick -y

# Reload FPM for both versions
sudo systemctl reload php8.2-fpm
sudo systemctl reload php8.3-fpm
```

## Listing Extension Files

```bash
# Find where extensions are stored
php-config8.3 --extension-dir

# List all .so files in the extension directory
ls /usr/lib/php/20220829/*.so

# Check which extensions are configured
ls /etc/php/8.3/mods-available/

# Check which are enabled for FPM
ls /etc/php/8.3/fpm/conf.d/
```

## Troubleshooting Extension Issues

```bash
# Extension not loading - check for dependency errors
php -r "extension_loaded('imagick');" 2>&1

# Check PHP error log
sudo tail -f /var/log/php8.3-fpm.log

# Run PHP with verbose output
php --no-php-ini -d error_reporting=E_ALL -r "extension_loaded('redis');" 2>&1

# Check for missing shared libraries
ldd /usr/lib/php/20220829/redis.so
```

A good practice is to only install extensions your application actually uses. Each loaded extension adds to PHP's startup time and memory usage, so keeping the extension list lean results in faster, more resource-efficient PHP processes.
