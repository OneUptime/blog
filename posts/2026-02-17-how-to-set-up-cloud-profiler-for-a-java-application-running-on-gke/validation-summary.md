# Validation Summary: How to Set Up Cloud Profiler for a Java Application Running on GKE

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Profiler
- Google Kubernetes Engine (GKE)
- Workload Identity Federation for GKE
- Java JVM agent configuration
- Docker
- Kubernetes Deployment manifests
- Maven and Spring Boot

## Sources Consulted
- Google Cloud Profiler Java application profiling documentation: https://docs.cloud.google.com/profiler/docs/profiling-java
- Google Cloud Profiler profiling concepts: https://docs.cloud.google.com/profiler/docs/concepts-profiling
- Google Cloud Profiler profile selection documentation: https://docs.cloud.google.com/profiler/docs/selecting-profiles
- GKE Workload Identity Federation authentication documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud Java `google-cloud-profiler` client library documentation: https://docs.cloud.google.com/java/docs/reference/google-cloud-profiler/latest/overview

## Issues Found
- The Dockerfile examples used `/opt/cprof/profiler_java_agent` as the JVM `-agentpath` target. Google Cloud's Java profiling documentation uses the shared library path `/opt/cprof/profiler_java_agent.so`, so both examples were updated to include `.so`.
- The Kubernetes Deployment manifest had two `env` keys under the same container. In YAML, duplicate mapping keys are invalid or parser-dependent and can cause one set of environment variables to be ignored. The environment variables were merged into a single `env` list.
- The setup omitted enabling the Cloud Profiler API. Google Cloud documents `gcloud services enable cloudprofiler.googleapis.com` as a prerequisite, so the command was added to the permissions step.
- The Maven/Spring Boot section described `google-cloud-profiler` as a way to add the profiler agent programmatically. Official Java client library documentation shows this artifact is the Cloud Profiler API client, while the Java profiling guide uses the native JVM agent. The section was corrected to warn against confusing the API client with the profiling agent.
- The Spring Boot example used `javax.annotation.PostConstruct`, which is not correct for modern Spring Boot 3 applications using Jakarta EE APIs. The import was changed to `jakarta.annotation.PostConstruct`.
- The heap profile description incorrectly described Java heap profiles as allocation profiles. Google Cloud's profile-selection documentation describes Heap as memory allocated in the program heap when the profile is collected, so the wording was corrected.

## Review Notes
The corrected article now follows the supported GKE Java path: install the native Cloud Profiler agent in the image, start the JVM with `-agentpath`, enable the Profiler API, and grant the service account `roles/cloudprofiler.agent`. Heap profiling is correctly described as disabled by default and supported for Java 11 and later.
