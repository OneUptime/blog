# How to Deploy DokuWiki Knowledge Base on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Wiki, Linux

Description: Step-by-step guide on deploy dokuwiki knowledge base using Red Hat Enterprise Linux 9.

---

Deploying DokuWiki Knowledge Base on RHEL provides a stable and secure foundation for your workload. This guide covers the installation, configuration, and operational considerations.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- Apache HTTP Server, PHP-FPM, and the required PHP extensions

## Step 2: Configure the Service

Install Apache, PHP-FPM, and DokuWiki:

```bash
# Install the required packages
sudo dnf install -y httpd php php-fpm php-gd php-mbstring php-xml tar curl policycoreutils-python-utils

# Download and extract the current stable DokuWiki release
sudo mkdir -p /var/www/html/dokuwiki
curl -L https://download.dokuwiki.org/src/dokuwiki/dokuwiki-stable.tgz -o /tmp/dokuwiki-stable.tgz
sudo tar -xzf /tmp/dokuwiki-stable.tgz --strip-components=1 -C /var/www/html/dokuwiki

# Allow Apache to write DokuWiki configuration and page data
sudo chown -R apache:apache /var/www/html/dokuwiki
sudo semanage fcontext -a -t httpd_sys_rw_content_t '/var/www/html/dokuwiki/(conf|data)(/.*)?'
sudo restorecon -Rv /var/www/html/dokuwiki
```

Create an Apache configuration file for the DokuWiki directory:

```bash
sudo vi /etc/httpd/conf.d/dokuwiki.conf
```

Add the following configuration:

```apache
Alias /dokuwiki /var/www/html/dokuwiki

<Directory "/var/www/html/dokuwiki">
    AllowOverride All
    Require all granted
</Directory>
```

If `firewalld` is running, allow HTTP traffic:

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

## Step 3: Enable and Start the Service

```bash
# Enable and start Apache and PHP-FPM
sudo systemctl enable --now php-fpm httpd

# Check the status
sudo systemctl status php-fpm httpd
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status php-fpm httpd

# Review recent logs
journalctl -u httpd --no-pager -n 20
journalctl -u php-fpm --no-pager -n 20
```

Open `http://server_IP_or_host_name/dokuwiki/install.php` in a browser and complete the DokuWiki installer. After installation, remove the installer:

```bash
sudo rm /var/www/html/dokuwiki/install.php
```

## Troubleshooting

- If Apache fails to start, check the logs with `journalctl -u httpd -e --no-pager`.
- If PHP pages do not load, check PHP-FPM with `systemctl status php-fpm` and `journalctl -u php-fpm -e --no-pager`.
- Ensure all required packages are installed: `rpm -q httpd php php-fpm php-gd php-mbstring php-xml`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
