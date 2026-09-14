# Sentry Says “Discarded Session Because of Missing Release”: How to Restore Release Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sentry, Release Management, JavaScript, Error Tracking, Monitoring

Description: Fix missing-release session drops by binding a stable release during SDK initialization and verifying session envelopes and release-health data.

---

An application can send error events successfully while its Release Health view remains empty. If the SDK reports that it discarded a session because the release is missing, the failure occurs before that session reaches Sentry. Creating a release in the UI afterward does not add the missing release value to the running application's session.

The repair is to make a stable release identifier available when the SDK initializes, confirm automatic session tracking remains enabled, and inspect fresh session data from the deployed build.

## Understand the missing relationship

A release identifies a deployed version of the application. A session represents interaction with that application and is linked to a release. Release Health aggregates session data to describe adoption and stability. See [Sentry's JavaScript Releases & Health documentation](https://docs.sentry.io/platforms/javascript/configuration/releases/).

The JavaScript SDK source includes a diagnostic for a missing or non-string session release. This distinction matters: a numeric build number or an undefined environment variable is not the same thing as a valid release string. See the [Sentry JavaScript client implementation](https://github.com/getsentry/sentry-javascript/blob/10.74.0/packages/core/src/client.ts).

A project DSN identifies where telemetry goes. It does not identify which build produced it. An environment identifies deployment context, such as production or staging. It does not replace the release either.

## Bind the release before initialization

Use one release string for a particular deployable artifact. For example, `storefront@2.8.0+f41c9a7` combines an application name, version, and source revision. Your naming convention can differ, but it should remain stable for the build.

For a browser application whose deployment writes a small public configuration object before the application bundle loads:

```html
<script>
  window.__APP_CONFIG__ = {
    release: "storefront@2.8.0+f41c9a7",
    environment: "production"
  };
</script>
```

Initialize Sentry from that value:

```javascript
import * as Sentry from "@sentry/browser";

export function requireRelease(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Application release metadata is missing");
  }
  return value.trim();
}

const config = window.__APP_CONFIG__;
const release = requireRelease(config?.release);

Sentry.init({
  dsn: "https://PUBLIC_KEY@o0.ingest.sentry.io/PROJECT_ID",
  release,
  environment: config.environment,
});
```

The inline object contains public build metadata only. Generate it safely with a serializer and your site's Content Security Policy requirements; do not interpolate unescaped request input into a script tag.

The example rejects missing metadata immediately. In an application where telemetry must not interrupt startup, enforce this check in the deployment pipeline and use a documented runtime fallback policy. Avoid silently assigning every broken build to `unknown`, because that produces misleading release-health aggregation.

## Check build-time versus runtime variables

A common failure is configuring `SENTRY_RELEASE` in CI but never exposing the value to the browser bundle. Browsers do not automatically inherit a deployment shell's environment variables. Your bundler must replace or inject the value, or the server must provide public runtime configuration.

Another failure is initializing Sentry before an asynchronous configuration request finishes. Automatic session creation can happen before the release becomes available. Supply the release synchronously at initialization instead of trying to repair it later with `setTag("release", ...)`.

A release tag attached manually to an event is not equivalent to the SDK's release option. Likewise, mutating an error in `beforeSend` does not repair separately generated session envelopes. Sentry documents `release` as an initialization option in the [SDK configuration reference](https://docs.sentry.io/platforms/javascript/configuration/options/#release).

Keep the release string consistent with CI release creation and artifact upload workflows. Use the exact value, including application prefix and build suffix. A timestamp generated on every application launch would split identical code into many apparent releases.

## Verify the session integration

Current browser SDKs send sessions by default and use the `BrowserSession` integration. They create sessions on page load and supported history navigation. If you replace the default integrations or remove that integration, supplying a release alone will not restore automatic session data. See the [browser session behavior](https://docs.sentry.io/platforms/javascript/configuration/releases/#release-health).

Older SDK versions may expose different session settings. Inspect your installed version's documentation instead of adding an old `autoSessionTracking` example to a newer integration-based configuration.

Session Replay is a separate feature. Enabling replay recordings does not fix missing Release Health sessions, and changing replay sample rates is not a solution to the missing-release diagnostic.

## Inspect a fresh deployed session

Open the deployed build in a clean browser session and enable temporary SDK debug output in a test environment. Confirm the resolved release value is a non-empty string and the missing-release message no longer appears.

In the network inspector, look for the envelope request and its session item. Verify that the release attribute matches the intended build. If there is no session item, inspect initialization and integrations. If the item exists but transport fails, investigate the ingest response, tunnel behavior, content blocking, and network errors.

Next, find the release in Sentry with the correct project, environment, and time range. Allow processing time, then verify that fresh session data appears. Test both a normal session and a controlled failure so you can confirm that the health view reflects the expected behavior.

Missing historical sessions cannot be recreated just by fixing today's configuration. Record the deployment time of the repair so charts spanning that boundary are interpreted correctly. Future releases should include a deployment check that verifies release metadata before any session starts.

## References

- [JavaScript releases and sessions](https://docs.sentry.io/platforms/javascript/configuration/releases/)
- [SDK release configuration](https://docs.sentry.io/platforms/javascript/configuration/options/)
- [SDK session-release validation](https://github.com/getsentry/sentry-javascript/blob/10.74.0/packages/core/src/client.ts)
