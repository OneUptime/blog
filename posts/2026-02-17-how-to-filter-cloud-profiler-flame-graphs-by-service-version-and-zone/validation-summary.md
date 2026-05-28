# Validation Summary: How to Filter Cloud Profiler Flame Graphs by Service Version and Zone

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Profiler
- Google Cloud Profiler API v2
- Python
- Go
- Java
- Node.js
- Dockerfile configuration
- Kubernetes environment variables

## Sources Consulted
- Google Cloud Profiler Python guide: https://docs.cloud.google.com/profiler/docs/profiling-python
- Google Cloud Profiler Go guide: https://docs.cloud.google.com/profiler/docs/profiling-go
- Google Cloud Profiler Java guide: https://docs.cloud.google.com/profiler/docs/profiling-java
- Google Cloud Profiler Node.js guide: https://docs.cloud.google.com/profiler/docs/profiling-nodejs
- Google Cloud Profiler profile selection guide: https://docs.cloud.google.com/profiler/docs/selecting-profiles
- Google Cloud Profiler comparison guide: https://cloud.google.com/profiler/docs/comparing-profiles
- Google Cloud Profiler external environment guide: https://docs.cloud.google.com/profiler/docs/profiling-external
- Google Cloud Profiler API v2 REST/RPC reference: https://cloud.google.com/profiler/docs/reference/v2/rpc/google.devtools.cloudprofiler.v2

## Issues Found
- The Java Dockerfile example used `/opt/cprof/profiler_java_agent` without the required `.so` suffix and used Docker exec-form `ENTRYPOINT` with `${APP_VERSION}`, which would not expand the environment variable. Changed it to shell-form `ENTRYPOINT` using `/opt/cprof/profiler_java_agent.so`.
- The zone configuration section recommended `GOOGLE_CLOUD_ZONE`, which is not a documented Cloud Profiler zone override. Replaced it with the documented Java agent option `-cprof_zone_name` and noted that project ID configuration is language-specific outside Google Cloud.
- The profile type list said heap allocation, goroutines, and contention for Go/Java. Updated the names and support matrix to match Cloud Profiler documentation: `Allocated heap`, `Threads` for Go, and `Contention` for Go.
- The programmatic filtering example used a Python client import and profile fields that do not match the documented Profiler API response shape. Replaced it with a REST API example using application default credentials, pagination, `deployment.target` for service, and deployment labels for version.

## Review Notes
The post is technically relevant and now aligns with the current Cloud Profiler documentation. Cloud Profiler API list calls do not provide server-side service/version filters, so the example correctly performs client-side filtering after listing profiles.
