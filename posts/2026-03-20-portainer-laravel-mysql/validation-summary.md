# Validation Summary: How to Deploy a Laravel + MySQL Stack via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / deployment tutorial

## Technologies Covered
- Laravel
- PHP 8.3 / PHP-FPM
- MySQL 8.0
- Redis
- Nginx
- Docker Compose
- Portainer

## Sources Consulted
- Laravel cache documentation: https://laravel.com/docs/12.x/cache
- Laravel queues documentation: https://laravel.com/docs/11.x/queues
- Laravel scheduling documentation: https://laravel.com/docs/11.x/scheduling
- Laravel deployment documentation: https://laravel.com/docs/11.x/deployment
- Laravel 12 skeleton `composer.json`: https://github.com/laravel/laravel/blob/12.x/composer.json
- Laravel 12 `.env.example`: https://raw.githubusercontent.com/laravel/laravel/12.x/.env.example
- Docker Compose startup order: https://docs.docker.com/compose/how-tos/startup-order/
- Docker volumes documentation: https://docs.docker.com/engine/storage/volumes/
- Docker `exec` reference: https://docs.docker.com/engine/reference/commandline/exec/
- Nginx `try_files` directive reference: https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files
- Portainer stack deployment docs: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer relative path volumes docs: https://docs.portainer.io/advanced/relative-paths
- MySQL native authentication documentation: https://dev.mysql.com/doc/refman/8.0/en/native-pluggable-authentication.html
- MySQL `mysqladmin` reference: https://dev.mysql.com/doc/refman/8.0/en/mysqladmin.html

## Issues Found
- The Dockerfile ran `composer install` before copying the Laravel application. I moved the application copy ahead of `composer install` because current Laravel skeletons run Composer `post-autoload-dump` scripts that call `artisan package:discover`, which requires the application files to be present.
- The Compose snippet used `CACHE_DRIVER`, but current Laravel skeletons use `CACHE_STORE`. I updated the environment variables accordingly and added the matching cache settings needed for `queue:restart` to work across containers.
- The scheduler service omitted `DB_CONNECTION`, which would leave Laravel on its default database connection in current skeletons. I added `DB_CONNECTION=mysql` and `DB_PORT=3306`.
- The MySQL service forced `mysql_native_password`, which MySQL 8.0 deprecates and newer releases disable or remove. I removed that override and updated the healthcheck to use `mysqladmin ping` with credentials.
- The Nginx service did not mount the Laravel `public/` directory, so `try_files`, `index.php`, and static asset delivery would fail. I added the `public` bind mount and an explicit `/storage/` alias backed by the shared storage volume.
- Because the Nginx config now serves `/storage/` directly from the shared volume, the `storage:link` command was no longer appropriate in this guide. I removed it.
- The post described the stack as a Web Editor deployment while also using relative bind mounts. Portainer documents relative path volumes for Git-based stacks in Business Edition, so I clarified that readers must either use that deployment mode or replace those mounts with absolute host paths.
- The `queue:monitor` example was not the right deployment-time command for this scenario, and the post omitted the documented `queue:restart` step needed after deployments for long-lived workers. I replaced it with `php artisan queue:restart`.
- The Artisan section implied the commands were Portainer-native actions. I clarified that the shown `docker exec` commands run on the Docker host, or that only the `php artisan ...` portion should be run inside Portainer's container console.

## Review Notes
- The bind-mounted `public/` directory should come from the same application revision as `LARAVEL_IMAGE`; otherwise static assets and PHP code can drift out of sync.
- The scheduler loop is fine for standard minute-based tasks. If the application defines sub-minute scheduled tasks, Laravel's scheduler behavior needs extra consideration because `schedule:run` stays active for the rest of the current minute.
