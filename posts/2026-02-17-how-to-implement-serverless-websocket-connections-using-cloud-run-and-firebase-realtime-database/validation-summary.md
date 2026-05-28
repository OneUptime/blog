# Validation Summary: How to Use Serverless WebSocket Connections Using Cloud Run

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- WebSockets
- Node.js
- Express
- ws
- Firebase Admin SDK
- Firebase Realtime Database
- Firebase Realtime Database Security Rules
- Docker
- Google Cloud CLI
- Artifact Registry
- Cloud Build

## Sources Consulted
- Google Cloud Run WebSockets documentation: https://docs.cloud.google.com/run/docs/triggering/websockets
- Google Cloud Run WebSocket chat tutorial: https://docs.cloud.google.com/run/docs/tutorials/websockets
- Google Cloud SDK `gcloud run deploy` reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud Run session affinity documentation: https://cloud.google.com/run/docs/configuring/session-affinity
- Google Cloud Run minimum instances documentation: https://docs.cloud.google.com/run/docs/configuring/min-instance
- Cloud Build container image documentation: https://docs.cloud.google.com/build/docs/building/build-containers
- Artifact Registry Container Registry shutdown documentation: https://docs.cloud.google.com/artifact-registry/docs/transition/prepare-gcr-shutdown
- Firebase Realtime Database Admin SDK documentation: https://firebase.google.com/docs/database/admin/start
- Firebase Realtime Database retrieving data documentation: https://firebase.google.com/docs/database/admin/retrieve-data
- Firebase Realtime Database Security Rules documentation: https://firebase.google.com/docs/database/security
- Firebase Realtime Database indexing documentation: https://firebase.google.com/docs/database/security/indexing-data
- Node.js release schedule: https://github.com/nodejs/release
- npm `ci` documentation: https://docs.npmjs.com/cli/v10/commands/npm-ci

## Issues Found
- The post said the system "costs nothing when idle" while the deployment command used `--min-instances=1`. Updated the wording to clarify that scale-to-zero idle behavior applies when minimum instances are left at 0, and that `--min-instances=1` keeps an instance warm and prevents scale-to-zero while configured.
- The health endpoint comment said it was required for Cloud Run. Cloud Run does not require a health endpoint unless probes are configured, so the comment now describes it as optional.
- The Firebase listener cleanup only removed the messages listener and did not detach the typing listener. Updated the server example to track listener callbacks and detach both message and typing listeners when the last local client leaves a room.
- The typing listener used only `child_changed`, so the first typing record for a user could be missed. Added `child_added` handling for typing indicators.
- The history send could write to a WebSocket that closed before the async Firebase read completed. Added a ready-state check before sending history.
- The Dockerfile used `node:20-slim`, but Node.js 20 reached end of life on 2026-04-30. Updated the base image to `node:24-slim`.
- The Dockerfile used `npm ci --only=production`. Updated it to `npm ci --omit=dev`, the current npm form for omitting development dependencies.
- The deployment example used `gcr.io` Container Registry style image paths. Container Registry is deprecated and Artifact Registry is the recommended image storage service, so the commands now create and use an Artifact Registry Docker repository.
- The session affinity description implied a guarantee. Updated it to describe Cloud Run session affinity as best effort.
- The Firebase rules section implied the rules secured the server-side Admin SDK access. Updated the wording to clarify that Admin SDK access is administrative and not restricted by Realtime Database Rules, and that rules apply to direct client access.
- The Realtime Database rules omitted an index for queries using `orderByChild("timestamp")`. Added `".indexOn": ["timestamp"]` under `messages`.

## Review Notes
The example Realtime Database rules still use open read/write access for tutorial simplicity. A production implementation should require Firebase Authentication, validate user identity against message ownership, and validate message/typing field types and lengths before accepting writes.
