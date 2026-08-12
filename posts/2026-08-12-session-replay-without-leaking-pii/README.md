# Prevent PII Leaks in Session Replay

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Session Replay, Privacy, PII, Browser Monitoring, Data Governance

Description: Deploy session replay with deny-by-default capture, tested masking, sanitized URLs, disabled payload bodies, and controlled access and retention.

---

Session replay can reconstruct exactly the moment a frontend failed-and exactly the personal data the page displayed at that moment. Form fields are only one source. Account names in static DOM text, tokens in URLs, validation messages, `data-*` attributes, chat transcripts, images, canvases, and request bodies can all enter a recording.

Sampling is not a privacy control. Capturing 1% of sessions still captures the complete sensitive value in selected sessions. Build replay as a separate data product with its own threat model, consent gate, capture schema, access policy, retention, and deletion path. Start from a masked or blocked recording and selectively expose reviewed, low-risk content.

## Inventory What the Recorder Can Observe

Most web replay systems do not record a conventional video. They snapshot DOM state, styles, input and pointer events, and subsequent mutations, then reconstruct the page later. Optional features may capture canvas operations, console output, and network details. That model creates several data paths:

| Surface | Example sensitive value | Safe default |
| --- | --- | --- |
| input controls | password, email, search, support message | mask every input |
| DOM text | patient name, invoice address, chat | mask or block |
| attributes | `value`, `title`, `aria-label`, `data-email` | allowlist attributes |
| URL | reset token, search query, document ID | route template only |
| network | JSON body, authorization header, response content | metadata-only allowlist |
| media/canvas | profile photo, signature, chart of private data | block |
| console | logged object or API response | disable or scrub before capture |

Include data produced by third-party widgets and authenticated iframes in the inventory. Their DOM may be isolated, but an SDK installed inside the frame can record it independently.

## Gate Recording Before Initialization

Do not start the recorder and then ask for consent. A short pre-consent buffer is still collection. Resolve the applicable consent and policy state first, then load or initialize replay:

~~~javascript
async function startObservability() {
  const consent = await readConsentState();

  startErrorMonitoring({ replay: false });

  if (consent.sessionReplay === true && replayAllowedForRoute(location.pathname)) {
    const { startPrivacyReviewedReplay } = await import('./replay.js');
    startPrivacyReviewedReplay();
  }
}
~~~

Keep basic error monitoring and replay as separate switches. A user declining replay does not necessarily require losing a small, sanitized exception event, but the applicable policy and legal basis must be decided by the organization, not inferred by the SDK.

When consent is withdrawn, call the SDK's supported stop method, discard unsent buffers, expire local identifiers, and ensure later route transitions cannot restart capture accidentally. Test this path rather than assuming removal of a UI toggle stops a previously initialized recorder.

## Mask Inputs at the Recorder Boundary

Password fields are commonly masked by default, but an ordinary text box can contain equally sensitive data. rrweb's official guide exposes `maskAllInputs` and selector/class controls. Configure the recorder itself so supported input values are masked before emitted replay events reach your queue:

~~~javascript
import { record } from '@rrweb/record';
import { EventType } from '@rrweb/types';

export function startPrivacyReviewedReplay() {
  return record({
    emit(event) {
      enqueueEncryptedReplayEvent(sanitizeReplayEvent(event));
    },
    maskAllInputs: true,
    maskTextClass: 'replay-mask',
    blockClass: 'replay-block',
    recordCanvas: false,
    recordCrossOriginIframes: false,
  });
}
~~~

The example shows privacy intent, not a complete production transport. Pin matching versions of `@rrweb/record` and `@rrweb/types`, use the exact options they support, and use a maintained replay backend.

In rrweb, `maskAllInputs` masks its supported input value types; it does not sanitize arbitrary attributes, radio or checkbox values, hidden or file controls, or `<option>` text. Keep sensitive data out of those surfaces, pre-sanitize it, or block the containing element. Likewise, `recordCrossOriginIframes: false` disables cooperative capture from cross-origin child frames; it does not prevent same-origin iframe recording or iframe URL serialization, so block sensitive frames and keep their `src` URLs token-free.

Masking replaces text while preserving enough shape to follow the interaction. Blocking omits an entire element's subtree and replaces it with a placeholder. It is preferable when child count, media, or labels inside the subtree reveal too much. rrweb preserves the blocked element's dimensions, so place it inside a reviewed, fixed-size outer container if size itself is sensitive. Apply blocking to payment forms, health data, account settings, document viewers, authentication recovery, chat, and any component whose safety is hard to prove.

~~~html
<section class="replay-block" aria-label="Payment details">
  <!-- recorder should emit a placeholder, not this subtree -->
</section>

<p>
  Signed in as <span class="replay-mask">customer@example.com</span>
</p>
~~~

Choose a privacy-preserving global default. Datadog documents `defaultPrivacyLevel: 'mask'` as masking HTML text, user input, images, links, and `data-*` attributes, with element-level overrides. Sentry documents global text masking and media blocking. If allowing text in selected components, make `allow` an explicit reviewed annotation; do not use a broad CSS selector that future pages inherit unknowingly.

## Sanitize URLs Before They Become Navigation Events

Fragments stay in the browser, but the recorder can still see them. Queries may contain OAuth codes, reset tokens, email addresses, internal search terms, and signed storage credentials. Never use the full URL as the replay page name.

