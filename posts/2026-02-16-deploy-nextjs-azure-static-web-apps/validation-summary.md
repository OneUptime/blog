# Validation Summary: How to Deploy a Next.js Application to Azure Static Web Apps

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Next.js
- React
- Azure Static Web Apps
- Azure Functions
- Azure CLI
- GitHub Actions
- GitHub CLI

## Sources Consulted
- Next.js Static Exports documentation: https://nextjs.org/docs/14/pages/building-your-application/deploying/static-exports
- Next.js `generateStaticParams` documentation: https://nextjs.org/docs/app/api-reference/functions/generate-static-params
- Next.js 15 release notes / removed `swcMinify` option: https://nextjs.org/blog/next-15
- Next.js Content Security Policy guide: https://nextjs.org/docs/app/guides/content-security-policy
- Azure Static Web Apps Next.js support: https://learn.microsoft.com/en-us/azure/static-web-apps/nextjs
- Azure Static Web Apps configuration: https://learn.microsoft.com/en-us/azure/static-web-apps/configuration
- Azure Static Web Apps API support with Azure Functions: https://learn.microsoft.com/en-us/azure/static-web-apps/apis-functions
- Azure Functions Node.js v4 programming model migration: https://learn.microsoft.com/en-us/azure/azure-functions/functions-node-upgrade-v4
- Azure Static Web Apps application settings: https://learn.microsoft.com/en-us/azure/static-web-apps/application-settings
- Azure Static Web Apps monitoring: https://learn.microsoft.com/en-us/azure/static-web-apps/monitor
- Azure CLI `az staticwebapp create` reference: https://learn.microsoft.com/en-us/cli/azure/staticwebapp
- Azure CLI `az staticwebapp appsettings` reference: https://learn.microsoft.com/en-us/cli/azure/staticwebapp/appsettings
- Azure CLI `az staticwebapp hostname` reference: https://learn.microsoft.com/en-us/cli/azure/staticwebapp/hostname

## Issues Found
- The post described the sample dynamic route as server-side rendering while the guide configures `output: 'export'`. Static export does not support SSR or ISR, so the wording was changed to static generation for known route parameters.
- The dynamic route example used `next: { revalidate: 3600 }`, which implies Incremental Static Regeneration. ISR is unsupported for static export, so the revalidation option and cache comment were removed.
- The App Router page example used synchronous `params`. Current Next.js documentation types `params` as a promise in examples, so the sample now awaits `params`.
- The intro and description implied hybrid/on-demand rendering or Next.js API route support for this deployment path. They now describe static export plus an integrated Azure Functions API backend.
- The workflow example omitted `IS_STATIC_EXPORT: true`, which Azure documents for statically exported Next.js deployments using the Static Web Apps action. The environment variable was added.
- The Azure Functions API setup ran `npm install` without installing the required `@azure/functions` dependency and omitted the v4 programming model entry point and `host.json`. The setup now installs `@azure/functions` and adds the required `main` and `host.json` guidance.
- The API setup created only the `api` directory but later instructed readers to create `api/src/functions/hello.js`. The command now creates `api/src/functions` up front.
- The `staticwebapp.config.json` placement was described as the project root. For a Next.js build with `output_location: "out"`, the file must be copied to the output root; the instructions now place it in `public/staticwebapp.config.json`.
- The Azure CLI example used `eastus`, which is not the region shown in the official Static Web Apps CLI examples and may fail for Static Web Apps availability. It was changed to `eastus2`.
- The prerequisites omitted GitHub CLI even though the post uses `gh repo create`. GitHub CLI was added to the prerequisites.
- The custom headers example used a strict `Content-Security-Policy: default-src 'self'`, which can block required Next.js inline scripts/styles unless CSP is configured with compatible nonces, hashes, or unsafe-inline allowances. The CSP header was removed from the basic routing example.
- The build optimization config included `swcMinify`, which was removed as a configurable option in Next.js 15 because the behavior is enabled by default. The option was removed.
- The monitoring section implied that manually setting `APPINSIGHTS_INSTRUMENTATIONKEY` is the normal integration path. It now notes that the Azure portal can enable Application Insights and create the associated application setting, while still showing the CLI setting option.

## Review Notes
- The guide is technically valid for a static-exported Next.js app deployed to Azure Static Web Apps with an Azure Functions API. It is not a guide for full hybrid Next.js hosting, SSR, ISR, middleware, Next.js Route Handlers, or Next.js API routes.
- The `routes` example protects `/api/*` with the `authenticated` role. That is valid Azure Static Web Apps configuration, but readers should understand it overrides the anonymous function trigger at the Static Web Apps routing layer.
