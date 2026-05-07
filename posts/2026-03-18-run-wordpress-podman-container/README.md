# How to Run WordPress in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, WordPress, CMS, PHP, Web Development

Description: Learn how to run WordPress in a Podman container with MariaDB, persistent content, and custom theme development support.

---

> WordPress in Podman gives you the world's most popular CMS running in rootless containers with a database backend and persistent content.

WordPress powers over 40% of all websites on the internet. Running it in a Podman container with a database backend provides a clean, isolated development environment that mirrors production setups. This guide covers setting up WordPress with MariaDB using Podman pods, configuring persistent storage, and setting up a development workflow for themes and plugins.

---

## Pulling the Required Images

Download the WordPress and MariaDB images.

```bash
# Pull the WordPress and MariaDB images

podman pull docker.io/library/wordpress:latest
podman pull docker.io/library/mariadb:11

# Verify both images
podman images | grep -E "wordpress|mariadb"
```

## Running WordPress with MariaDB in a Pod

Use a Podman pod to run WordPress and MariaDB together.

```bash
# Create a pod with port mapping for WordPress
podman pod create \
  --name wordpress-pod \
  -p 8080:80

# Create volumes for persistent data
podman volume create wp-db-data
podman volume create wp-content

# Run MariaDB in the pod
podman run -d \
  --pod wordpress-pod \
  --name wp-mariadb \
  -e MARIADB_ROOT_PASSWORD=root-secret \
  -e MARIADB_DATABASE=wordpress \
  -e MARIADB_USER=wpuser \
  -e MARIADB_PASSWORD=wp-secret \
  -v wp-db-data:/var/lib/mysql:Z \
  mariadb:11

# Wait for MariaDB to initialize
sleep 10

# Run WordPress in the pod
podman run -d \
  --pod wordpress-pod \
  --name wp-app \
  -e WORDPRESS_DB_HOST=127.0.0.1:3306 \
  -e WORDPRESS_DB_USER=wpuser \
  -e WORDPRESS_DB_PASSWORD=wp-secret \
  -e WORDPRESS_DB_NAME=wordpress \
  -v wp-content:/var/www/html/wp-content:Z \
  wordpress:latest

# Check all containers in the pod are running
podman pod ps
podman ps --pod

# Access WordPress
echo "Open http://localhost:8080 in your browser to complete the setup wizard"
```

## Standalone WordPress Setup

Run WordPress and MariaDB as separate containers connected by a network.

```bash
# Create a custom network
podman network create wordpress-net
podman volume create wp-db-standalone-data
podman volume create wp-content-standalone

# Run MariaDB on the custom network
podman run -d \
  --name wp-db-standalone \
  --network wordpress-net \
  -e MARIADB_ROOT_PASSWORD=root-secret \
  -e MARIADB_DATABASE=wordpress \
  -e MARIADB_USER=wpuser \
  -e MARIADB_PASSWORD=wp-secret \
  -v wp-db-standalone-data:/var/lib/mysql:Z \
  mariadb:11

# Wait for MariaDB
sleep 10

# Run WordPress on the same network
podman run -d \
  --name wp-standalone \
  --network wordpress-net \
  -p 8081:80 \
  -e WORDPRESS_DB_HOST=wp-db-standalone:3306 \
  -e WORDPRESS_DB_USER=wpuser \
  -e WORDPRESS_DB_PASSWORD=wp-secret \
  -e WORDPRESS_DB_NAME=wordpress \
  -v wp-content-standalone:/var/www/html/wp-content:Z \
  wordpress:latest
```

## Custom wp-config.php Settings

Pass additional WordPress configuration through environment variables.

```bash
# Run WordPress with extra configuration
podman rm -f wp-app 2>/dev/null || true

podman run -d \
  --pod wordpress-pod \
  --name wp-custom \
  -e WORDPRESS_DB_HOST=127.0.0.1:3306 \
  -e WORDPRESS_DB_USER=wpuser \
  -e WORDPRESS_DB_PASSWORD=wp-secret \
  -e WORDPRESS_DB_NAME=wordpress \
  -e WORDPRESS_DEBUG=1 \
  -e WORDPRESS_CONFIG_EXTRA="define('WP_MEMORY_LIMIT', '256M'); define('AUTOSAVE_INTERVAL', 300);" \
  -v wp-content:/var/www/html/wp-content:Z \
  wordpress:latest
```

## Theme and Plugin Development

Mount local directories for theme and plugin development.

```bash
# Create directories for custom theme and plugin development
mkdir -p ~/wp-dev/themes/my-theme
mkdir -p ~/wp-dev/plugins/my-plugin

# Create a basic theme
cat > ~/wp-dev/themes/my-theme/style.css <<'EOF'
/*
Theme Name: My Podman Theme
Theme URI: http://localhost:8080
Description: A custom theme developed in Podman

Author: Developer
Version: 1.0.0
*/

body {
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}
EOF

cat > ~/wp-dev/themes/my-theme/index.php <<'EOF'
<?php get_header(); ?>
<main>
    <?php if (have_posts()) : while (have_posts()) : the_post(); ?>
        <article>
            <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
            <?php the_excerpt(); ?>
        </article>
    <?php endwhile; endif; ?>
</main>
<?php get_footer(); ?>
EOF

# Run WordPress with theme directory mounted for live editing
podman rm -f wp-app wp-custom 2>/dev/null || true

podman run -d \
  --pod wordpress-pod \
  --name wp-dev \
  -e WORDPRESS_DB_HOST=127.0.0.1:3306 \
  -e WORDPRESS_DB_USER=wpuser \
  -e WORDPRESS_DB_PASSWORD=wp-secret \
  -e WORDPRESS_DB_NAME=wordpress \
  -e WORDPRESS_DEBUG=1 \
  -v ~/wp-dev/themes:/var/www/html/wp-content/themes:Z \
  -v ~/wp-dev/plugins:/var/www/html/wp-content/plugins:Z \
  wordpress:latest
```

## Using WP-CLI

Manage WordPress from the command line using WP-CLI.

Use the name of the WordPress container you are running. For the first pod setup, that container is `wp-app`.

```bash
# Install WP-CLI inside the WordPress container
podman exec wp-app bash -c "curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar && chmod +x wp-cli.phar && mv wp-cli.phar /usr/local/bin/wp"

# List installed plugins
podman exec wp-app wp plugin list --allow-root

# List installed themes
podman exec wp-app wp theme list --allow-root

# Check WordPress version
podman exec wp-app wp core version --allow-root
```

## Managing the Containers

Common management operations.

```bash
# View WordPress logs
podman logs wp-app

# View database logs
podman logs wp-mariadb

# Stop the entire pod
podman pod stop wordpress-pod

# Start the pod again
podman pod start wordpress-pod

# Remove the pod and all containers
podman pod rm -f wordpress-pod

# Clean up standalone containers
podman rm -f wp-standalone wp-db-standalone
podman network rm wordpress-net

# Clean up volumes
podman volume rm wp-db-data wp-content wp-db-standalone-data wp-content-standalone
```

## Summary

Running WordPress in a Podman container with MariaDB provides a complete CMS platform that mirrors production environments. Podman pods simplify the networking between WordPress and its database, while named volumes preserve your content, themes, and database across restarts. Mounting local directories enables live theme and plugin development with instant feedback. WP-CLI provides command-line management for plugins, themes, and content. This setup is ideal for WordPress development, testing, and local staging environments.
