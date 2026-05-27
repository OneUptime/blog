# Validation Summary: How to Set Up Continuous Profiling for a Node.js Application with Cloud Profiler

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Profiler
- `@google-cloud/profiler` for Node.js
- Node.js and Express
- Cloud Run
- Google Kubernetes Engine
- Workload Identity Federation for GKE
- Docker
- npm packages: `lru-cache`, `JSONStream`

## Sources Consulted
- Google Cloud Profiler Node.js documentation: https://docs.cloud.google.com/profiler/docs/profiling-nodejs
- Google Cloud Profiler concepts: https://docs.cloud.google.com/profiler/docs/concepts-profiling
- Google Cloud Profiler overview: https://docs.cloud.google.com/profiler/docs/about-profiler
- `@google-cloud/profiler` package documentation: https://github.com/googleapis/cloud-profiler-nodejs
- Google Cloud SDK `gcloud run deploy` reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Node.js CLI documentation for `--require`: https://nodejs.org/dist/latest/docs/api/cli.html
- `lru-cache` npm documentation: https://www.npmjs.com/package/lru-cache
- `JSONStream` npm documentation: https://www.npmjs.com/package/JSONStream

## Issues Found
- The post described Node.js Cloud Profiler data as "CPU (wall-clock)" and "CPU profiles." Google Cloud's Node.js profiler documentation describes heap and wall-time profiles, so the wording was changed to "wall-time" where appropriate.
- The post stated heap profiling was disabled by default and used a `heapProfiler: true` option. Current `@google-cloud/profiler` documentation says heap and time profiling are enabled by default, with `disableHeap` and `disableTime` used to turn them off. The invalid option was removed and the comment was corrected.
- The `profiler.start()` examples ignored the returned promise. Current package examples handle startup failures with `.catch()`, so the snippets now catch and log startup errors.
- The collection explanation said the agent has "zero overhead" between collection windows. Official docs describe the agent as mostly idle and give overhead figures during collection and amortized over time, so the statement was softened.
- The Dockerfile used `npm ci --only=production`. This still commonly works, but `--omit=dev` is the current npm form, so the snippet was updated.
- The LRU cache example used the old constructor form `const LRU = require('lru-cache'); new LRU(...)`. Current `lru-cache` documentation uses `const { LRUCache } = require('lru-cache'); new LRUCache(...)`, so the example was updated.
- The streaming JSON example required `jsonstream`. The documented package import is `require('JSONStream')`, so the snippet was corrected.
- The setup omitted enabling the Cloud Profiler API, which official Google Cloud setup instructions require before using the agent. A `gcloud services enable cloudprofiler.googleapis.com` command was added to the install step.

## Review Notes
The Cloud Run and GKE snippets are structurally valid, but production deployments should explicitly verify that the runtime service account or Kubernetes workload identity principal has `roles/cloudprofiler.agent` when not using an unmodified default service account.
