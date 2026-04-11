# Validation Summary: How to Use MySQL with Symfony

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8
- Symfony (6+/7+)
- Doctrine ORM / DBAL
- Composer
- PHP 8 (attributes)

## Sources Consulted
- Symfony Doctrine documentation: https://symfony.com/doc/current/doctrine.html
- Doctrine DBAL configuration reference: https://www.doctrine-project.org/projects/doctrine-dbal/en/current/reference/configuration.html
- Doctrine ORM mapping attributes: https://www.doctrine-project.org/projects/doctrine-orm/en/current/reference/attributes-reference.html
- Doctrine Migrations documentation: https://www.doctrine-project.org/projects/doctrine-migrations/en/current/reference/generating-migrations.html
- Symfony MakerBundle documentation: https://symfony.com/bundles/SymfonyMakerBundle/current/index.html

## Issues Found
No technical issues found.

## Review Notes
- The `options: 1002: "SET NAMES utf8mb4"` in doctrine.yaml is redundant when `charset=utf8mb4` is already specified in DATABASE_URL. Both approaches set the connection charset, so having both is belt-and-suspenders rather than an error.
- The entity example omits getter/setter methods for brevity, which is fine for illustration. The `make:entity` command generates these automatically.
- `auto_generate_proxy_classes: true` is shown unconditionally. In production, Symfony Flex defaults this to `false` (proxies are pre-generated during cache warmup). Acceptable for a tutorial context.
- The `string` type for the `$price` decimal property is correct and is a Doctrine best practice since PHP floats cannot accurately represent arbitrary-precision decimal values.
