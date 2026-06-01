# Validation Summary: How to Deploy a Static Web App from a GitHub Repository

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Static Web Apps
- Azure CLI
- GitHub Actions
- GitHub repositories
- Vite
- React
- Vue.js
- Angular
- Hugo
- Azure Functions
- Static Web Apps configuration

## Sources Consulted
- Microsoft Learn: Configure Azure Static Web Apps - https://learn.microsoft.com/en-us/azure/static-web-apps/configuration
- Microsoft Learn: Build configuration for Azure Static Web Apps - https://learn.microsoft.com/en-us/azure/static-web-apps/build-configuration
- Microsoft Learn: Review pull requests in pre-production environments - https://learn.microsoft.com/en-us/azure/static-web-apps/review-publish-pull-requests
- Microsoft Learn: Azure CLI az staticwebapp reference - https://learn.microsoft.com/en-us/cli/azure/staticwebapp?view=azure-cli-latest
- Microsoft Learn: Add authentication to your static site in Azure Static Web Apps - https://learn.microsoft.com/en-us/azure/static-web-apps/add-authentication
- Microsoft Learn: Custom authentication in Azure Static Web Apps - https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-custom
- React: Sunsetting Create React App - https://react.dev/blog/2025/02/14/sunsetting-create-react-app
- Vite: Getting Started - https://vite.dev/guide/
- Vite: Deploying a Static Site - https://vite.dev/guide/static-deploy
- GitHub: actions/checkout repository - https://github.com/actions/checkout

## Issues Found
- The tutorial used `npx create-react-app`, but Create React App is deprecated. Replaced the scaffold command with the current Vite React template command and added `npm install`.
- The React build settings and examples used Create React App's `build` output directory. Updated the React/Vite examples, workflow, Azure CLI command, and monorepo snippet to use Vite's default `dist` output directory.
- The environment variable example used the Create React App `REACT_APP_` prefix. Updated it to Vite's `VITE_` prefix.
- The authentication provider list used older wording, including Azure AD and Twitter. Updated it to Microsoft Entra ID and GitHub as built-in examples, with additional providers available through custom authentication configuration.
- The pull request preview environment wording implied unlimited previews for every pull request. Updated it to specify pull requests against the watched branch and mention plan limits.
- The GitHub Actions workflow used `actions/checkout@v3`, which is outdated for current GitHub Actions runtimes. Updated it to `actions/checkout@v6`.

## Review Notes
- The `staticwebapp.config.json` example uses current fields for routes, `navigationFallback`, and response overrides.
- The `az staticwebapp create` command and flags match the current Azure CLI reference.
- Azure's own generated workflow templates can vary by portal flow and authentication mode, so the workflow remains framed as an example rather than an exact generated file.
