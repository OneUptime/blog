# Validation Summary: How to Set Up Nextcloud on Ubuntu for Self-Hosted Cloud Storage

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Nextcloud (server v30.0.4)
- Ubuntu
- Nginx (reverse proxy / web server)
- PHP 8.2 with PHP-FPM
- PostgreSQL
- Redis (Unix socket, used for transactional file locking and memory caching)
- APCu (PHP local memory cache)
- Let's Encrypt / certbot
- OCC (Nextcloud command-line tool)

## Sources Consulted
- Nextcloud Admin Manual — Installation on Linux (https://docs.nextcloud.com/server/latest/admin_manual/installation/source_installation.html)
- Nextcloud Admin Manual — System requirements (https://docs.nextcloud.com/server/latest/admin_manual/installation/system_requirements.html)
- Nextcloud Admin Manual — Example NGINX configurations (https://docs.nextcloud.com/server/latest/admin_manual/installation/nginx.html)
- Nextcloud Admin Manual — Memory caching / Redis (https://docs.nextcloud.com/server/latest/admin_manual/configuration_server/caching_configuration.html)
- Nextcloud Admin Manual — Background jobs / cron (https://docs.nextcloud.com/server/latest/admin_manual/configuration_server/background_jobs_configuration.html)
- Nextcloud Admin Manual — OCC command reference (https://docs.nextcloud.com/server/latest/admin_manual/configuration_server/occ_command.html)
- Nextcloud releases (https://download.nextcloud.com/server/releases/) — verified 30.0.4 tarball exists
- Debian/Ubuntu PHP packaging conventions — `/etc/php/<ver>/{cli,fpm}/conf.d/` are SAPI-specific and are not shared

## Issues Found

1. **Description mismatch ("Apache or Nginx")** — The frontmatter description claimed the guide covers both Apache and Nginx, but only Nginx is documented. Fixed by changing the description to mention Nginx only.

2. **`apc.enable_cli = 1` placed only in PHP-FPM conf.d** — On Debian/Ubuntu, `/etc/php/8.2/fpm/conf.d/` is read only by the FPM SAPI, not the CLI SAPI. The `apc.enable_cli` directive itself only affects CLI invocations (it controls whether APCu is enabled when PHP is run from the command line, which is what `cron.php` and `occ` use). As written, the setting would have no effect on cron.php or occ, so APCu local caching would silently not be available there and Nextcloud would log warnings. Fixed by adding a step that copies `99-nextcloud.ini` into `/etc/php/8.2/cli/conf.d/` as well.

3. **`'htaccess.RewriteBase' => '/'` in config.php with Nginx** — This setting is only used by `occ maintenance:update:htaccess` to write a working `.htaccess` for Apache mod_rewrite. Nginx never reads `.htaccess`, so the setting is pointless (though harmless) in an Nginx-only deployment. Removed from the example config to avoid confusing readers into thinking it's required for nice URLs under Nginx.

## Review Notes

- Nextcloud 30.0.4 is a real release; the download URL and `.sha256` companion file in the post are valid.
- PHP version support claim "8.1-8.3" is correct for Nextcloud 30. PHP 8.1 is supported but deprecated in Nextcloud 30's matrix; PHP 8.2/8.3 is preferred. Not flagged as an error since the post recommends 8.2 by example.
- All `occ maintenance:install` flags used in the post (`--database pgsql`, `--database-host`, `--database-name`, `--database-user`, `--database-pass`, `--admin-user`, `--admin-pass`, `--data-dir`) are valid for current Nextcloud releases.
- The Redis Unix socket config (`'host' => '<sock path>', 'port' => 0`) follows the documented Nextcloud convention — port `0` is the standard sentinel that tells the client to treat `host` as a Unix socket path.
- The Nginx `location ~ ^/(?:build|tests|config|lib|3rdparty|templates|data)(?:$|/)` block matches the official Nextcloud 30 sample config and is still required (those directories still exist and must be blocked from direct HTTP access).
- The cron entry `*/5 * * * * php -f /var/www/nextcloud/cron.php` matches Nextcloud's documented recommendation.
- `add_header X-XSS-Protection "1; mode=block"` is retained from Nextcloud's official template even though the header has been deprecated by modern browsers. Left as-is to stay aligned with upstream.
- Future caveat: when Nextcloud drops PHP 8.1 (likely in a future major), the `# Nextcloud currently requires PHP 8.1-8.3` comment will need updating, and readers using fresh Ubuntu 24.04 installs may want to use the `ondrej/php` PPA to install non-default PHP minor versions.
