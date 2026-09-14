# Fix Split Sentry Issues by Normalizing URLs, Releases, and Stack Frames

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sentry, JavaScript, Source Maps, Debugging, Error Tracking

Description: Diagnose split Sentry issues using grouping evidence, preserve source-map identity, and normalize only the proven unstable parts of an error event.

Two Sentry issues with the same visible message are not necessarily duplicates. Their stacks may identify different code paths. Conversely, one application defect can split into several issues when minified frames, unstable file paths, wrappers, or custom fingerprints change the grouping input.

Release names and request URLs deserve inspection, but neither is a universal default grouping key. A release can affect grouping indirectly through source-map lookup or a custom rule. Removing release metadata to force a merge can therefore make diagnosis worse.

## Compare representative events before changing rules

Open one event from each issue and compare Event Grouping Information, then the raw event JSON. Sentry's [grouping documentation](https://docs.sentry.io/concepts/data-management/event-grouping/) describes explicit fingerprints, stack-based grouping, exception fallback, and message fallback.

Build a short comparison table:

| Field | Question |
| --- | --- |
| custom fingerprint | does it include a request ID, release, or full URL? |
| exception type and value | is a wrapper replacing the original error? |
| stack frames | are source files and functions comparable? |
| in-app classification | are the same application frames used? |
| release, dist, debug IDs | can each event find its exact source artifacts? |
| SDK and grouping configuration | did a capture or project configuration change? |

Choose several events, not just the latest occurrence. One issue may contain an older build while another contains a new deployment that changed the stack. Preserve that distinction until you establish that both represent the same defect.

## Repair source-map identity first

Minified JavaScript destroys useful stack structure. Sentry specifically calls out source maps as important for grouping. Ensure every deployed bundle has its matching uploaded map, and use an event generated after the upload when verifying the fix. See [JavaScript source-map troubleshooting](https://docs.sentry.io/platforms/javascript/sourcemaps/troubleshooting_js/).

Check release and distribution values when your artifact workflow uses them. For a Debug ID workflow, verify that the executed bundle and uploaded map contain the corresponding identity and that the event carries the debug metadata. Do not assume an upload for the same Git commit proves identity if the application was rebuilt afterward.

Normalize release naming in the deployment pipeline: one immutable build should have one consistent release name across SDK configuration and artifact upload. Do not give every request a new release, and do not erase releases to combine issues. The release remains useful for regression analysis even when it is not the field creating the split.

Avoid rewriting a browser frame from `/assets/app.a1b2.js` to `/assets/app.js` before proving how Sentry locates its source map. Cosmetic removal of hashes can break artifact matching. The grouping engine already normalizes some revision-related filename variation, so inspect the actual grouping evidence before adding another transformation.

## Preserve the original exception stack

A reporting wrapper can turn the same underlying exception into several stacks, or make many different exceptions share a wrapper location. Prefer capturing the original error while adding operation context:

```javascript
import * as Sentry from "@sentry/browser";

export async function runExport(exportOperation) {
  try {
    return await exportOperation();
  } catch (error) {
    Sentry.withScope(scope => {
      scope.setTag("operation", "invoice-export");
      Sentry.captureException(error);
    });
    return { ok: false };
  }
}
```

This boundary owns the handled report and returns a fallback. If your architecture rethrows instead, decide which outer boundary owns capture rather than reporting at every layer. Creating `new Error(String(error))` at each boundary discards the original error identity and makes the wrapper part of the diagnostic evidence.

Messages have another trap: toggling `attachStacktrace` changes whether captured messages include a stack. Sentry explicitly documents that this can create new groups. Treat changes to that option as a reporting-policy change, not a harmless formatting preference. See [attachStacktrace](https://docs.sentry.io/platforms/javascript/configuration/options/#attachstacktrace).

## Normalize deployment paths only when justified

On a Node.js service, checkout directories may differ between deploys while the application-relative path is stable. Sentry's RewriteFrames integration can remove a configured root and add a stable prefix:

```javascript
import * as Sentry from "@sentry/node";

const applicationRoot = process.env.APP_ROOT;
if (!applicationRoot) {
  throw new Error("APP_ROOT must identify the deployed application root");
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    Sentry.rewriteFramesIntegration({
      root: applicationRoot,
      prefix: "app:///",
    }),
  ],
});
```

For an application root `/srv/releases/build-123/app`, a frame under that root can become an application-relative `app:///...` filename. Keep the resulting naming compatible with your artifact workflow. The [RewriteFrames documentation](https://docs.sentry.io/platforms/javascript/configuration/integrations/rewriteframes/) describes the `root`, `prefix`, and custom `iteratee` options.

Do not strip every directory down to the basename: `billing/index.js` and `auth/index.js` would become indistinguishable. Likewise, do not remove arbitrary frames simply because doing so merges an example. If a framework wrapper should not participate in grouping, use reviewed stack-trace rules or the SDK's documented application-frame configuration, then test other failures through the same wrapper.

## Separate route context from grouping policy

A request URL such as `/invoices/8734/export` can remain useful context without becoming a custom fingerprint. If a fingerprint currently includes that entire URL, replace the variable segment with an application-defined route template such as `/invoices/:id/export` and preserve the operation and failure category that matter.

Do not apply a global regex that replaces every number in every message or path. Status codes, protocol versions, and meaningful identifiers can distinguish different defects. Normalize the specific field at the point where the application knows its semantics.

When default grouping is otherwise useful, extend it with `{{ default }}` and bounded dimensions. When deliberately merging different default groups, a fully custom fingerprint is possible, but it removes stack distinctions. Sentry documents both choices in [SDK fingerprinting](https://docs.sentry.io/platforms/javascript/enriching-events/fingerprinting/).

## Verify the fix against a corpus

Test the suspected same defect across two deployments and two request IDs, plus an unrelated error that shares the visible message. The first pair should converge if your policy intends that; the unrelated error must retain its distinction.

Inspect newly processed events after rollout. Grouping configuration changes do not automatically rewrite every historical issue. Merge older issues only after reviewing their evidence, and monitor the range of exception types and application frames inside the resulting issue. The desired result is one coherent investigation per failure pattern, not merely fewer rows in the issue list.

## References

- [Sentry issue grouping](https://docs.sentry.io/concepts/data-management/event-grouping/)
- [Sentry source-map troubleshooting](https://docs.sentry.io/platforms/javascript/sourcemaps/troubleshooting_js/)
- [Sentry RewriteFrames integration](https://docs.sentry.io/platforms/javascript/configuration/integrations/rewriteframes/)
- [Sentry SDK fingerprinting](https://docs.sentry.io/platforms/javascript/enriching-events/fingerprinting/)
- [Sentry attachStacktrace option](https://docs.sentry.io/platforms/javascript/configuration/options/#attachstacktrace)
