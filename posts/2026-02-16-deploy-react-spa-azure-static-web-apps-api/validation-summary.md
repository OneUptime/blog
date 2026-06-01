# Validation Summary: How to Deploy a React Single Page Application to Azure Static Web Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- React
- TypeScript
- Vite
- Azure Static Web Apps
- Azure Functions for Node.js
- Azure Static Web Apps CLI
- Azure CLI
- GitHub CLI

## Sources Consulted
- Vite Getting Started documentation: https://vite.dev/guide/
- Azure Static Web Apps configuration documentation: https://learn.microsoft.com/en-us/azure/static-web-apps/configuration
- Azure CLI `az staticwebapp create` documentation: https://learn.microsoft.com/en-us/cli/azure/staticwebapp?view=azure-cli-latest#az-staticwebapp-create
- Azure Functions Node.js developer reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node
- Azure Static Web Apps CLI `swa start` documentation: https://azure.github.io/static-web-apps-cli/docs/cli/swa-start/
- Local command checks: `npx @azure/static-web-apps-cli --help`, `npx @azure/static-web-apps-cli start --help`, `npm view vite engines`, `npm view @azure/functions engines`

## Issues Found
- The prerequisites said Node.js 18 or later, but current Vite requires Node.js 20.19+ or 22.12+, and the current `@azure/functions` package requires Node.js 20+. Updated the prerequisite to Node.js 20.19+ or 22.12+.
- The Vite React TypeScript snippets imported `Task` as a runtime import. The current Vite React TypeScript template enables `verbatimModuleSyntax`, so type-only imports are required. Updated the imports to `import type { Task }`.
- The API setup created `api/src/functions/tasks.js` but did not configure the Azure Functions v4 package entry point or include `host.json`. Added `npm pkg set main="src/functions/*.js"` and a minimal `api/host.json`.
- The Static Web Apps config was described as a root file even though Vite needs build-output assets copied into `dist`. Updated the location to `public/staticwebapp.config.json`, which Vite copies to the build output, and added `platform.apiRuntime` for Node.js 20.
- The deployment commands used a resource group without creating it and assumed the local Git branch was already `main`. Added `git branch -M main` and `az group create`.
- The post used `gh repo create` but did not list GitHub CLI as a prerequisite. Added it.
- The local testing command implied that `swa start http://localhost:5173` starts the Vite dev server. SWA CLI documentation says a framework dev server must already be running unless `--run` is used. Updated the instructions to start `npm run dev` in one terminal and `swa start` in another.
- The authentication route example used exact `/api/tasks` matches, which would not protect `/api/tasks/{id}` or `/api/tasks/{id}/toggle`. Updated the route patterns to `/api/tasks*`.

## Review Notes
The in-memory task array is acceptable for a tutorial demo but is not durable across serverless instance restarts or scale-out. The post already warns to use a database in production.
