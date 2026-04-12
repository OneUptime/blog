# Validation Summary: How to Use MongoDB with Fresh (Deno)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Fresh 1.6.0 (Deno web framework)
- MongoDB (via npm:mongodb@6.3.0 Node.js driver)
- Deno runtime (npm: specifier compatibility)
- Preact (islands architecture, JSX rendering)

## Sources Consulted
- Fresh 1.x documentation: https://fresh.deno.dev/docs/1.x/getting-started/custom-handlers
- Fresh file routing: https://fresh.deno.dev/docs/concepts/file-routing
- Fresh official site: https://fresh.deno.dev/
- Deno configuration docs: https://docs.deno.com/runtime/fundamentals/configuration/
- MongoDB Node.js driver docs: https://www.mongodb.com/docs/drivers/node/current/
- MongoDB npm package: https://www.npmjs.com/package/mongodb
- Deno npm specifier docs: https://docs.deno.com/runtime/fundamentals/node/#using-npm-packages

## Issues Found
1. **Scaffolding command creates wrong Fresh version**: The original command `deno run -A -r https://fresh.deno.dev my-app` now scaffolds a Fresh 2.x project, which is incompatible with the Fresh 1.6.0 code patterns used throughout the post (Handlers, PageProps, ctx.render()). Fixed to `deno run -A https://deno.land/x/fresh@1.6.0/init.ts my-app` to pin the init script to the same version used in the import map.

2. **Misleading section header**: "Load in `deno.json`" implied the deno.json configuration would load the .env file, but it simply shows the project's deno.json content. Changed to "Add to `deno.json`" for consistency with the preceding "Add to `.env`" section.

## Review Notes
- Fresh 2.x (currently at 2.2.x) is the latest stable version with breaking API changes (unified handler signatures, removed ctx.render() in favor of async components, etc.). The post targets Fresh 1.6.0 which is outdated but the code is correct for that version. A future update to Fresh 2.x patterns would be beneficial.
- The MongoDB Node.js driver is at version 7.x; the post pins 6.3.0 which works but is not the latest.
- The `ObjectId` import in the API route handler is unused in the shown code, but this is not an error — it may be used in handlers not included in the tutorial.
- The `.env` file loading relies on Deno's automatic .env support (available in Deno 2.x) or manual environment variable setting. The code provides fallback defaults (`?? "mongodb://localhost:27017"`) so the application works even without .env loading.
- The `JSON.parse(JSON.stringify(posts))` pattern in the SSR route is a valid workaround to strip MongoDB-specific types (like ObjectId) before passing data to the Preact component.
