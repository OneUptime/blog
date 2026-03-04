# How to Install Multiple PHP Versions Side by Side on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PHP, Remi, Web Development, Multiple Versions, Linux

Description: Run multiple PHP versions simultaneously on RHEL using Remi repository packages, allowing different applications to use different PHP versions.

---

Some environments need to run multiple PHP versions. For example, a legacy application may require PHP 7.4 while a new one needs PHP 8.2. The Remi repository makes this possible on RHEL.

## Install the Remi Repository

```bash
# Install EPEL and Remi
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm
sudo dnf install -y https://rpms.remirepo.net/enterprise/remi-release-9.rpm
```

## Install Multiple PHP Versions

Remi provides versioned PHP packages that can coexist:

```bash
# Install PHP 7.4
sudo dnf install -y php74-php-fpm php74-php-cli php74-php-mysqlnd \
  php74-php-xml php74-php-mbstring php74-php-curl php74-php-zip php74-php-gd

# Install PHP 8.1
sudo dnf install -y php81-php-fpm php81-php-cli php81-php-mysqlnd \
  php81-php-xml php81-php-mbstring php81-php-curl php81-php-zip php81-php-gd

# Install PHP 8.2
sudo dnf install -y php82-php-fpm php82-php-cli php82-php-mysqlnd \
  php82-php-xml php82-php-mbstring php82-php-curl php82-php-zip php82-php-gd
```

## Verify Installations

```bash
# Check each version
php74 -v   # PHP 7.4.x
php81 -v   # PHP 8.1.x
php82 -v   # PHP 8.2.x
```

## Configure Separate PHP-FPM Pools

Each version has its own PHP-FPM service and configuration:

```bash
# PHP 7.4 pool - /etc/opt/remi/php74/php-fpm.d/www.conf
sudo sed -i 's|^listen = .*|listen = /var/opt/remi/php74/run/php-fpm/www.sock|' \
  /etc/opt/remi/php74/php-fpm.d/www.conf

# PHP 8.1 pool - /etc/opt/remi/php81/php-fpm.d/www.conf
sudo sed -i 's|^listen = .*|listen = /var/opt/remi/php81/run/php-fpm/www.sock|' \
  /etc/opt/remi/php81/php-fpm.d/www.conf

# PHP 8.2 pool - /etc/opt/remi/php82/php-fpm.d/www.conf
sudo sed -i 's|^listen = .*|listen = /var/opt/remi/php82/run/php-fpm/www.sock|' \
  /etc/opt/remi/php82/php-fpm.d/www.conf

# Start all PHP-FPM services
sudo systemctl enable --now php74-php-fpm php81-php-fpm php82-php-fpm
```

## Route Nginx to Different PHP Versions

```bash
# Legacy app on PHP 7.4
server {
    listen 80;
    server_name legacy.example.com;
    root /var/www/legacy;

    location ~ \.php$ {
        fastcgi_pass unix:/var/opt/remi/php74/run/php-fpm/www.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}

# New app on PHP 8.2
server {
    listen 80;
    server_name newapp.example.com;
    root /var/www/newapp/public;

    location ~ \.php$ {
        fastcgi_pass unix:/var/opt/remi/php82/run/php-fpm/www.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

## Set Default PHP Version

```bash
# Use alternatives to switch the default 'php' command
sudo alternatives --install /usr/bin/php php /usr/bin/php82 1
sudo alternatives --set php /usr/bin/php82

php -v  # Should show PHP 8.2
```

This setup lets you migrate applications to newer PHP versions at their own pace without disrupting other services.
