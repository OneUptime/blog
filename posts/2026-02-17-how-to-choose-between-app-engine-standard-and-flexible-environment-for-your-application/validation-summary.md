# Validation Summary: How to Choose Between App Engine Standard and Flexible Environment

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud App Engine Standard environment
- Google Cloud App Engine Flexible environment
- App Engine app.yaml configuration
- Google Cloud CLI deployment
- Docker container-based local development
- App Engine scaling, networking, runtimes, pricing, and request handling

## Sources Consulted
- Google Cloud App Engine standard environment overview: https://docs.cloud.google.com/appengine/docs/standard/overview
- Google Cloud App Engine flexible environment overview: https://docs.cloud.google.com/appengine/docs/flexible
- App Engine standard runtime support schedule: https://docs.cloud.google.com/appengine/docs/standard/lifecycle/support-schedule
- App Engine flexible app.yaml reference: https://docs.cloud.google.com/appengine/docs/flexible/reference/app-yaml
- App Engine standard app.yaml reference: https://docs.cloud.google.com/appengine/docs/standard/reference/app-yaml
- App Engine standard instance management and scaling: https://docs.cloud.google.com/appengine/docs/standard/how-instances-are-managed
- App Engine standard request handling: https://docs.cloud.google.com/appengine/docs/standard/how-requests-are-handled
- App Engine flexible request handling: https://docs.cloud.google.com/appengine/docs/flexible/how-requests-are-handled
- App Engine flexible WebSockets documentation: https://docs.cloud.google.com/appengine/docs/flexible/using-websockets-and-session-affinity
- App Engine pricing: https://cloud.google.com/appengine/pricing
- App Engine standard local development server documentation: https://docs.cloud.google.com/appengine/docs/standard/tools/using-local-server
- App Engine standard local development server options: https://docs.cloud.google.com/appengine/docs/standard/tools/local-devserver-command
- App Engine standard Python dependency documentation: https://docs.cloud.google.com/appengine/docs/standard/python3/specifying-dependencies

## Issues Found
- The Standard runtime version list was outdated. Updated it to current non-EOS runtime versions listed in the App Engine Standard runtime support schedule as of 2026-05-28.
- The Standard instance memory values were incorrect. Updated F1, F2, F4, and F4_1G memory limits to 384MB, 768MB, 1536MB, and 3072MB, and changed the related memory guidance from more than 1GB to more than 3GB.
- The Flexible resource limit said 96 vCPUs and several hundred GB of memory. Updated it to the documented 80 vCPU maximum and memory proportional to CPU allocation.
- The Flexible networking example used `instance_ip_mode: INTERNAL`. Updated it to the documented lower-case value `internal`.
- The Standard request deadline section incorrectly stated a 60-second HTTP deadline and 10 minutes for task queue requests. Updated it to the documented 10-minute automatic scaling deadline and 24-hour basic/manual scaling deadline.
- The background processing guidance overstated Standard background-thread behavior and Flexible post-response background work. Updated it to mention Java background-thread restrictions for automatic scaling and Google Cloud's recommendation to use Cloud Tasks for asynchronous work after an HTTP response.
- The local development section implied `dev_appserver.py` applies broadly to all Standard runtimes. Updated it to the documented scope: supported Go, Java, PHP, and Python runtimes that include legacy bundled services.
- The dependency guidance implied Standard cannot use native dependencies. Updated the wording to focus on custom OS packages, custom runtimes, and binaries unavailable in Standard.
- The Flexible runtime section implied exact version parity with Standard runtimes. Updated it to say Flexible supports the same language families plus custom container-based runtimes.

## Review Notes
Version-specific App Engine runtime lists change over time. Future reviews should re-check the runtime support schedule before publication or consider replacing exact version ranges with a link to the official support schedule.
