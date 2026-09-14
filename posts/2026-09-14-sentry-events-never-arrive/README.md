# Trace Missing Sentry Events: DSN, CORS, Ad Blockers, and Rejections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sentry, JavaScript, Error Tracking, Debugging, Troubleshooting

Description: Trace a missing Sentry browser error from SDK initialization through transport, browser policy, ingestion outcomes, and project filters.

A missing Sentry issue can mean that the application never captured an error, the SDK discarded it, the browser blocked delivery, or Sentry rejected or filtered the envelope. Start by identifying the last successful step. Changing the DSN repeatedly obscures that evidence.

This guide uses the JavaScript browser SDK. Framework SDKs use the same underlying concepts, but initialization belongs in their documented browser entry point. Diagnose a controlled application error before investigating a complex user report.

## Create one recognizable probe

Add a temporary, access-controlled diagnostic action to application code that runs after initialization:

```javascript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://PUBLIC_KEY@o123.ingest.sentry.io/456",
  environment: "diagnostic",
  debug: true,
  sampleRate: 1.0,
});

export function sendDiagnosticError() {
  const probe = crypto.randomUUID();
  const eventId = Sentry.captureException(
    new Error("Sentry delivery diagnostic"),
    { tags: { diagnostic_probe: probe } },
  );
  return { probe, eventId };
}
```

Replace the example DSN with the project's actual client DSN. Run the action once and record the identifiers, time, deployed release, browser, and project. A returned event ID identifies an attempted capture; it does not acknowledge server storage. Avoid testing solely by throwing into the browser's DevTools console, which is a different execution path from application code.

Sentry's [troubleshooting guide](https://docs.sentry.io/platforms/javascript/troubleshooting/) recommends checking the DSN, environment-variable substitution, blockers, SDK debug output, and quota. The probe makes those checks reproducible.

## Prove initialization and capture separately

Put a breakpoint immediately after `Sentry.init` and another in the diagnostic action. Verify that both execute in the browser bundle you actually deployed. Check for conditional initialization, a loader script that never loaded, or an exception occurring before the SDK starts.

Inspect the DSN's host, public key, and project ID against project settings. Copy the regional ingestion hostname exactly; do not replace it with `sentry.io` or a hostname from an older example. A browser DSN is intended for client configuration. An API authentication token used for source-map uploads is a different credential and must stay out of the browser.

For Vite, a server environment variable is not automatically a browser variable. Client values normally use the `VITE_` prefix and are replaced during the build. Restarting a deployment container with a new variable does not rewrite an existing static bundle. See [Vite's environment-variable documentation](https://vite.dev/guide/env-and-mode.html).

Next inspect `enabled`, `sampleRate`, `ignoreErrors`, URL filters, custom event processors, and `beforeSend`. A `beforeSend` callback returning `null` intentionally discards an error. A callback that forgets to return the event is also broken. Temporarily narrow these settings in the diagnostic deployment, preserving any required data redaction. Error sampling uses `sampleRate`; changing `tracesSampleRate` does not restore missing error events. These controls are documented in [SDK options](https://docs.sentry.io/platforms/javascript/configuration/options/).

## Follow the envelope in the Network panel

Keep the Network panel open, preserve its log, and trigger the probe. Search for `envelope` or your configured tunnel path.

| Observation | What to investigate next |
| --- | --- |
| No request and no capture breakpoint | application initialization or execution |
| Capture executes, SDK reports a discard | sampling, filters, processors, or queue state |
| Request shows a browser blocking reason | extension, CSP, DNS, TLS, or browser policy |
| HTTP response is a redirect or application HTML | proxy routing or authentication middleware |
| HTTP response rejects the envelope | response details and Sentry ingestion outcomes |
| Request succeeds but no visible issue | project selection, filters, and event processing |

A request row marked pending is not proof of delivery. Inspect the payload, response status, timing, and response headers. If a service worker intercepts the route, inspect its behavior too. Record observations before disabling extensions or changing the network.

## Distinguish three browser-policy failures

An ad blocker can prevent the SDK script from loading or block the ingestion request after capture. Bundle the SDK through your package manager to address the first problem. A same-origin tunnel can address some ingestion blocking, but it introduces a server component you must operate; it does not guarantee that every browser policy will permit delivery.

CSP is separate from CORS. If the console reports a `connect-src` violation, update the application's actual CSP to allow the exact ingestion destination or same-origin tunnel. Test the effective response header, including policies added by a CDN.

There are also two different CORS investigations:

- A blocked envelope request concerns communication with the ingestion endpoint or your proxy.
- An unhelpful cross-origin `Script error.` concerns access to exception details from a script served by another origin. The script may need `crossorigin="anonymous"` and appropriate CORS response headers on its asset host.

Fixing asset CORS does not repair a proxy returning a login page. Likewise, adding permissive headers to the application server does not change headers returned by another server. Sentry explains the asset and tunnel cases in its [browser troubleshooting documentation](https://docs.sentry.io/platforms/javascript/troubleshooting/).

## Inspect ingestion outcomes before changing capture code

Check the response status and the organization's Stats page for the corresponding project and period. Look for filtered events, invalid events, client discards, and rate limits. An HTTP `429` points toward rate limiting; inspect `Retry-After` and `X-Sentry-Rate-Limits` when present. A `413` suggests a body or item size limit, potentially imposed by your proxy before Sentry sees the request.

Sentry's [Stats documentation](https://docs.sentry.io/product/stats/) distinguishes causes such as disallowed domains, missing projects, invalid payloads, exhausted quota, and SDK-side discards. Use the recorded category rather than assuming every missing event is a CORS problem. A tunnel must preserve upstream rejection statuses and rate-limit headers; returning `200` for every upstream response conceals the diagnosis.

Finally, search the correct project over a broad enough time window, clear environment and issue-status filters, and look for the event ID. An accepted event can belong to an existing issue rather than create a new one. Once the probe appears, restore normal settings, remove the diagnostic trigger, and confirm that one representative real failure follows the same path.

## References

- [Sentry JavaScript troubleshooting](https://docs.sentry.io/platforms/javascript/troubleshooting/)
- [Sentry JavaScript SDK options](https://docs.sentry.io/platforms/javascript/configuration/options/)
- [Sentry event filtering](https://docs.sentry.io/platforms/javascript/configuration/filtering/)
- [Sentry Stats and ingestion outcomes](https://docs.sentry.io/product/stats/)
- [Vite environment variables and modes](https://vite.dev/guide/env-and-mode.html)
