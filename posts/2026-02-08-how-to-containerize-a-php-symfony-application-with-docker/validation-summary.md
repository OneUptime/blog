# Validation Summary: How to Containerize a PHP Symfony Application with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker and Docker Compose
- PHP 8.3 and PHP-FPM
- Symfony
- Symfony Messenger
- Symfony AssetMapper and Webpack Encore
- Composer
- Nginx
- Supervisor
- Doctrine DBAL and Doctrine Migrations
- PostgreSQL, Redis, and Mailpit

## Sources Consulted
- Symfony web server configuration: https://symfony.com/doc/7.4/setup/web_server_configuration.html
- Symfony Messenger documentation: https://symfony.com/doc/current/messenger.html
- Symfony routing attributes documentation: https://symfony.com/doc/current/routing.html
- Symfony AssetMapper documentation: https://symfony.com/doc/6.4/frontend/asset_mapper.html
- Symfony environment variable deployment documentation: https://symfony.com/doc/current/configuration.html
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version field documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Composer CLI documentation: https://getcomposer.org/doc/03-cli.md
- Supervisor configuration documentation: https://supervisord.org/configuration.html

## Issues Found
- The Composer stage comment claimed `composer dump-autoload` ran post-install scripts. Composer post-install scripts are tied to install/update script hooks, so the comment was narrowed to optimized autoloader generation.
- The frontend build stage described both Webpack Encore and AssetMapper, but the snippet uses `package.json`, `yarn.lock`, `webpack.config.js`, and `yarn build`, which applies to Webpack Encore rather than Symfony AssetMapper's no-bundler workflow. The wording was narrowed to Webpack Encore.
- The entrypoint always warmed the `prod` cache, even when the development Compose file sets `APP_ENV=dev`. The command now uses `${APP_ENV:-prod}`.
- The development Compose service used `target: composer`, which would build the Composer-only stage rather than the runnable PHP-FPM/Nginx image. The target was removed and the comment updated.
- The Compose examples used the obsolete top-level `version` property. The `version` lines were removed to match the current Compose Specification.
- The health controller imported `Symfony\Component\Routing\Annotation\Route`; current Symfony routing docs use `Symfony\Component\Routing\Attribute\Route` for PHP attributes. The import was updated.
- The database wait comment said it extracted host and port from `DATABASE_URL`, but the script actually checks readiness through Doctrine DBAL. The comment was corrected.
- The failed Messenger worker comment described the failed transport as retries. Symfony documents failed transports primarily for saved failed messages that are usually reviewed and retried manually, though they can be consumed like a normal transport. The comment was narrowed to optional failed-transport consumption.

## Review Notes
The post is technically relevant and valid after the corrections above. Future improvements could show separate Dockerfile targets for development and production so development can avoid production OPcache settings and production-only dependency choices, but that is an architecture refinement rather than a correctness blocker for this review.
