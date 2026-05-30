# Validation Summary: How to Implement Server-Side Rendering with Next.js on Azure Container Apps

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Next.js App Router
- React Server Components and server-side rendering
- Docker multi-stage builds
- Azure Container Apps
- Azure Container Registry
- Azure CLI
- GitHub Actions

## Sources Consulted
- Next.js installation requirements: https://nextjs.org/docs/pages/getting-started/installation
- Next.js App Router page props and dynamic route params: https://nextjs.org/docs/app/api-reference/file-conventions/page
- Next.js route segment config and `dynamic = 'force-dynamic'`: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
- Next.js standalone output documentation: https://nextjs.org/docs/app/getting-started/deploying
- Next.js `output: 'standalone'` configuration: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- Docker guide for containerizing Next.js: https://docs.docker.com/guides/nextjs/containerize/
- Azure Container Apps CLI reference: https://learn.microsoft.com/en-us/cli/azure/containerapp
- Azure Container Apps scaling documentation: https://learn.microsoft.com/en-us/azure/container-apps/scale-app
- Azure GitHub Actions authentication documentation: https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-secret

## Issues Found
- The prerequisites and Dockerfile used Node.js 18, but current Next.js created by `create-next-app@latest` requires Node.js 20.9 or later. Updated the prerequisite and Docker stages to Node.js 20.
- The App Router dynamic route example typed `params` as a synchronous object. Current Next.js App Router page props expose `params` as a promise, with synchronous access only retained temporarily for compatibility in older versions. Updated the example to await `params`.
- The Dockerfile included a dependency stage that installed production dependencies but was not used by the build stage. Updated the build stage to reuse the dependency stage's `node_modules`, making the multi-stage build accurate.
- The `next.config.js` example included an empty `experimental` block and a comment claiming container optimization. Removed the no-op block so the configuration only shows the required standalone output setting.
- The GitHub Actions workflow used `azure/login@v1`; Microsoft documentation now shows `azure/login@v2` for service principal secret authentication. Updated the workflow to use `azure/login@v2`.

## Review Notes
The Azure Container Apps create and update commands use valid documented flags for ingress, target port, resource sizing, replica limits, registry credentials, environment variables, and HTTP concurrency scaling. The article's use of `--min-replicas 0` with HTTP ingress is consistent with Container Apps scale-to-zero behavior, though production apps should consider cold starts and whether a minimum replica is needed for latency-sensitive traffic.
