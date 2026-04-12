# How to Use MongoDB with Strapi CMS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Strapi, CMS

Description: Configure Strapi CMS to use MongoDB as the database backend, with connection setup, content type creation, and custom query examples.

---

## Strapi and MongoDB

Strapi is a headless CMS that supports multiple databases. MongoDB works well with Strapi when your content types benefit from flexible schemas or when you are already running a MongoDB infrastructure. Strapi v3 supports MongoDB through its `strapi-connector-mongoose` package. Note that Strapi v4 and later dropped MongoDB support and only work with SQL databases (PostgreSQL, MySQL, MariaDB, SQLite). The examples in this guide apply to Strapi v3.

## Creating a Strapi Project with MongoDB

```bash
npx create-strapi-app@3 my-cms --dbclient=mongo \
  --dbhost=localhost \
  --dbport=27017 \
  --dbname=strapidb \
  --dbusername=strapi \
  --dbpassword=strapipass
```

## Manual Database Configuration

Edit `config/database.js`:

```javascript
module.exports = ({ env }) => ({
  defaultConnection: 'default',
  connections: {
    default: {
      connector: 'mongoose',
      settings: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 27017),
        database: env('DATABASE_NAME', 'strapidb'),
        username: env('DATABASE_USERNAME', ''),
        password: env('DATABASE_PASSWORD', ''),
      },
      options: {
        authenticationDatabase: env('AUTHENTICATION_DATABASE', 'admin'),
        ssl: env.bool('DATABASE_SSL', false),
      },
    },
  },
})
```

Set up `.env`:

```text
DATABASE_HOST=localhost
DATABASE_PORT=27017
DATABASE_NAME=strapidb
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=strapipass
```

## Creating a Content Type

Use the Strapi admin panel or the CLI to create content types. Each content type maps to a MongoDB collection:

```bash
# Create an Article model via CLI
npx strapi generate:model article title:string content:richtext publishedAt:datetime
```

The generated schema in `api/article/models/Article.settings.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "articles",
  "info": {
    "name": "article",
    "description": ""
  },
  "options": {
    "timestamps": true
  },
  "attributes": {
    "title": {
      "type": "string",
      "required": true,
      "maxLength": 200
    },
    "content": {
      "type": "richtext"
    },
    "publishedAt": {
      "type": "datetime"
    },
    "author": {
      "model": "user",
      "plugin": "users-permissions"
    }
  }
}
```

## Custom MongoDB Query in a Strapi Service

When you need a query beyond Strapi's built-in filters, use the entity service or the underlying Mongoose model:

```javascript
// api/article/services/article.js
'use strict'

module.exports = {
  async findPopular() {
    const model = strapi.query('article').model
    return model.find({
      publishedAt: { $ne: null },
    })
    .sort({ views: -1 })
    .limit(10)
    .select('title publishedAt views')
    .lean()
  },

  async countByAuthor(authorId) {
    const model = strapi.query('article').model
    return model.countDocuments({ author: authorId })
  },
}
```

## Custom Controller Endpoint

```javascript
// api/article/controllers/article.js
'use strict'

module.exports = {
  async popular(ctx) {
    const articles = await strapi.services.article.findPopular()
    ctx.body = articles
  },
}
```

Add the route in `api/article/config/routes.json`:

```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/articles/popular",
      "handler": "article.popular",
      "config": {
        "policies": []
      }
    }
  ]
}
```

## Summary

Strapi v3 integrates with MongoDB through the `strapi-connector-mongoose` package, configured via `config/database.js` and environment variables. Content types map directly to MongoDB collections, giving you Strapi's admin UI and REST/GraphQL APIs with MongoDB's flexible storage. For queries beyond Strapi's filter system, access the underlying Mongoose model through `strapi.query()` to write native MongoDB aggregations and queries. Note that Strapi v4 and later no longer support MongoDB.
