# How to Install Composer for PHP Dependency Management on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PHP, Composer, Dependency Management, Web Development

Description: Install Composer, the PHP dependency manager, on RHEL and learn how to use it to manage project packages efficiently.

---

Composer is the standard dependency manager for PHP projects. It handles package installation, version constraints, and autoloading. Here is how to install and use it on RHEL.

## Install Composer

```bash
# Make sure PHP CLI is installed
sudo dnf install -y php-cli php-zip php-mbstring php-xml unzip

# Download the Composer installer
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"

# Verify the installer hash (get expected hash from getcomposer.org/download)
EXPECTED_HASH="$(curl -s https://composer.github.io/installer.sig)"
ACTUAL_HASH="$(php -r "echo hash_file('sha384', 'composer-setup.php');")"

if [ "$EXPECTED_HASH" = "$ACTUAL_HASH" ]; then
    echo "Installer verified"
    php composer-setup.php --install-dir=/usr/local/bin --filename=composer
else
    echo "Installer corrupt"
    rm composer-setup.php
    exit 1
fi

# Clean up
php -r "unlink('composer-setup.php');"
```

## Verify Installation

```bash
# Check version
composer --version
# Output: Composer version 2.x.x

# Show full diagnostics
composer diagnose
```

## Basic Usage

```bash
# Create a new project with composer.json
mkdir /var/www/myproject && cd /var/www/myproject
composer init --name=myorg/myproject --type=project --no-interaction

# Require a package (e.g., Monolog for logging)
composer require monolog/monolog

# Install all dependencies from an existing composer.json
composer install

# Update all dependencies to latest allowed versions
composer update
```

## Use Composer in a PHP Script

```php
<?php
// Include the Composer autoloader
require_once __DIR__ . '/vendor/autoload.php';

use Monolog\Logger;
use Monolog\Handler\StreamHandler;

// Create a logger instance
$log = new Logger('app');
$log->pushHandler(new StreamHandler('/var/log/myapp.log', Logger::INFO));

$log->info('Application started');
$log->error('Something went wrong', ['context' => 'example']);
```

## Configure Composer for a Non-Root User

```bash
# Set the Composer home directory
export COMPOSER_HOME="$HOME/.composer"
echo 'export COMPOSER_HOME="$HOME/.composer"' >> ~/.bashrc

# Install global tools (e.g., PHP CodeSniffer)
composer global require squizlabs/php_codesniffer

# Add global vendor bin to PATH
echo 'export PATH="$COMPOSER_HOME/vendor/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify global tool works
phpcs --version
```

## Keep Composer Updated

```bash
# Self-update Composer
sudo composer self-update

# Roll back to previous version if needed
sudo composer self-update --rollback
```

Always commit `composer.lock` to version control so all team members use the exact same dependency versions.
