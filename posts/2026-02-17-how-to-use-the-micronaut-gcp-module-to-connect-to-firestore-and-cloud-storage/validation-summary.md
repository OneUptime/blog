# Validation Summary: How to Use the Micronaut GCP Module to Connect to Firestore and Cloud Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Micronaut Framework
- Micronaut GCP
- Google Cloud Firestore
- Google Cloud Storage
- Google Cloud Java client libraries
- Java
- Gradle
- YAML configuration

## Sources Consulted
- Micronaut GCP 6.0.0 guide: https://micronaut-projects.github.io/micronaut-gcp/6.0.0/guide/
- Micronaut Framework file upload documentation: https://micronaut-projects.github.io/micronaut-core/latest/guide/
- Micronaut configuration reference: https://docs.micronaut.io/4.10.13/guide/configurationreference.html
- Google Cloud authentication for client libraries: https://docs.cloud.google.com/docs/authentication/client-libraries
- Google Cloud Firestore Java quickstart sample: https://cloud.google.com/firestore/docs/samples/firestore-quickstart
- Google Cloud Storage V4 signed URL documentation: https://docs.cloud.google.com/storage/docs/access-control/signing-urls-with-helpers
- Google Cloud Storage Java API reference for Storage.signUrl: https://cloud.google.com/java/docs/reference/google-cloud-storage/latest/com.google.cloud.storage.Storage

## Issues Found
- The introduction and wrap-up overstated Micronaut GCP auto-configuration for Firestore and direct Cloud Storage Java clients. Updated the wording to reflect that `micronaut-gcp-common` provides GCP project and credential support, while the post's factory registers the Firestore and Storage clients as Micronaut beans.
- The GCP client factory created Google Cloud clients using only default client-library credential discovery, so the Micronaut GCP module was not actually participating in credential injection. Updated the factory to inject `GoogleCredentials` from Micronaut GCP and pass it to `FirestoreOptions` and `StorageOptions`.
- The file upload endpoint did not declare that it consumes multipart form data. Updated the `@Post` annotation to `@Post(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA)`, matching Micronaut's file upload documentation.
- The multipart configuration raised only `max-file-size`. Added `multipart.enabled: true` and `max-request-size: 50MB` so multipart processing is enabled and the request limit matches the file size example.
- The signed URL example did not mention that V4 signing requires credentials capable of signing blobs. Added a short comment before the method to avoid implying that all ADC credential types can sign URLs.

## Review Notes
- The code snippets omit imports, so the review treated them as illustrative class bodies rather than complete copy-paste files.
- The Gradle plugin version shown is older than current Micronaut releases, but the snippet remains technically plausible for a Micronaut 4 application.
