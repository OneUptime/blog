# How to Set Up Xdebug for PHP Remote Debugging on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PHP, Xdebug, Debugging, Development, Linux

Description: Install and configure Xdebug 3 on RHEL for step-through PHP debugging with IDE integration, enabling breakpoints, variable inspection, and stack trace analysis.

---

Xdebug is the standard PHP debugging extension. Version 3 introduced a simplified configuration model. This guide covers installing Xdebug on RHEL and connecting it to your IDE.

## Install Xdebug

```bash
# Install Xdebug via dnf (if available from Remi)
sudo dnf install -y php-xdebug

# Or install via PECL
sudo dnf install -y php-devel php-pear
sudo pecl install xdebug
```

## Configure Xdebug 3

```bash
# Create the Xdebug configuration file
sudo tee /etc/php.d/15-xdebug.ini << 'INI'
[xdebug]
zend_extension=xdebug

; Set the mode: debug for step debugging, develop for enhanced error pages
; Other modes: profile, trace, coverage
xdebug.mode=debug

; Start debugging on every request (use trigger for production-like environments)
xdebug.start_with_request=trigger

; Host where your IDE is listening
xdebug.client_host=192.168.1.100

; Port your IDE listens on (default for Xdebug 3)
xdebug.client_port=9003

; IDE key for session identification
xdebug.idekey=VSCODE

; Log file for troubleshooting connection issues
xdebug.log=/var/log/xdebug.log

; Maximum nesting level for recursive functions
xdebug.max_nesting_level=512
INI
```

## Restart PHP-FPM

```bash
sudo systemctl restart php-fpm

# Verify Xdebug is loaded
php -v
# Should show: with Xdebug v3.x.x

# Check the configuration
php -i | grep xdebug.mode
```

## Configure Your IDE

For VS Code, install the "PHP Debug" extension and create `.vscode/launch.json`:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Listen for Xdebug",
            "type": "php",
            "request": "launch",
            "port": 9003,
            "pathMappings": {
                "/var/www/html": "${workspaceFolder}"
            }
        }
    ]
}
```

## Trigger Debugging

Use one of these methods to trigger a debug session:

```bash
# Via browser: add the trigger cookie
# Install the "Xdebug Helper" browser extension and set it to VSCODE

# Via command line
XDEBUG_TRIGGER=1 php script.php

# Via curl
curl -b "XDEBUG_TRIGGER=VSCODE" http://localhost/index.php
```

## Firewall Configuration

```bash
# If debugging remotely, allow the Xdebug port from the IDE host
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.100/32" port port="9003" protocol="tcp" accept'
sudo firewall-cmd --reload
```

## Performance Note

Never enable Xdebug in production. It adds significant overhead. Use the `xdebug.start_with_request=trigger` setting so debugging only activates when explicitly requested. For production profiling, consider using a lighter tool like SPX.
