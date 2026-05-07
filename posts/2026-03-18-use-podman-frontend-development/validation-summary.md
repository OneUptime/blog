# Validation Summary: How to Use Podman for Frontend Development

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- React
- Vue.js
- Angular
- Vite
- Node.js and npm
- Cypress
- Nginx
- Storybook
- Bun

## Sources Consulted
- Podman `run` reference: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `pod create` reference: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- React installation docs: https://react.dev/learn/installation
- React deprecation notice for Create React App: https://react.dev/blog/2025/02/14/sunsetting-create-react-app
- Vue tooling guide: https://vuejs.org/guide/scaling-up/tooling
- Vite getting started guide: https://vite.dev/guide/
- Vite server options: https://vite.dev/config/server-options
- Vite production build guide: https://vite.dev/guide/build.html
- Angular CLI `ng serve` reference: https://angular.dev/cli/serve
- Cypress CI and Docker image docs: https://docs.cypress.io/app/continuous-integration/overview
- Cypress CLI reference: https://docs.cypress.io/app/references/command-line
- Official Cypress Docker images repository: https://github.com/cypress-io/cypress-docker-images
- Storybook CLI options: https://storybook.js.org/docs/api/cli-options
- Nginx `proxy_pass` module reference: https://nginx.org/en/docs/http/ngx_http_proxy_module.html

## Issues Found
- The React section scaffolded new apps with `create-react-app`, which React now deprecates for new projects. I replaced it with a Vite-based React setup and updated the container port and startup command to match Vite.
- The React container example still used Create React App and webpack-dev-server settings (`npm start`, port `3000`, `WATCHPACK_POLLING`, `WDS_SOCKET_PORT`, `BROWSER=none`). I updated it to a Vite-compatible development container on port `5173`.
- The Vue section mixed a Vite workflow with a global `@vue/cli` installation. Vue’s official tooling guide recommends `create-vue`/Vite for new projects and notes that Vue CLI is in maintenance mode, so I removed the unnecessary global Vue CLI install.
- The Vue Vite config used `hmr.port` with a comment that implied it was required for outside-container access. Per Vite’s current server docs, `host`, `port`, `strictPort`, and `watch.usePolling` are the relevant settings here, so I corrected that snippet.
- The Angular container installed `@angular/cli` globally, which can drift from the app’s local Angular version. I changed the example to run the project-local CLI with `npx ng serve`.
- The Cypress examples used the floating `cypress/included:latest` tag. The official Cypress Docker images docs warn that `latest` can change without notice, so I pinned the examples to `cypress/included:15.14.2`.
- The Cypress examples still targeted `http://localhost:3000`, which no longer matched the corrected Vite-based React example. I updated them to `http://localhost:5173`.
- The pod-based test example mounted the entire project over `/app` in the `react-dev` container, which would hide the image’s installed dependencies. I changed that example to mount only `src` and `public` into the dev-server container.
- The production multi-stage example copied `/app/build`, which is Create React App output, not Vite output. I corrected it to `/app/dist` and narrowed the section to Vite-based apps.
- The production build section was written as if it applied equally to Angular, but Angular commonly outputs to `dist/<project-name>`. I added a short note so that guidance is accurate for Angular readers.
- The Nginx example proxied `/api/` to `localhost:3001` without clarifying the network assumption. I updated the note to make it clear that this only makes sense when the backend shares the same pod.

## Review Notes
- The post is technically salvageable and now accurate after the fixes above.
- The examples intentionally assume common default ports: `5173` for Vite and `4200` for Angular. Projects with custom `server.port` or Angular workspace settings should adjust those values.
- The Cypress image is pinned to `15.14.2`, which matches the current Cypress release information reviewed on May 7, 2026. This tag should be revisited in future refreshes.
