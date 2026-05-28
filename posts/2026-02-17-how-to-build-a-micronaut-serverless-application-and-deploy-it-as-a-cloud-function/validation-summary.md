# Validation Summary: How to Build a Micronaut Serverless Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Micronaut Framework
- Micronaut GCP Function HTTP
- Google Cloud Functions / Cloud Run functions
- Google Cloud Functions Framework for Java
- Gradle
- Java
- Micronaut Serialization
- Google Cloud Firestore Java client

## Sources Consulted
- Micronaut Guide: Deploy an HTTP Function to Google Cloud Functions: https://guides.micronaut.io/latest/micronaut-google-cloud-http-function-gradle-java.html
- Micronaut GCP documentation, HTTP Functions: https://micronaut-projects.github.io/micronaut-gcp/latest/guide/
- Google Cloud: Deploy a function with `gcloud functions deploy`: https://cloud.google.com/functions/docs/deploy
- Google Cloud: Local functions development and Java Functions Framework: https://docs.cloud.google.com/run/docs/local-dev-functions
- Google Cloud: Cloud Run functions runtime support: https://cloud.google.com/functions/docs/runtime-support
- Google Cloud SDK `gcloud functions deploy` reference, environment variable flags: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Micronaut Serialization documentation: https://micronaut-projects.github.io/micronaut-serialization/latest/guide/

## Issues Found
- The Gradle setup omitted the Functions Framework API development dependency needed for local function execution. Added `developmentOnly("com.google.cloud.functions:functions-framework-api")`.
- The local test setup used `@MicronautTest` with an HTTP client but did not include an embedded HTTP server for tests. Added `testRuntimeOnly("io.micronaut:micronaut-http-server-netty")`.
- The post described `com.example.Application` as the Cloud Functions deployment entry point. Micronaut's GCP guide documents `io.micronaut.gcp.function.http.HttpFunction` as the HTTP function handler, so the deployment command and explanation were corrected.
- Several Java snippets were missing imports and package declarations needed to compile. Added the missing imports/package lines for the controller, service, test, and Firestore examples.
- The DTO snippet placed two public Java classes in one file. Split the example into separate `Task.java` and `TaskRequest.java` snippets.
- The local Functions Framework command used `java -jar build/libs/my-function-0.1-all.jar`, which does not match Micronaut's generated function workflow. Replaced it with `./gradlew runFunction`.
- The deployment flow did not account for Micronaut's documented requirement to deploy from the directory containing the all-dependencies JAR. Updated the commands to run `clean shadowJar`, `cd build/libs`, keep only the `*-all.jar`, and deploy with `--source .`.
- The JVM options example was shown as a standalone YAML snippet. Changed it to the `--set-env-vars JAVA_TOOL_OPTIONS=...` flag used with deployment commands.
- The Firestore example implied that Micronaut GCP automatically provides a `Firestore` bean. Changed the text to say Google Cloud client libraries can be used directly and updated the example to create the client via `FirestoreOptions.getDefaultInstance().getService()`.

## Review Notes
- Google Cloud currently lists `java17` as supported for 1st gen and Cloud Run functions, with decommission in October 2027. New projects may prefer `java21` or newer where compatible, but `java17` remains valid for this post.
- The cold-start numbers in the post are plausible as illustrative guidance, but actual startup time depends on dependency graph, memory/CPU allocation, runtime version, region, and initialization work.
