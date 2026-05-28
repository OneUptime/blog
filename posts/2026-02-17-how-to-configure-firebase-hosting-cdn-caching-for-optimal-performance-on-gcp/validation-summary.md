# Validation Summary: How to Configure Firebase Hosting CDN Caching for Optimal Performance on GCP

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Firebase Hosting
- Firebase CLI configuration (`firebase.json`)
- Google Cloud CDN behavior through Firebase Hosting
- Cloud Functions for Firebase
- Cloud Run rewrites
- HTTP caching headers (`Cache-Control`, `ETag`, `Vary`)
- Cloud Logging and Cloud Monitoring log-based metrics

## Sources Consulted
- Firebase Hosting: Manage cache behavior: https://firebase.google.com/docs/hosting/manage-cache
- Firebase Hosting: Configure Hosting behavior (`headers`, `rewrites`, glob patterns): https://firebase.google.com/docs/hosting/full-config
- Firebase Hosting: View, search, and filter web request logs with Cloud Logging: https://firebase.google.com/docs/hosting/web-request-logs-and-metrics
- Cloud Logging: Log-based metrics overview: https://cloud.google.com/logging/docs/logs-based-metrics
- HTTP Caching specification, RFC 9111: https://www.rfc-editor.org/rfc/rfc9111
- HTTP immutable response directive, RFC 8246: https://www.rfc-editor.org/rfc/rfc8246

## Issues Found
- The measuring section incorrectly directed readers to a Firebase Hosting metrics dashboard for CDN cache hit ratios. Firebase Hosting documents CDN cache status in web request logs via the `cacheHit` field, with Cloud Monitoring charts available through log-based metrics. Updated the text to describe request logs and log-based metrics.
- The complete `firebase.json` example cached `**/*.html` but did not include an explicit root (`/`) rule, while earlier examples treated root HTML separately. Added the root cache header rule.
- The complete example used an SPA fallback rewrite without noting that Firebase Hosting applies custom header URL matching before rewrites. Added a short note explaining that clean SPA routes need their own source-pattern header rules.

## Review Notes
- The Firebase Hosting `headers` and `rewrites` snippets use documented `firebase.json` fields and supported extglob patterns.
- The Cloud Functions examples use the established `functions.https.onRequest` API. The placeholder helper functions (`generatePageHTML` and `handleRequest`) are assumed to be application code outside the snippet.
- Long `immutable` cache lifetimes are appropriate only for content-hashed or otherwise versioned assets, as the post states.
