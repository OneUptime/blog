# How to Switch Between PHP Versions on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, PHP, Web Server, Development

Description: Switch the default PHP version on Ubuntu for CLI and web server use, using update-alternatives and web server-specific configuration for Apache and Nginx.

---

After installing multiple PHP versions, you need to know how to switch between them - both for command-line use and for web server traffic. These two contexts use different mechanisms: `update-alternatives` manages the CLI default, while web server configuration controls which PHP-FPM version processes web requests.

## Checking Current PHP Version

Before switching, know what you currently have:

```bash
# Check default CLI PHP version
php --version

# Check which binary php points to
which php
ls -la /usr/bin/php

# List all available PHP alternatives
update-alternatives --list php

# See the full alternatives configuration
update-alternatives --display php
```

## Switching the CLI Default with update-alternatives

Ubuntu's `update-alternatives` system manages which version of a command is the default:

```bash
# Interactive selector - shows all installed versions and current selection
sudo update-alternatives --config php
```

This displays output like:

```text
There are 3 choices for the alternative php (providing /usr/bin/php).

  Selection    Path             Priority   Status
------------------------------------------------------------
* 0            /usr/bin/php8.3   83        auto mode
  1            /usr/bin/php7.4   74        manual mode
  2            /usr/bin/php8.2   82        manual mode
  3            /usr/bin/php8.3   83        manual mode

Press <enter> to keep the current choice[*], or type selection number:
```

Type the number for the version you want and press Enter.

To switch non-interactively in scripts:

```bash
# Switch to PHP 8.2 without interactive prompt
sudo update-alternatives --set php /usr/bin/php8.2

# Switch to PHP 7.4
sudo update-alternatives --set php /usr/bin/php7.4

# Verify the switch
php --version
```

## Switching Related Binaries

Switching the `php` binary does not automatically switch related tools. Set them individually:

```bash
# Switch phpize (used when compiling PHP extensions)
sudo update-alternatives --set phpize /usr/bin/phpize8.2

# Switch php-config
sudo update-alternatives --set php-config /usr/bin/php-config8.2

# Switch pear
sudo update-alternatives --set pear /usr/bin/pear8.2

# Switch phar
sudo update-alternatives --set phar /usr/bin/phar8.2

# Or switch all of them at once interactively
sudo update-alternatives --config phpize
sudo update-alternatives --config php-config
```

Check all PHP-related alternatives:

```bash
# List all alternatives related to PHP
update-alternatives --get-selections | grep php
```

## Registering a PHP Version with update-alternatives

If you installed PHP via a method other than the PPA, or if it is not showing up in the alternatives list:

```bash
# Register PHP 8.3 with update-alternatives
sudo update-alternatives --install /usr/bin/php php /usr/bin/php8.3 83

# Register PHP 7.4
sudo update-alternatives --install /usr/bin/php php /usr/bin/php7.4 74

# The priority number (83, 74) determines which is selected in auto mode
# Higher priority = selected when in auto mode
```

## Switching for Apache with mod_php

If you are using mod_php (not PHP-FPM) with Apache, switching versions requires disabling one module and enabling another:

```bash
# Disable current PHP module (e.g., PHP 7.4)
sudo a2dismod php7.4

# Enable new PHP module (e.g., PHP 8.2)
sudo a2enmod php8.2

# Restart Apache for the change to take effect
sudo systemctl restart apache2

# Verify
apache2 -v
php --version
```

Note that mod_php locks you to one version across all Apache virtual hosts. For per-site version control, use PHP-FPM instead.

## Switching for Apache with PHP-FPM

When using PHP-FPM with Apache, configure it per virtual host as described in the multiple-versions guide. To change all virtual hosts to a new PHP version:

```bash
# Find all virtual host files using the old PHP FPM socket
sudo grep -r "php7.4-fpm.sock" /etc/apache2/sites-enabled/

# Replace old socket with new one
sudo sed -i 's|php7.4-fpm.sock|php8.2-fpm.sock|g' /etc/apache2/sites-enabled/*.conf

# Test and reload
sudo apache2ctl configtest
sudo systemctl reload apache2
```

## Switching for Nginx

For Nginx, PHP version is set per server block via the FastCGI socket path. Change it in the relevant server configuration:

```bash
# Find nginx configs using PHP 7.4
sudo grep -r "php7.4-fpm.sock" /etc/nginx/sites-enabled/

# Edit a specific site to use PHP 8.2
sudo nano /etc/nginx/sites-available/myapp
```

Change the fastcgi_pass line:

```nginx
# Old
fastcgi_pass unix:/run/php/php7.4-fpm.sock;

# New
fastcgi_pass unix:/run/php/php8.2-fpm.sock;
```

Apply to all sites at once:

```bash
sudo sed -i 's|php7.4-fpm.sock|php8.2-fpm.sock|g' /etc/nginx/sites-enabled/*.conf
sudo nginx -t && sudo systemctl reload nginx
```

Ensure the new FPM version is running:

```bash
sudo systemctl start php8.2-fpm
sudo systemctl enable php8.2-fpm
```

## Creating Version Aliases for Easier Switching

Add shell aliases for quickly calling specific versions:

```bash
# Add to ~/.bashrc or /etc/bash.bashrc for system-wide effect
cat >> ~/.bashrc << 'EOF'

# PHP version shortcuts
alias php74='/usr/bin/php7.4'
alias php82='/usr/bin/php8.2'
alias php83='/usr/bin/php8.3'

# Composer with specific PHP version
alias composer74='php74 /usr/local/bin/composer'
alias composer82='php82 /usr/local/bin/composer'
EOF

source ~/.bashrc
```

## Using phpenv or phpbrew for Developer Machines

For development machines where you need to switch frequently, phpbrew is more convenient:

```bash
# Install phpbrew
curl -L -O https://github.com/phpbrew/phpbrew/releases/latest/download/phpbrew.phar
chmod +x phpbrew.phar
sudo mv phpbrew.phar /usr/local/bin/phpbrew

# Initialize phpbrew
phpbrew init
echo '[[ -e ~/.phpbrew/bashrc ]] && source ~/.phpbrew/bashrc' >> ~/.bashrc
source ~/.bashrc

# List available PHP versions
phpbrew known

# Install a version
phpbrew install 8.3 +default+mysql+curl

# Switch to a version
phpbrew switch 8.3

# Or use a version just for the current shell session
phpbrew use 8.2
```

## Verifying the Switch

After switching, confirm everything is consistent:

```bash
# Check CLI version
php --version

# Check which php.ini is loaded
php --ini

# Run a quick test
php -r "echo PHP_VERSION . PHP_EOL;"

# For web applications, create a temporary phpinfo page
echo "<?php echo PHP_VERSION; ?>" | sudo tee /var/www/html/ver.php
curl http://localhost/ver.php
sudo rm /var/www/html/ver.php
```

Keeping track of which PHP version each application uses and documenting it in your deployment notes saves significant troubleshooting time later.
