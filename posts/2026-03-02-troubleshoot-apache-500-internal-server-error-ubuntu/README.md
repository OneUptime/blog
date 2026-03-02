# How to Troubleshoot Apache '500 Internal Server Error' on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache, Troubleshooting, Web Server, PHP

Description: Systematic guide to diagnosing and fixing Apache 500 Internal Server Error on Ubuntu, covering log analysis, PHP errors, permissions, and configuration issues.

---

A 500 Internal Server Error from Apache tells you that something went wrong on the server side, but it deliberately hides the details from website visitors. That means the information you need is in the logs, not in the browser. This guide covers a systematic approach to finding and fixing the root cause.

## First Step: Check the Error Log

The Apache error log is always the first place to look:

```bash
# View the Apache error log in real time
sudo tail -f /var/log/apache2/error.log

# Or view the last 50 lines
sudo tail -50 /var/log/apache2/error.log

# If you have site-specific logs configured
sudo tail -f /var/log/apache2/yoursite-error.log

# Check via journalctl
sudo journalctl -u apache2 -n 100 --no-pager
```

Reproduce the error in a browser or with curl while watching the log. The error message in the log is usually specific enough to identify the problem.

```bash
# Test with curl to see exactly what Apache returns
curl -I http://localhost/path/to/failing/page
```

## Common Causes and Fixes

### 1. PHP Syntax Error or Fatal Error

This is the most common cause. A PHP file has a parse error or fatal error.

```bash
# Check PHP error log
sudo tail -f /var/log/apache2/error.log | grep -i php

# Or the PHP-FPM log
sudo journalctl -u php8.3-fpm | grep ERROR

# Enable PHP error display temporarily for debugging (not for production)
# In the failing PHP file, add at the very top:
# ini_set('display_errors', 1);
# ini_set('display_startup_errors', 1);
# error_reporting(E_ALL);
```

If the log shows something like:
```
PHP Parse error: syntax error, unexpected '}' in /var/www/html/index.php on line 42
```

Fix the syntax error in the file. Common PHP errors:
- Missing semicolons
- Unclosed brackets or parentheses
- Missing `?>` closing tag
- Calling undefined functions
- Calling methods on null objects

Check a PHP file for syntax errors without running it:

```bash
# Check PHP syntax
php -l /var/www/html/index.php

# Recursively check all PHP files in a directory
find /var/www/html -name "*.php" -exec php -l {} \; 2>&1 | grep -v "No syntax errors"
```

### 2. .htaccess Errors

Invalid `.htaccess` directives cause 500 errors:

```bash
# Look for .htaccess-related errors in the log
sudo grep "htaccess" /var/log/apache2/error.log | tail -20

# Test the configuration (includes .htaccess parsing)
sudo apache2ctl configtest
```

Common `.htaccess` errors:

```bash
# Error: "Invalid command 'RewriteEngine'"
# Means mod_rewrite is not enabled
sudo a2enmod rewrite
sudo systemctl reload apache2

# Error: "Options not allowed here"
# Means AllowOverride doesn't permit Options in .htaccess
# Fix in VirtualHost config: AllowOverride All

# Check .htaccess syntax manually
cat /var/www/html/.htaccess
```

Temporarily rename the `.htaccess` to isolate it:

```bash
# Rename to bypass it
sudo mv /var/www/html/.htaccess /var/www/html/.htaccess.bak

# Test if the error goes away
curl -I http://localhost/

# If the error is gone, the problem is in .htaccess
# Check it line by line and restore when fixed
sudo mv /var/www/html/.htaccess.bak /var/www/html/.htaccess
```

### 3. File Permission Errors

Apache can't read the file:

```bash
# Check the error log for permission errors
sudo grep "Permission denied" /var/log/apache2/error.log | tail -10

# Check file permissions
ls -la /var/www/html/index.php
# Should be readable by www-data (644 or similar)

# Check directory permissions
ls -la /var/www/html/
# Directories should be executable (755) for Apache to traverse them

# Fix permissions if wrong
sudo find /var/www/html -type f -exec chmod 644 {} \;
sudo find /var/www/html -type d -exec chmod 755 {} \;
sudo chown -R www-data:www-data /var/www/html/
```

If using PHP-FPM with a custom pool user:

```bash
# Find out what user PHP-FPM runs as
ps aux | grep php-fpm | grep -v grep
# The worker processes show the user

# Set ownership to match the PHP-FPM pool user
sudo chown -R phpuser:phpuser /var/www/html/
```

### 4. CGI Script Errors

If running CGI scripts, they must be executable and return proper HTTP headers:

```bash
# Check CGI error in the log
sudo grep "CGI" /var/log/apache2/error.log | tail -10

# Make the script executable
chmod +x /var/www/cgi-bin/script.py

# Test the script output directly
/var/www/cgi-bin/script.py

# CGI scripts must start their output with headers:
# Content-Type: text/html
# [blank line]
# [body content]
```

