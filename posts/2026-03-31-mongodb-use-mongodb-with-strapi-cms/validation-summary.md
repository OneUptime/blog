# Validation Summary: How to Use MongoDB with Strapi CMS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Strapi CMS (v3)
- Mongoose (via strapi-connector-mongoose)
- Node.js

## Sources Consulted
- Strapi blog: MongoDB Support in Strapi: Past, Present & Future — https://strapi.io/blog/mongo-db-support-in-strapi-past-present-and-future
- Strapi v3 MongoDB configuration docs — https://docs-v3.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/databases/mongodb.html
- Strapi v3 CLI documentation — https://docs-v3.strapi.io/developer-docs/latest/developer-resources/cli/CLI.html
- Strapi v3 backend customization docs — https://docs-v3.strapi.io/developer-docs/latest/development/backend-customization.html
- Strapi v4 database configuration docs — https://docs-v4.strapi.io/dev-docs/configurations/database
- Strapi v5 supported databases — https://docs.strapi.io/snippets/supported-databases
- Strapi v3 to v4 content-type schema migration guide — https://docs-v4.strapi.io/dev-docs/migration/v3-to-v4/code/content-type-schema

## Issues Found

1. **Major: False claim that Strapi v4 supports MongoDB.** The intro stated "Strapi v4 uses an abstraction layer called Strapi Database that supports MongoDB through its Mongoose connector." This is incorrect — Strapi v4 dropped MongoDB support entirely. Fixed to correctly state that Strapi v3 supports MongoDB via `strapi-connector-mongoose`, and that v4+ only supports SQL databases.

2. **Major: Project creation command used `@latest`.** `npx create-strapi-app@latest` installs Strapi v5 (or v4), which does not support MongoDB. Fixed to `@3` to install Strapi v3.

3. **Major: Database configuration used Strapi v4 format.** The config used `connection.client: 'mongoose'` with a nested `connection` object, which is the v4 Knex-based format. Fixed to v3 format using `defaultConnection`, `connections.default.connector: 'mongoose'`, `settings`, and `options` keys.

4. **Error: `useNullAsDefault: true` included in config.** This is a Knex.js option for SQLite, not applicable to MongoDB/Mongoose. Removed.

5. **Major: Content type CLI command was wrong.** `npx strapi generate content-type article` is a Strapi v4 command. In v3, the command is `npx strapi generate:model article` (with colon syntax). Fixed accordingly.

6. **Major: Content type schema file path was wrong.** Used v4 path `src/api/article/content-types/article/schema.json`. In v3, the path is `api/article/models/Article.settings.json`. Fixed.

7. **Major: Content type schema used v4 relation syntax.** The `author` relation used v4 format (`"type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user"`). In v3, relations use `"model"` and `"plugin"` keys directly. Also fixed `info` block to use v3 format (`name` instead of `singularName`/`pluralName`/`displayName`), and added v3 `options` block.

8. **Major: Custom query accessed Mongoose model incorrectly.** Used `strapi.db.connection.model('Article')` which is not a valid API in any Strapi version. In v3, the correct way to access the underlying Mongoose model is `strapi.query('article').model`. Fixed both service methods.

9. **Error: Author query used `'author._id'` for a reference field.** In Mongoose, a manyToOne relation stores an ObjectId reference, not an embedded document. The correct query field is just `author`. Fixed.

10. **Major: Controller used v4 service access pattern.** `strapi.service('api::article.article')` is the v4 UID syntax. In v3, services are accessed via `strapi.services.article`. Fixed.

11. **Major: Route file used v4 JS format and path.** Routes were in `src/api/article/routes/article.js` as a JS module. In v3, routes are defined in `api/article/config/routes.json` as JSON. Fixed both path and format.

12. **Summary paragraph updated.** Changed to reference `strapi-connector-mongoose` and `strapi.query()` instead of generic "Mongoose connector" and "entity service". Added note that v4+ no longer supports MongoDB.

## Review Notes
- Strapi v3 is end-of-life and no longer maintained. Readers should be aware that this tutorial applies to a legacy version of Strapi.
- The post could benefit from a prominent note at the top warning readers that MongoDB support is only available in Strapi v3, which is no longer supported.
- For users who need a headless CMS with MongoDB, alternatives include Payload CMS, KeystoneJS, or Directus.
