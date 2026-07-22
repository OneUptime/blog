# Validation Summary: Groundcover RUM: Frontend Sessions and eBPF Trace Correlation

## Status
validated

## Post Type
Technical implementation guide

## Technologies Covered
- Groundcover Real User Monitoring (RUM)
- `@groundcover/browser` browser SDK 1.0.7
- Browser JavaScript and TypeScript
- eBPF-based tracing and smart sampling
- Distributed trace-context propagation
- CORS
- Session replay with rrweb
- Log and trace correlation
- Source maps

## Sources Consulted
- [Groundcover Real User Monitoring](https://docs.groundcover.com/capabilities/real-user-monitoring-rum)
- [Groundcover Connect RUM guide](https://docs.groundcover.com/getting-started/installation-and-updating/connect-rum)
- [Groundcover browser SDK package and published 1.0.7 TypeScript declarations, README, and changelog](https://www.npmjs.com/package/@groundcover/browser)
- [Groundcover traces and sampling](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm/traces)
- [Groundcover eBPF sampling controls](https://docs.groundcover.com/customization/customize-usage/controlling-the-ebpf-sampling-mechanism)
- [Groundcover log and trace correlation](https://docs.groundcover.com/log-and-trace-correlation)
- [rrweb 2.1.0 package](https://www.npmjs.com/package/rrweb/v/2.1.0)
- [WHATWG Fetch Standard: CORS protocol](https://fetch.spec.whatwg.org/#http-cors-protocol)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)

## Issues Found
- The initialization example used the pre-1.0 flat `options.tracePropagationUrls` field. In `@groundcover/browser` 1.0.0 and later, that field was replaced by `options.tracing.propagationUrls`. Updated the example and surrounding explanation to use the current nested configuration.
- The propagation URL omitted the wildcard required for requests below the example API origin, and the example did not configure the trace and span header names. Changed the URL to `https://api.example.com/*` and added `x-groundcover-trace-id` and `x-groundcover-span-id`, matching the current SDK's published configuration example so browser-to-backend requests can carry correlation identifiers.

## Review Notes
- Groundcover's Connect RUM documentation still shows some pre-1.0 option names and an `eventsSampleRate` typo in one advanced example. The post was validated against the newer published `@groundcover/browser` 1.0.7 declarations and package documentation where they differ.
- RUM remains documented as BYOC-only, while the setup guide also associates it with an Enterprise subscription. Teams should confirm both deployment mode and entitlement for their account.
- Source-map support is still documented as a gradual release that may require Groundcover to enable it for an account.