### 5. PHP-FPM Not Running or Socket Issues

When Apache is configured for PHP-FPM but FPM is down:

```bash
# Error in log: "Connection refused" or "No such file or socket"
sudo grep "proxy" /var/log/apache2/error.log | tail -10

# Check PHP-FPM status
sudo systemctl status php8.3-fpm

# If it's not running, start it
sudo systemctl start php8.3-fpm

# Check if the socket exists
ls -la /run/php/php8.3-fpm.sock

# If socket is missing but FPM is running, check the pool config
sudo cat /etc/php/8.3/fpm/pool.d/www.conf | grep listen

# Check PHP-FPM error log
sudo journalctl -u php8.3-fpm -n 30
```

### 6. Missing Required PHP Extensions

A PHP application requires an extension that isn't installed:

```bash
# Error in log: "Call to undefined function mysql_connect()"
# or "Class 'PDO' not found"

# Check installed PHP extensions
php -m | grep -i mysql
php -m | grep -i pdo

# Install missing extension
sudo apt install php8.3-mysql php8.3-pdo

# Restart PHP-FPM after installing
sudo systemctl restart php8.3-fpm
sudo systemctl reload apache2
```

### 7. Apache Configuration Errors

A bad directive in a configuration file:

```bash
# Test Apache config
sudo apache2ctl configtest

# If it reports errors, they'll include the file and line number
# Example: "Invalid command 'SSLOptions', perhaps misspelled"

# Fix the error, then reload
sudo systemctl reload apache2

# If Apache won't start, check the full status
sudo systemctl status apache2 -l
sudo journalctl -u apache2 -n 50
```

### 8. Disk Full or Memory Exhausted

```bash
# Check disk space
df -h

# Check memory
free -m

# If disk is full, find and clear large files
sudo du -sh /var/log/apache2/*
sudo du -sh /tmp/*

# Rotate and compress Apache logs if they're large
sudo logrotate -f /etc/logrotate.d/apache2
```

### 9. AppArmor Blocking Apache

On Ubuntu, AppArmor might block Apache from accessing certain files:

```bash
# Check for AppArmor denials
sudo journalctl -k | grep "apparmor.*DENIED" | grep apache

# If AppArmor is the issue, you'll see messages like:
# apparmor="DENIED" operation="open" profile="/usr/sbin/apache2" name="/data/www/..."

# Quick test: temporarily put AppArmor in complain mode
sudo aa-complain /usr/sbin/apache2

# Test the site
curl http://localhost/

# If it works, AppArmor is the problem
# Fix: add the path to the Apache AppArmor profile
sudo aa-logprof
# Then switch back to enforce mode
sudo aa-enforce /usr/sbin/apache2
```

### 10. Symlink Issues

Apache won't follow symlinks unless configured:

```bash
# Error when following symlinks
sudo grep "Symbolic link not allowed" /var/log/apache2/error.log

# Fix: enable FollowSymLinks in the Directory config
# In VirtualHost or .htaccess:
# Options +FollowSymLinks

# Or allow only if owner matches
# Options +SymLinksIfOwnerMatch
```

## Enabling Detailed Error Messages for Debugging

Temporarily show errors in the browser (revert after debugging):

```bash
# In /etc/php/8.3/fpm/php.ini or /etc/php/8.3/apache2/php.ini
sudo nano /etc/php/8.3/fpm/php.ini

# Change:
display_errors = On
error_reporting = E_ALL

# Reload PHP-FPM
sudo systemctl reload php8.3-fpm
```

Or in the Apache VirtualHost:

```apache
<VirtualHost *:80>
    # Show errors in browser (debug only)
    php_flag display_errors on
    php_value error_reporting 32767
</VirtualHost>
```

**Remember to revert this after debugging** - displaying PHP errors to users is a security risk.

## Checking Logs Systematically

```bash
# Create a combined log view for debugging
sudo tail -f \
  /var/log/apache2/error.log \
  /var/log/apache2/access.log \
  /var/log/php/error.log 2>/dev/null &

# Reproduce the error, then stop the tail
kill %1
```

## After Fixing: Verify

```bash
# Test Apache configuration
sudo apache2ctl configtest

# Check for remaining errors
sudo tail -f /var/log/apache2/error.log

# Test the URL
curl -I http://localhost/path/to/page
# Should return 200 OK

# Check the full response
curl -v http://localhost/path/to/page
```

A 500 error always has a specific cause, and the error log always contains it. The key is reading the log carefully and matching the error message to one of these categories. When the log message is cryptic, checking file permissions and PHP-FPM status covers the majority of real-world cases.
