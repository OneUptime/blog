# Validation Summary: How to Stop Development, Localhost, and Staging Errors from Polluting Sentry

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Sentry JavaScript Browser SDK (`@sentry/browser`)
- Sentry projects, environments, inbound filters, quotas, and client-side filtering
- JavaScript browser applications
- Vite environment variables, modes, and production builds
- Deployment-time and runtime configuration

## Sources Consulted

- [Sentry JavaScript SDK options](https://docs.sentry.io/platforms/javascript/configuration/options/)
- [Sentry JavaScript SDK filtering](https://docs.sentry.io/platforms/javascript/configuration/filtering/)
- [Sentry inbound filters](https://docs.sentry.io/concepts/data-management/filtering/)
- [Sentry quota documentation](https://docs.sentry.io/pricing/quotas/)
- [Vite environment variables and modes](https://vite.dev/guide/env-and-mode.html)
- [Vite CLI documentation](https://vite.dev/guide/cli.html)

## Issues Found
No technical issues found.

## Review Notes

- The conditional `Sentry.init` example is syntactically correct and uses current SDK options.
- The distinction between Vite mode, `NODE_ENV`, and `import.meta.env.PROD` is accurate, including the behavior of `vite build --mode staging`.
- Sentry's current documentation confirms that `enabled: false` retains instrumentation overhead and recommends conditional initialization for completely disabling the SDK.
- Sentry's current documentation confirms that environments are created from received events, are case-sensitive, and can be hidden but not deleted.
- The descriptions of `allowUrls`, `denyUrls`, `beforeSend`, localhost filtering, allowed domains, ingestion-time filtering, and filtered-event quota behavior are accurate.
- The separate-project recommendation is correctly presented as operational isolation rather than a guarantee of separate organization quota pools.
