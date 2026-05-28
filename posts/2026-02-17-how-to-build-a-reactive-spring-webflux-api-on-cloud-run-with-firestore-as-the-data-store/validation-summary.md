# Validation Summary: How to Build a Reactive Spring WebFlux API on Cloud Run with Firestore as the

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Google Cloud Firestore
- Spring WebFlux
- Spring Framework on Google Cloud / Spring Cloud GCP Firestore
- Reactor Core and Reactor Netty
- Java
- Maven
- Docker
- Google Cloud CLI and Cloud Build

## Sources Consulted
- Spring Framework on Google Cloud Firestore reference: https://googlecloudplatform.github.io/spring-cloud-gcp/reference/html/index.html
- Spring Framework WebFlux reference: https://docs.spring.io/spring-framework/docs/5.0.x/spring-framework-reference/web-reactive.html
- Reactor Netty HTTP server reference: https://projectreactor.io/docs/netty/release/reference/http-server.html
- Google Cloud SDK `gcloud run deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK `gcloud builds submit` reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/submit
- Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- Cloud Run billing settings for services: https://cloud.google.com/run/docs/configuring/cpu-allocation

## Issues Found
- The dependency block included both `spring-cloud-gcp-starter-data-firestore` and `spring-cloud-gcp-data-firestore`. The official Spring Framework on Google Cloud docs present the starter as the recommended auto-configuration dependency, so the direct module dependency was removed to avoid redundant setup.
- The entity used `BigDecimal` and `Instant`, but the Spring Framework on Google Cloud Firestore supported type list includes `Double`, `Date`, and `com.google.cloud.Timestamp`, not `BigDecimal` or `Instant`. Changed `price` to `Double` and timestamps to `Date`, and updated repository and service examples accordingly.
- The opening billing statement said Cloud Run charges for request-processing time. Adjusted it to refer to Cloud Run's default request-based billing and CPU/memory cost more precisely.
- The deploy command included `--platform managed`, which is not listed in the current official `gcloud run deploy` reference. Removed the flag.

## Review Notes
The remaining examples are consistent with the consulted documentation. The Java snippets omit imports, which is common for blog examples; a complete project would need imports for annotations, Reactor types, `Date`, `Duration`, `Map`, and Spring WebFlux classes.