~~~javascript
const routeRules = [
  [/^\/orders\/[^/]+$/, '/orders/:id'],
  [/^\/documents\/[^/]+$/, '/documents/:id'],
  [/^\/search$/, '/search'],
];

function replayLocation(input = location.href) {
  const url = new URL(input, location.origin);
  const route = routeRules.find(([pattern]) => pattern.test(url.pathname))?.[1]
    ?? '/__other__';

  return {
    origin: url.origin,
    route,
    // Deliberately omit url.search and url.hash.
  };
}

function sanitizeReplayEvent(event) {
  if (event.type !== EventType.Meta) {
    return event;
  }

  const { origin, route } = replayLocation(event.data.href);
  return {
    ...event,
    data: {
      ...event.data,
      href: `${origin}${route}`,
    },
  };
}
~~~

Redact synchronously in the browser before an event is queued or transmitted, not only in the replay viewer. rrweb builds navigation metadata from `window.location.href`, which is why the recorder wrapper above passes every event through `sanitizeReplayEvent`. That function does not rewrite URL-bearing DOM attributes such as `href`, `src`, or `action`; keep secrets out of them or block or sanitize their elements separately. Also inspect document titles, breadcrumb labels, referrers, SPA route events, and manually added context; each can reintroduce the value removed from the URL.

OpenTelemetry's URL conventions explicitly require credentials to be removed from `url.full` and recommend scrubbing identifiable sensitive content. Its small default signed-query redaction list is not a complete application policy. Prefer an allowlist of safe query keys and closed value sets if a query dimension is truly needed.

## Keep Network Capture Metadata-Only

For most replay investigations, method, normalized route, status class, start time, and duration are sufficient:

~~~json
{
  "method": "POST",
  "route": "/api/orders/:id/confirm",
  "status_class": "2xx",
  "start_time": "2026-08-12T14:03:21.123Z",
  "duration_ms": 184,
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736"
}
~~~

Do not collect request or response bodies, cookies, authorization headers, signed URLs, form payloads, GraphQL variables, or arbitrary headers by default. If one endpoint genuinely requires a field for diagnosis, add the endpoint and field to an allowlist, transform the value in application code, cap its length, and test adversarial payloads. Never rely only on key-name regexes such as `/password|token/i`; secrets appear under unexpected names and free text contains anything.

Review fetch/XHR instrumentation separately from replay settings. A recorder may omit bodies while an error breadcrumb, console integration, or APM plugin captures them. Apply the same policy at browser SDK, intake proxy, collector, and storage.

## Do Not Confuse Masking with Anonymization

Even a visually masked replay can be linkable through session IDs, timestamps, IP-derived metadata, rare navigation paths, account cohorts, or error details. Treat replay as sensitive operational data. Controls should include:

- encryption in transit and at rest;
- a short, documented retention period;
- role-based access with least privilege;
- access logs and periodic access review;
- tenant isolation;
- deletion keyed to the organization's approved identity mapping;
- restrictions on exports and support-ticket attachments;
- vendor and data-region review.

OWASP's logging guidance says access tokens, session identifiers, passwords, sensitive personal data, encryption keys, and payment data should usually not be recorded directly, and recommends removal, masking, sanitization, hashing, or encryption as appropriate. Replay is more revealing than a conventional log, so apply at least the same discipline.

## Test the Serialized Events, Not Only the Playback

A playback showing asterisks does not prove the original value was never transmitted. In a staging environment populated only with synthetic canary values:

1. Put unique fake secrets in every input type, DOM text node, attribute, URL component, request and response body, console call, iframe, canvas, and image.
2. Exercise initial render and later DOM mutations.
3. Capture the browser's outgoing replay payload before encryption or transport where the test harness safely permits it.
4. Search decoded test events and stored backend data for every canary.
5. Verify blocked areas preserve no text or media content.
6. Test consent denial, withdrawal, logout, SPA transitions, and buffered error replay.
7. Fail CI or release approval if a canary appears.

Run the test after recorder, SDK, framework, or component-library upgrades. Mutation timing matters: a privacy class added after a component renders may be too late for the initial snapshot. Put privacy annotations in the component's rendered markup and make linting or component tests enforce them.

Track privacy-rule version, replay SDK version, and consent state with each recording using bounded non-personal values. Monitor dropped/blocked counts and configuration drift, but do not log the values that were removed.

## Official Documentation

- [Sentry Session Replay privacy controls](https://docs.sentry.io/platforms/javascript/session-replay/privacy/)
- [Sentry Session Replay setup and sampling](https://docs.sentry.io/platforms/javascript/session-replay/)
- [Datadog Session Replay privacy options](https://docs.datadoghq.com/session_replay/privacy_options/)
- [rrweb recording and privacy options](https://github.com/rrweb-io/rrweb/blob/main/guide.md)
- [OpenTelemetry URL attribute sanitization](https://opentelemetry.io/docs/specs/semconv/registry/attributes/url/)
- [OpenTelemetry handling sensitive data](https://opentelemetry.io/docs/security/handling-sensitive-data/)
- [OWASP Logging Cheat Sheet: data to exclude](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html#data-to-exclude)

## Conclusion

Safe session replay begins before the recorder runs. Gate initialization on approved policy and consent, mask all inputs, block sensitive subtrees and media, reduce URLs to route templates, and keep network capture to allowlisted metadata. Enforce the policy again at intake, restrict access and retention, and scan serialized synthetic sessions for canary secrets after every relevant upgrade. A useful replay is one that explains the failure without recreating the customer's private data store.
