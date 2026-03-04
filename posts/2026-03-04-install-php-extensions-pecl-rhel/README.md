# How to Install PHP Extensions Using PECL on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PHP, PECL, Extensions, Development, Linux

Description: Use PECL to compile and install PHP extensions on RHEL when the extension is not available as an RPM package or when you need a specific version.

---

PECL (PHP Extension Community Library) lets you compile and install PHP extensions from source. This is useful when an extension is not packaged in the RHEL or Remi repositories, or when you need a specific version.

## Install Prerequisites

```bash
# Install PHP development headers and build tools
sudo dnf install -y php-devel php-pear gcc make autoconf

# Verify PECL is available
pecl version
```

## Install an Extension with PECL

```bash
# Example: Install the Redis extension
sudo pecl install redis

# When prompted for options, press Enter to accept defaults
# Or pass options non-interactively
echo "" | sudo pecl install redis

# Enable the extension
echo "extension=redis.so" | sudo tee /etc/php.d/50-redis.ini

# Restart PHP-FPM
sudo systemctl restart php-fpm

# Verify the extension is loaded
php -m | grep redis
```

## Install a Specific Version

```bash
# Install a specific version of an extension
sudo pecl install mongodb-1.17.0

# Enable it
echo "extension=mongodb.so" | sudo tee /etc/php.d/50-mongodb.ini
sudo systemctl restart php-fpm
```

## Install Extensions with Dependencies

Some extensions need system libraries:

```bash
# Example: Install imagick (requires ImageMagick development libraries)
sudo dnf install -y ImageMagick-devel
sudo pecl install imagick

echo "extension=imagick.so" | sudo tee /etc/php.d/50-imagick.ini
sudo systemctl restart php-fpm

# Example: Install gRPC (requires build tools)
sudo dnf install -y zlib-devel
sudo pecl install grpc

echo "extension=grpc.so" | sudo tee /etc/php.d/50-grpc.ini
sudo systemctl restart php-fpm
```

## Manage PECL Extensions

```bash
# List installed PECL extensions
pecl list

# Get info about an installed extension
pecl info redis

# Upgrade an extension
sudo pecl upgrade redis

# Uninstall an extension
sudo pecl uninstall redis
sudo rm /etc/php.d/50-redis.ini
sudo systemctl restart php-fpm
```

## Search for Extensions

```bash
# Search for available extensions
pecl search oauth

# Show available versions of an extension
pecl remote-info redis
```

## Build from Source Manually

If PECL fails, you can compile manually:

```bash
# Download and extract the extension source
pecl download redis
tar xzf redis-*.tgz && cd redis-*/

# Build the extension
phpize
./configure
make
sudo make install

# Enable the extension
echo "extension=redis.so" | sudo tee /etc/php.d/50-redis.ini
sudo systemctl restart php-fpm
```

PECL-installed extensions are tied to your PHP version. When you upgrade PHP, you will need to recompile all PECL extensions.
