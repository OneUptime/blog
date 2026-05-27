# Validation Summary: How to Set Up a Maven Repository in Artifact Registry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Artifact Registry
- Maven
- Gradle
- Google Cloud CLI
- Cloud Build
- IAM
- Java package publishing and consumption

## Sources Consulted
- Google Cloud Artifact Registry: Configure authentication to Artifact Registry for Maven and Gradle: https://cloud.google.com/artifact-registry/docs/java/authentication
- Google Cloud Artifact Registry: Store Java packages in Artifact Registry: https://cloud.google.com/artifact-registry/docs/java/store-java
- Google Cloud Artifact Registry: Manage Java packages: https://cloud.google.com/artifact-registry/docs/java/manage-packages
- Google Cloud Artifact Registry: Create standard repositories: https://cloud.google.com/artifact-registry/docs/repositories/create-repos
- Google Cloud SDK reference: gcloud artifacts repositories create: https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Google Cloud SDK reference: gcloud artifacts versions delete: https://cloud.google.com/sdk/gcloud/reference/artifacts/versions/delete
- Google Cloud Artifact Registry: Connect to Cloud Build: https://cloud.google.com/artifact-registry/docs/configure-cloud-build
- Google Cloud Artifact Registry: Access control with IAM: https://cloud.google.com/artifact-registry/docs/access-control

## Issues Found
- The post described choosing between "standard Maven repository mode and snapshot mode." Artifact Registry repository mode and Maven version policy are separate concepts, so this was changed to describe leaving the Maven version policy unset or setting release-only/snapshot-only policy.
- The Maven wagon examples used version `2.2.1`. Google Cloud's current generated Maven settings use `artifactregistry-maven-wagon` version `2.2.5`, so both Maven snippets were updated.
- The authentication explanation said being logged in with `gcloud` is enough. The documented local workflow uses Application Default Credentials from `gcloud auth application-default login`, so the wording was tightened.
- The Gradle example used an older buildscript/classpath style and the outdated plugin version. It was updated to the documented `plugins` DSL with `com.google.cloud.artifactregistry.gradle-plugin` version `2.2.5`.
- The Cloud Build permission note implied the writer role is always required. Google Cloud documentation states the default Cloud Build service account has same-project repository access; the note was changed to require `roles/artifactregistry.writer` for cross-project repositories or user-specified service accounts.

## Review Notes
The service-account-key example is technically usable, but Google Cloud generally recommends avoiding long-lived service account keys where workload identity federation or runtime service accounts are available. The post could mention that security preference in a future revision, but no change was required for correctness.
