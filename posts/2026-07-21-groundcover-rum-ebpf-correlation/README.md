# Groundcover RUM: Frontend Sessions and eBPF Trace Correlation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Groundcover, Real User Monitoring, RUM, eBPF, Distributed Tracing, Frontend, Session Replay

Description: Connect Groundcover browser sessions to backend eBPF traces while handling propagation, sampling, validation, and replay privacy safely.

---

A backend trace begins too late to explain many user-facing failures. It can show that an API returned in 90 milliseconds, but not that the browser waited three seconds before sending it, threw an exception afterward, or rendered a broken page.

Groundcover Real User Monitoring adds the browser side of that story. Its browser SDK collects session events, frontend errors and logs, network activity, performance data, custom events, and optional replay. Groundcover documents automatic correlation between client-side network traces and server-side traces captured through eBPF.

As of July 21, 2026, Groundcover marks RUM as available only for BYOC deployments. Confirm entitlement and the exact SDK behavior for your deployed version before planning a rollout.

## Understand the Two Observation Points

The browser SDK and the eBPF sensor see different facts:

| Browser RUM | Backend eBPF |
| --- | --- |
| Page loads and navigation | Service and resource handling the request |
| Core Web Vitals | Server latency and status |
| Clicks and other enabled events | Downstream service interactions |
| JavaScript exceptions and logs | Protocol metadata and payload context |
| Session identity and replay timeline | Kubernetes and container context |

Correlation joins those observations around a network request. The result can let an operator move from a user's session, to a failing API call, to the backend trace and nearby server telemetry.

Groundcover's capability page promises that relationship, but its public setup page does not specify every propagation header or matching rule. Treat the exact wire behavior as version-specific and prove it with a controlled request.

## Initialize the Browser SDK

Install the documented package:

```bash
npm install @groundcover/browser
```

Create a RUM-type ingestion key under **Settings > Access > Ingestion Keys**, then initialize the SDK. Keep the actual values in your deployment configuration rather than committing them to source.

```typescript
import groundcover from '@groundcover/browser';

groundcover.init({
  apiKey: 'your-rum-ingestion-key',
  cluster: 'production-eu',
  environment: 'production',
  dsn: 'https://example.platform.grcv.io',
  appId: 'checkout-web',
  releaseId: '2026.07.21',
  options: {
    sessionSampleRate: 0.25,
    eventSampleRate: 0.5,
    tracePropagationUrls: [
      'https://api.example.com'
    ],
  },
});
```

Groundcover documents `cluster`, `environment`, and `appId` as filtering and segmentation fields. Make their values stable and consistent with backend naming. A release ID is useful for associating a regression with a frontend deployment.

The SDK exposes `tracePropagationUrls`. Limit it to trusted backend origins that need correlation. Propagating trace context to analytics, payment, advertising, or other third-party origins can disclose identifiers and create unwanted cross-system coupling. Verify the exact matching rules in the installed SDK before using broad URL patterns.

## Make the Network Boundary Correlatable

For a browser-to-API request to correlate, three layers must cooperate:

1. The RUM SDK must instrument the request and propagate its trace context to an allowed URL.
2. Browsers, CORS policy, proxies, and gateways must permit and preserve the relevant headers.
3. Groundcover must observe and retain the corresponding backend eBPF trace.

Do not guess at this boundary. Send a canary API request with a unique, non-sensitive request ID. Find the network event in the session, follow its backend link, and confirm the service, route, status, duration, and timestamp match. Repeat through every ingress path used in production.

A failed link does not necessarily mean the request was missed. The browser event may have been sampled out, a proxy may have removed context, the backend protocol may be unsupported, or smart sampling may not have stored the server trace. Diagnose each boundary separately.

Application log correlation is another distinct feature. Groundcover's log and trace documentation says application logs must contain a supported trace ID field and that Groundcover does not inject that field into application logs. A correlated browser and eBPF trace therefore does not automatically make every log line trace-aware.

## Account for Two Sampling Decisions

