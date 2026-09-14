# How to Stop Development, Localhost, and Staging Errors from Polluting Sentry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sentry, JavaScript, Monitoring, Error Tracking, Filtering

Description: Keep production Sentry data clean with explicit deployment identity, conditional SDK initialization, separate staging projects, and carefully scoped filters.

Setting `environment: "staging"` labels an event. It does not stop that event from reaching Sentry, consuming accepted-event capacity, or entering views that include all environments. If your production project contains thousands of localhost failures, start with the decision to send, then configure labels and views.

A practical policy is to send production errors to the production project, send intentional staging diagnostics to a separate project, and leave ordinary local development uninitialized. The exact split is an application decision; the SDK needs an explicit implementation of it.

## Define deployment identity independently of build optimization

Many staging applications run optimized production builds. Checking `NODE_ENV === "production"` alone therefore includes staging. In Vite, `import.meta.env.PROD` reflects production execution mode, while `import.meta.env.MODE` reflects the selected mode. `vite build --mode staging` can still produce a production build. See [Vite's mode documentation](https://vite.dev/guide/env-and-mode.html#node-env-and-modes).

Use a deployment label that your pipeline owns:

```dotenv
# Values supplied to the production build job.
VITE_DEPLOYMENT_ENV=production
VITE_SENTRY_DSN=https://PUBLIC_KEY@o123.ingest.sentry.io/456
```

Do not infer production from an arbitrary substring such as `hostname.includes("example.com")`. That also matches unrelated names containing the same text. If host checks are part of your policy, compare an exact origin or a carefully controlled set of hostnames.

Remember that Vite client environment variables are substituted when the bundle is built. A later server environment change does not update those bytes. Applications that promote one bundle through several environments should instead use a deployment-generated public runtime configuration loaded before initialization. Keep that configuration's environment label and DSN consistent.

## Initialize only where collection is intended

For a Vite browser application that only reports production errors:

```javascript
import * as Sentry from "@sentry/browser";

const deployment = import.meta.env.VITE_DEPLOYMENT_ENV;
const dsn = import.meta.env.VITE_SENTRY_DSN;
const productionOrigins = new Set([
  "https://app.example.com",
  "https://www.example.com",
]);

const shouldInitialize =
  deployment === "production" &&
  productionOrigins.has(window.location.origin) &&
  typeof dsn === "string" && dsn.length > 0;

if (shouldInitialize) {
  Sentry.init({
    dsn,
    environment: "production",
  });
}
```

Run this in the browser entry point before the code whose failures you want to capture. The exact origins prevent a production bundle opened on localhost from reporting to the production project. They also mean a new legitimate domain needs a deliberate configuration update, which should be part of deployment verification.

Sentry documents that `enabled: false` stops event sending but does not eliminate all instrumentation overhead. Conditional `Sentry.init` is the clearer choice when the entire SDK should be inactive in an environment. See the [enabled option](https://docs.sentry.io/platforms/javascript/configuration/options/#enabled).

This browser gate does not configure a server SDK. Apply a corresponding deployment policy in the server entry point using server-side configuration, without referencing `window`. In applications with browser, server, and worker SDKs, inventory all three; a clean browser setup cannot prevent a staging backend from sending errors.

## Keep staging useful without mixing its events

For teams that investigate staging failures, assign staging its own project DSN and set `environment: "staging"`. Use a small explicit mapping from known deployment environments to their configuration. Unknown or missing values should not silently become production.

Separate projects improve operational separation, but they do not automatically create independent organization quotas. Check your organization's actual usage controls. Configure staging alerts for the people who use them, and keep customer-facing production alerts scoped to production.

If one project intentionally contains multiple environments, set the environment explicitly in every SDK and scope dashboards and alert rules. Sentry treats environment names as case-sensitive and creates them when it receives data. `Production`, `production`, and `prod` are different names. Hiding an environment in the UI also does not stop sending it. These behaviors are described in [Sentry's environment option](https://docs.sentry.io/platforms/javascript/configuration/options/#environment).

## Use filters as a second layer

Sentry provides a localhost inbound filter and allowed-domain controls in project settings. These can catch unexpected traffic while a corrected bundle rolls out. Inbound filters operate at ingestion and filtered events do not consume quota, according to [Sentry's filtering documentation](https://docs.sentry.io/concepts/data-management/filtering/).

Do not confuse these controls with the SDK's `allowUrls` and `denyUrls`. Those options inspect script URLs in exception stack frames, not the page's deployment environment. A localhost page may load its script from a production CDN, and a production page may execute a legitimate third-party script. A script-domain rule is therefore a poor substitute for deployment gating. See [client-side filtering](https://docs.sentry.io/platforms/javascript/configuration/filtering/#using-allowurls-and-denyurls).

If an application intentionally initializes everywhere, a defensive `beforeSend` check can discard error and message events based on explicit deployment metadata. It does not suppress every product category: traces, logs, sessions, and replay have their own collection controls. Conditional initialization avoids leaving those channels enabled by accident.

## Verify the policy using a small matrix

Test actual deployed bundles, including their embedded configuration:

| Deployment | Browser origin | Expected behavior |
| --- | --- | --- |
| production | approved production origin | controlled error reaches production |
| production build copied locally | localhost | SDK remains uninitialized |
| staging | staging origin | staging project only, if enabled |
| development | localhost | no production envelope |
| missing deployment label | any origin | no production initialization |
| production | newly added production domain | fails until the allowlist is updated |

Inspect the Network panel and the receiving event's project and environment. A quiet Issues page alone is insufficient: a UI filter could hide events that still arrive. Conversely, confirm the positive production case so that suppressing noise does not disable all reporting.

Keep a representative smoke test in the release process and review unexpected environment labels after deployment. Once the code policy is established, occasional nonproduction events become a traceable configuration defect instead of routine production noise.

## References

- [Sentry SDK options](https://docs.sentry.io/platforms/javascript/configuration/options/)
- [Sentry SDK filtering](https://docs.sentry.io/platforms/javascript/configuration/filtering/)
- [Sentry inbound filters](https://docs.sentry.io/concepts/data-management/filtering/)
- [Vite environment variables and modes](https://vite.dev/guide/env-and-mode.html)
