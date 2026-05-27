# Validation Summary: Use Firebase Remote Config with Cloud Functions for Server-Side Feature Flags

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Firebase Remote Config
- Firebase Admin Node.js SDK
- Google Cloud Functions for Firebase
- Firebase CLI
- TypeScript
- Node.js crypto module

## Sources Consulted
- Firebase Remote Config server-side documentation: https://firebase.google.com/docs/remote-config/server
- Firebase Admin Node.js Remote Config API reference: https://firebase.google.com/docs/reference/admin/node/firebase-admin.remote-config
- Firebase Remote Config condition reference: https://firebase.google.com/docs/remote-config/condition-reference
- Cloud Functions for Firebase Remote Config trigger documentation: https://firebase.google.com/docs/functions/rc-events
- Firebase CLI deploy documentation: https://firebase.google.com/docs/cli
- Node.js crypto API documentation: https://nodejs.org/api/crypto.html

## Issues Found
- The runtime code used `admin.remoteConfig().getTemplate()` and manually read default parameter values. That API reads a Remote Config template rather than evaluating a server-side Remote Config template for backend use. I changed the code to use the Admin Node.js SDK server-side API, `getServerTemplate()` and `template.evaluate()`, with typed getters such as `getBoolean()`, `getString()`, and `getNumber()`.
- The setup section presented an Admin SDK publishing script as the setup path for server-side feature flags. I replaced it with a server-template parameter example and clarified that the parameters should be created under the Remote Config Server selector in the Firebase Console.
- The percentage rollout example depended on the removed string-map helper. I updated it to read the numeric flag through `getFeatureNumber()`.
- The Remote Config update trigger claimed it could invalidate the local module cache. A separate Cloud Functions trigger cannot reliably clear module-level caches in other warm function instances, so I changed the guidance to shared-cache invalidation and left the TTL as the local-cache freshness mechanism.
- The server-conditions example used client-side user-property condition syntax. I changed it to a server-side custom-signal condition shape and showed passing the custom signal to `template.evaluate()`.
- The middleware snippet used `functions.Response`, which is not the correct Express response type. I changed it to import and use `Response` from `express`.

## Review Notes
The examples still use the first-generation `firebase-functions` import style, which remains valid for these snippets. Future revisions could show second-generation HTTPS functions as an alternative, but that is not required for correctness.
