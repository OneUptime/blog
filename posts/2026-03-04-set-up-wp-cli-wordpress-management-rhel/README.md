# How to Set Up WP-CLI for WordPress Management on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, WordPress, WP-CLI, Administration, PHP, Linux

Description: Install and use WP-CLI on RHEL to manage WordPress installations from the command line, including updates, backups, and plugin management.

---

WP-CLI is the official command-line tool for managing WordPress. It lets you update plugins, manage users, run database operations, and more without a web browser.

## Install WP-CLI

```bash
# Download WP-CLI
curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar

# Verify it works
php wp-cli.phar --info

# Make it executable and move to PATH
chmod +x wp-cli.phar
sudo mv wp-cli.phar /usr/local/bin/wp

# Verify installation
wp --info
```

## Enable Tab Completion

```bash
# Download the completion script
curl -O https://raw.githubusercontent.com/wp-cli/wp-cli/v2.9.0/utils/wp-completion.bash

# Install it
sudo mv wp-completion.bash /etc/bash_completion.d/wp-cli
source /etc/bash_completion.d/wp-cli
```

## Common WP-CLI Commands

```bash
# Navigate to your WordPress installation
cd /var/www/html

# Check WordPress core version
wp core version

# Update WordPress core
wp core update

# List all plugins with their status
wp plugin list

# Update all plugins
wp plugin update --all

# Install and activate a plugin
wp plugin install wordfence --activate

# Deactivate and delete a plugin
wp plugin deactivate hello
wp plugin delete hello
```

## User Management

```bash
# List all users
wp user list

# Create a new admin user
wp user create editor editor@example.com --role=editor --user_pass=SecurePass123

# Reset a user password
wp user update 1 --user_pass=NewPassword456

# Delete a user and reassign their content
wp user delete 5 --reassign=1
```

## Database Operations

```bash
# Search and replace URLs (useful when migrating)
wp search-replace 'http://old-domain.com' 'https://new-domain.com' --dry-run
wp search-replace 'http://old-domain.com' 'https://new-domain.com'

# Export the database
wp db export /tmp/wordpress-backup.sql

# Import a database dump
wp db import /tmp/wordpress-backup.sql

# Optimize the database
wp db optimize
```

## Automate Updates with Cron

```bash
# Create an update script
cat > /opt/wp-update.sh << 'SCRIPT'
#!/bin/bash
cd /var/www/html
wp core update --quiet
wp plugin update --all --quiet
wp theme update --all --quiet
wp cache flush
SCRIPT

chmod +x /opt/wp-update.sh

# Schedule weekly updates (as the web server user)
sudo -u apache crontab -e
# Add: 0 3 * * 0 /opt/wp-update.sh >> /var/log/wp-update.log 2>&1
```

## Keep WP-CLI Updated

```bash
# Update WP-CLI itself
sudo wp cli update
```

WP-CLI is indispensable for managing WordPress at scale, especially when you have multiple sites or need to automate routine maintenance.
