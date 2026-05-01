# How to Deploy WordPress via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, WordPress, MySQL, Docker, CMS

Description: Learn how to deploy WordPress with MySQL and Redis cache via Portainer, with persistent storage, automatic HTTPS via Traefik, and performance optimization.

## WordPress via Portainer Stack

**Stacks → Add Stack → wordpress**

```yaml
services:
  wordpress:
    image: wordpress:6.9-apache
    restart: unless-stopped
    environment:
      - WORDPRESS_DB_HOST=mysql:3306
      - WORDPRESS_DB_NAME=${MYSQL_DATABASE}
      - WORDPRESS_DB_USER=${MYSQL_USER}
      - WORDPRESS_DB_PASSWORD=${MYSQL_PASSWORD}
      - WORDPRESS_TABLE_PREFIX=wp_
    volumes:
      - wordpress_data:/var/www/html
      - ./wordpress-conf/uploads.ini:/usr/local/etc/php/conf.d/uploads.ini:ro
    networks:
      - proxy
      - backend
    labels:
      # Traefik routing labels (if using Traefik)
      - "traefik.enable=true"
      - "traefik.http.routers.wordpress.rule=Host(`blog.yourdomain.com`)"
      - "traefik.http.routers.wordpress.entrypoints=websecure"
      - "traefik.http.routers.wordpress.tls=true"
      - "traefik.http.routers.wordpress.tls.certresolver=letsencrypt"
      - "traefik.http.services.wordpress.loadbalancer.server.port=80"
      - "traefik.docker.network=proxy"
    depends_on:
      mysql:
        condition: service_healthy

  mysql:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      - MYSQL_DATABASE=${MYSQL_DATABASE}
      - MYSQL_USER=${MYSQL_USER}
      - MYSQL_PASSWORD=${MYSQL_PASSWORD}
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - backend
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      retries: 5

  redis:
    image: redis:7.2-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - backend

volumes:
  wordpress_data:
  mysql_data:
  redis_data:

networks:
  proxy:
    external: true
  backend:
    driver: bridge
```

## Environment Variables

```text
MYSQL_DATABASE=wordpress
MYSQL_USER=wp_user
MYSQL_PASSWORD=wp-db-password
MYSQL_ROOT_PASSWORD=root-password
REDIS_PASSWORD=redis-password
```

## PHP Configuration

Create `wordpress-conf/uploads.ini`:

```ini
; Increase upload limits for media files
upload_max_filesize = 64M
post_max_size = 64M
max_execution_time = 300
memory_limit = 256M
```

## Enable Redis Object Cache

After deploying, install the **Redis Object Cache** WordPress plugin:

1. In WordPress Admin: **Plugins → Add New → Search "Redis Object Cache"**
2. Install and Activate
3. In `wp-config.php` (via Portainer volume or PHP override):

```php
define('WP_REDIS_HOST', 'redis');
define('WP_REDIS_PORT', 6379);
define('WP_REDIS_PASSWORD', 'redis-password');
define('WP_REDIS_DATABASE', 0);
```

Or add to the WordPress environment in the stack:

```yaml
environment:
  - WORDPRESS_CONFIG_EXTRA=
    define('WP_REDIS_HOST', 'redis');
    define('WP_REDIS_PASSWORD', '${REDIS_PASSWORD}');
```

## WordPress WP-CLI via Portainer

```bash
# Via Portainer exec on wordpress container

# Install WP-CLI
curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
chmod +x wp-cli.phar
mv wp-cli.phar /usr/local/bin/wp

# If the console is opened as root, allow WP-CLI in the container shell
export WP_CLI_ALLOW_ROOT=1

# Common WP-CLI commands
wp core version
wp plugin list
wp user list
wp cache flush    # Flush the object cache
wp search-replace 'http://old-domain.com' 'https://new-domain.com'
```

## Backup WordPress

```bash
# Backup files and database
docker exec -i <mysql-container-name> sh -c 'exec mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  > /backup/wp-db-$(date +%Y%m%d).sql

docker cp <wordpress-container-name>:/var/www/html/wp-content \
  /backup/wp-content-$(date +%Y%m%d)
```

## Performance Tips

| Plugin | Purpose |
|--------|---------|
| Redis Object Cache | Persistent object caching |
| LiteSpeed Cache | Full-page caching (if using LiteSpeed) |
| WP Super Cache | Static HTML caching |
| Imagify | Image compression |

## Conclusion

WordPress via Portainer with MySQL and Redis creates a production-ready blog or website platform. The Redis object cache dramatically reduces database queries, improving response times for dynamic content. Traefik labels handle HTTPS automatically, and Portainer's stack management simplifies WordPress updates and maintenance.
