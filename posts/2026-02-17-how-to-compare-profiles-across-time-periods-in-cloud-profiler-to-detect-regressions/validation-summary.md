# Validation Summary: Compare Profiles Across Time Periods in Cloud Profiler to Detect Regressions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Profiler
- Cloud Profiler Python agent
- Cloud Profiler Java agent
- Cloud Profiler API
- Cloud Monitoring alerting policies
- Google Cloud CLI
- Dockerfile ENTRYPOINT configuration

## Sources Consulted
- Google Cloud Profiler: Compare profiles: https://docs.cloud.google.com/profiler/docs/comparing-profiles
- Google Cloud Profiler: Select the profiles to analyze: https://docs.cloud.google.com/profiler/docs/selecting-profiles
- Google Cloud Profiler: Profiling Python applications: https://docs.cloud.google.com/profiler/docs/profiling-python
- Google Cloud Profiler: Profiling Java applications: https://docs.cloud.google.com/profiler/docs/profiling-java
- Google Cloud Profiler API: projects.profiles.list: https://docs.cloud.google.com/profiler/docs/reference/v2/rest/v2/projects.profiles/list
- Google Cloud Profiler: Download profile data: https://docs.cloud.google.com/profiler/docs/downloading-profiles
- Google Cloud SDK: gcloud monitoring policies create: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Monitoring API: AlertPolicy / MetricThreshold reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies

## Issues Found
- The post described comparison as side-by-side profiles and used warm/cool color wording. Updated it to describe the documented comparison flame graph semantics: red means the original profile consumed more, blue means it consumed less, and gray means little or no difference.
- The before/after comparison steps implied choosing an arbitrary compared time range. Updated the steps to use **Compare to > End date/time**, which compares profiles with the same other settings and a different end time.
- The Java Dockerfile example used `/opt/cprof/profiler_java_agent` without the `.so` suffix and used exec-form ENTRYPOINT with `${APP_VERSION}`, which would not expand at container runtime. Updated it to the documented `.so` agent path and shell-form `ENTRYPOINT exec java ...`.
- The Cloud Profiler API script used a non-existent `filter` parameter on `list_profiles`, computed time bounds without applying them, and implied that the API performs the console's comparison. Replaced it with a REST-based export/list sanity-check example that pages through `ListProfiles`, filters locally, and notes that detailed analysis requires parsing the pprof proto.
- The Cloud Monitoring alert command used `--condition-threshold-*` flags that are not part of the current `gcloud monitoring policies create` command. Updated it to use `--if`, `--duration`, and `--aggregation`.

## Review Notes
- `gcloud` is not installed in this workspace, so the Monitoring command was verified against the official Cloud SDK reference rather than executed locally.
- The Python snippets were syntax-checked locally. Runtime execution was not possible without Google Cloud credentials and the relevant Google auth packages.