RUM exposes both session and event sampling controls. Groundcover's eBPF backend applies its own smart sampling, storing selected normal, slow, and error traces after processing supported requests.

These controls answer different cost questions:

- session sampling determines which user sessions enter the RUM dataset;
- event sampling reduces enabled browser events within that collection path;
- eBPF smart sampling determines which detailed backend traces are stored.

A session can exist without a stored backend trace, and a backend trace can exist without a sampled RUM session. Never interpret a missing link as proof that no request occurred.

For a targeted reproduction, Groundcover documents `x-groundcover-force-sample: true` for HTTP and gRPC eBPF traces. Use it only through a trusted diagnostic path and confirm it reaches the observed service. It does not override RUM session sampling, so arrange a controlled test session that is definitely being collected.

## Use Session Replay Deliberately

Groundcover requires the RUM SDK before replay can be enabled. The current guide shows explicit `startReplayRecording()` and `stopReplayRecording()` methods, and says recordings are stored in the BYOC server and deleted with their RUM session according to retention.

```typescript
groundcover.startReplayRecording();

// Stop before entering a sensitive workflow.
groundcover.stopReplayRecording();
```

Data staying in your cloud improves custody, but replay is still sensitive. It can expose personal data, account details, messages, or secrets displayed in the DOM. Groundcover documents three HTML classes:

- `.rr-ignore` prevents recording input events for an element;
- `.rr-block` replaces an element with a placeholder;
- `.rr-mask` replaces text with asterisks.

Apply masking before rollout, not after the first incident. Test dynamic components, shadow DOM, iframes, payment widgets, support chat, and localization variants. Stop recording around workflows that cannot be made safe. Pair these controls with least-privilege access, short justified retention, audit review, and legal approval.

The SDK also exposes `beforeSend`, `enabledEvents`, and `excludedUrls`. Use them to minimize collection at the source. A field that is never captured cannot leak from storage later.

## Roll Out With a Correlation SLO

Begin with an internal or canary population and one application. Validate:

- ingestion freshness for sessions, errors, network events, and Web Vitals;
- source maps for the deployed release, noting that Groundcover currently describes source-map support as a gradual release;
- correlation success for known API requests through each gateway;
- masking and replay behavior on sensitive screens;
- volume and storage impact at expected peak traffic;
- role-based access to user identity and session data;
- behavior when the SDK endpoint or backend is unavailable.

Measure correlation as a funnel. For example: sampled sessions, instrumented first-party requests, requests with accepted propagation, matching backend traces, and links that open successfully. This identifies the failing boundary better than a single "RUM is healthy" check.

Avoid demanding 100 percent correlation without accounting for unsupported protocols, cancelled browser requests, sampling, ad blockers, network failure, and backend retention. Define an SLO over eligible canary requests instead.

## Troubleshoot From the User Inward

When a user reports a problem, start with the session timeline and release. Locate the interaction, exception, navigation, or slow Web Vital. Open the associated network request, compare browser timing with server duration, and then follow the backend trace.

If server duration is short but browser waiting or rendering is long, investigate client scheduling, assets, JavaScript, and network conditions. If the backend trace is slow, follow its service interactions and nearby metrics. If only the frontend trace exists, check propagation and eBPF storage. If only the backend exists, check RUM sampling, SDK loading, endpoint reachability, and browser policy.

RUM and eBPF are most useful together when the joining mechanism is treated as a production dependency. Restrict its propagation, test it continuously, and make sampling gaps visible. Then a user session becomes a reliable path into backend evidence rather than an isolated replay.

## Official Documentation

- [Groundcover Real User Monitoring](https://docs.groundcover.com/capabilities/real-user-monitoring-rum)
- [Groundcover Connect RUM guide](https://docs.groundcover.com/getting-started/installation-and-updating/connect-rum)
- [Groundcover traces and sampling](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm/traces)
- [Groundcover eBPF force sampling](https://docs.groundcover.com/customization/customize-usage/controlling-the-ebpf-sampling-mechanism)
- [Groundcover log and trace correlation](https://docs.groundcover.com/log-and-trace-correlation)
