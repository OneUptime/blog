# Validation Summary: How to Use MongoDB with Gatsby for Static Site Generation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (database and Node.js driver v4+)
- Gatsby (static site generator, v4+ GraphQL sort syntax)
- gatsby-source-mongodb (Gatsby source plugin)
- GraphQL (Gatsby's data layer)
- React (page and template components)
- Node.js / JavaScript

## Sources Consulted
- gatsby-source-mongodb npm README and configuration documentation (https://www.npmjs.com/package/gatsby-source-mongodb)
- Gatsby Node APIs documentation for `sourceNodes`, `createPages`, `createNode`, `createNodeId`, `createContentDigest` (https://www.gatsbyjs.com/docs/reference/config-files/gatsby-node/)
- Gatsby GraphQL sort syntax for v4+ (https://www.gatsbyjs.com/docs/reference/graphql-data-layer/)
- MongoDB Node.js driver v4+ `MongoClient` API (https://www.mongodb.com/docs/drivers/node/current/)
- Gatsby environment variables documentation (https://www.gatsbyjs.com/docs/how-to/local-development/environment-variables/)

## Issues Found
1. **Incorrect `map` option in `gatsby-source-mongodb` configuration**: The `map` option was set to `{ posts: { content: 'String', publishedAt: 'Date' } }`, using generic type names. The `map` option in `gatsby-source-mongodb` only accepts media types such as `'text/markdown'` and `'text/html'` for content transformation by Gatsby transformer plugins. Using `'String'` and `'Date'` are not valid media types and would not produce the intended behavior. Removed the `map` option entirely since the example does not require media type mapping and Gatsby's type inference handles the basic field types automatically.

## Review Notes
- The post uses Gatsby v4+ GraphQL sort syntax (`sort: { publishedAt: DESC }`) which is correct for modern Gatsby but would not work with Gatsby v3 or earlier (which used `sort: { fields: [...], order: [...] }`).
- Gatsby as a framework is in maintenance mode following its acquisition by Netlify. The plugin ecosystem may not be actively maintained. The technical content remains accurate for existing Gatsby projects.
- The `dangerouslySetInnerHTML` usage in the post template is standard React but carries XSS risk if MongoDB content is not sanitized. This is outside the scope of the tutorial but worth noting for production use.
- The custom source plugin (Option 2) spreads MongoDB's `_id` (ObjectId) directly onto the Gatsby node. This works in practice because ObjectId serializes to a string, but explicit conversion (`_id.toString()`) would be more robust.
