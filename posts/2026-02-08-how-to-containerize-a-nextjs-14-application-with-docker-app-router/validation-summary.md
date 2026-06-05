# Validation Summary: How to Containerize a Next.js 14+ Application with Docker (App Router)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Next.js 14+ App Router
- React Server Components and Server Actions
- Docker and Dockerfile multi-stage builds
- Docker Compose
- Node.js on Alpine Linux
- Next.js standalone output and output file tracing
- Next.js environment variables
- Container health checks

## Sources Consulted
- Next.js `output: 'standalone'` / output file tracing documentation: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- Next.js environment variables guide: https://nextjs.org/docs/pages/guides/environment-variables
- Next.js production image optimization / `sharp` documentation: https://nextjs.org/docs/messages/sharp-missing-in-production
- Docker Compose services reference, including `depends_on` and `service_healthy`: https://docs.docker.com/reference/compose-file/services/
- Dockerfile reference for `HEALTHCHECK`: https://docs.docker.com/reference/dockerfile/
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/

## Issues Found
- The post described standalone output mode as essential for Docker deployments. Updated this to describe standalone mode as a useful optimization, because Next.js can be deployed in Docker without standalone mode, while standalone output is the documented way to automatically copy traced runtime files.
- The post said standalone mode includes only production dependencies and is tree-shaken to application imports. Updated this to match Next.js output file tracing behavior: standalone output copies traced files, including selected dependency files from `node_modules`.
- The environment variable section said server-side variables are read at runtime. Clarified that server-side variables are available to server code, and request-time server code can read runtime values, while `NEXT_PUBLIC_*` values are inlined at build time.
- The health check section said Dockerfile `HEALTHCHECK` applies to orchestrators like Kubernetes. Updated this to Docker/Docker Swarm and noted that Kubernetes should use liveness or readiness probes.
- The image optimization troubleshooting section omitted the standalone production requirement for `sharp`. Added that `sharp` must be installed when using Next.js image optimization with standalone output in production.

## Review Notes
The Dockerfile and Compose examples are broadly consistent with the official Next.js Docker standalone pattern. The `.dockerignore` example excludes Markdown and test files, which is reasonable for many apps but should be adjusted if an app imports those files at build time.
