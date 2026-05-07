# Validation Summary: How to Set Up a MEAN Stack with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman pods and containers
- MongoDB and the official MongoDB container image
- Express.js
- Mongoose
- Angular and Angular CLI
- Node.js container images
- Bash management scripts

## Sources Consulted
- Podman pod create documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- MongoDB official container image documentation: https://hub.docker.com/_/mongo
- MongoDB `db.createCollection()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.createcollection/
- Angular CLI `ng serve` documentation: https://angular.dev/cli/serve
- Angular version compatibility documentation: https://next.angular.dev/reference/versions
- Mongoose Model API documentation: https://mongoosejs.com/docs/api/model.html
- Node.js official container image documentation: https://hub.docker.com/_/node

## Issues Found
- The `package.json` and `proxy.conf.json` snippets used JavaScript-style `//` filename comments inside `json` code fences. Those comments would make the copied files invalid JSON, so the comments were removed from the JSON snippets.
- The API container was run with `-v ./api:/app:Z`, which would hide the `node_modules` directory installed during the image build when starting from the shown clean project structure. The mount was changed to `-v ./api/server.js:/app/server.js:Z` in both the manual commands and management script so the built dependencies remain available while the main API source file can still be live reloaded by nodemon.

## Review Notes
- The Podman pod networking explanation is accurate: containers in the same pod share the pod network stack and can communicate over localhost, while ports should be published on the pod.
- The MongoDB initialization script matches the official image behavior for `/docker-entrypoint-initdb.d/*.js` files and `MONGO_INITDB_DATABASE`.
- Angular 17 and Node 20 are version-compatible according to Angular's compatibility table, but Angular 17 is no longer in active support. A future content refresh should update the example dependency versions to a currently supported Angular release.
