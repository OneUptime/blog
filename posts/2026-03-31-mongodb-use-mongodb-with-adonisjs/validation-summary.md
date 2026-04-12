# Validation Summary: How to Use MongoDB with AdonisJS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- AdonisJS (v6+)
- Mongoose ODM
- Node.js
- TypeScript

## Sources Consulted
- AdonisJS v6 documentation — https://docs.adonisjs.com
- AdonisJS v6 migration guide (v5 to v6 breaking changes)
- npm registry for `@adonisjs/core` (current version: 7.3.x)
- Mongoose documentation — https://mongoosejs.com/docs/
- npm registry for `mongoose` (current version: 9.x)

## Issues Found

1. **All imports used obsolete AdonisJS v5 `@ioc:Adonis/...` syntax**: The post used `@ioc:Adonis/Core/Application`, `@ioc:Adonis/Core/HttpContext`, `@ioc:Adonis/Core/Route`, and `@ioc:Adonis/Core/Env` throughout. These are AdonisJS v5 IoC container imports that do not exist in v6/v7. Updated to v6+ ESM-style imports: `@adonisjs/core/types`, `@adonisjs/core/http`, `@adonisjs/core/services/router`, and `#start/env`.

2. **Provider type `ApplicationContract` replaced with `ApplicationService`**: The provider constructor used `ApplicationContract` which is a v5 type. Changed to `ApplicationService` from `@adonisjs/core/types`.

3. **Provider registration used v5 string syntax**: `'./providers/MongoProvider'` changed to lazy dynamic import `() => import('./providers/mongo_provider.js')` which is the v6+ pattern.

4. **Route definitions used v5 string-based controller binding**: `'UsersController.index'` changed to array tuple syntax `[UsersController, 'index']` with lazy controller import, which is the v6+ pattern.

5. **Install command included `@adonisjs/core`**: The command `npm install mongoose @adonisjs/core` was misleading — `@adonisjs/core` is already present in any AdonisJS project. Changed to just `npm install mongoose`.

6. **File paths used PascalCase (v5 convention)**: Updated to snake_case which is the v6+ convention: `MongoProvider.ts` → `mongo_provider.ts`, `app/Models/User.ts` → `app/models/user.ts`, `app/Controllers/Http/UsersController.ts` → `app/controllers/users_controller.ts`.

7. **Model import path used v5 alias**: `import { User } from 'App/Models/User'` changed to `import { User } from '#models/user'` using v6+ subpath imports.

8. **Env access in config used v5 pattern**: `Env.get('MONGO_URI', 'default')` changed to `env.get('MONGO_URI')` with import from `#start/env`. Added note about env validation in `start/env.ts`.

9. **"Option 1:" heading implied multiple options**: The post only covered Mongoose but the heading "Option 1: Using Mongoose with AdonisJS" suggested additional options that were never presented. Simplified to "Using Mongoose with AdonisJS".

10. **Description mentioned "Lucid MongoDB provider"**: The post only covers Mongoose, not the Lucid MongoDB adapter. Updated description to match actual content.

## Review Notes
- The Mongoose code (schema definition, model creation, CRUD operations) is correct and uses current Mongoose APIs.
- The `maxPoolSize` and `serverSelectionTimeoutMS` connection options are valid current Mongoose options.
- The `#models/user` and `#controllers/users_controller` subpath imports require the corresponding entries in `package.json` `imports` field, which are included by default in AdonisJS v6+ scaffolded projects.
- The controller pattern of using `response.ok()`, `response.created()`, `response.conflict()`, `response.notFound()`, and `response.noContent()` is correct for AdonisJS v6+.
