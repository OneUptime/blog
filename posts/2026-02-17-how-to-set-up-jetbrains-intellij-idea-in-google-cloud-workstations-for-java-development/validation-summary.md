# Validation Summary: How to Set Up JetBrains IntelliJ IDEA in Google Cloud Workstations

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Google Cloud Workstations
- Google Cloud CLI
- JetBrains Gateway
- IntelliJ IDEA Ultimate
- Docker / custom container images
- Java, Maven, and Gradle
- Cloud Build and Artifact Registry
- Cloud SQL
- Google Cloud Application Default Credentials

## Sources Consulted
- Google Cloud Workstations: Create a workstation cluster: https://docs.cloud.google.com/workstations/docs/create-cluster
- Google Cloud SDK: `gcloud workstations clusters create`: https://cloud.google.com/sdk/gcloud/reference/workstations/clusters/create
- Google Cloud SDK: `gcloud workstations configs create`: https://docs.cloud.google.com/sdk/gcloud/reference/workstations/configs/create
- Google Cloud SDK: `gcloud workstations configs update`: https://docs.cloud.google.com/sdk/gcloud/reference/workstations/configs/update
- Google Cloud SDK: `gcloud workstations create`: https://cloud.google.com/sdk/gcloud/reference/workstations/create
- Google Cloud SDK: `gcloud workstations start`: https://docs.cloud.google.com/sdk/gcloud/reference/workstations/start
- Google Cloud Workstations: Preconfigured base images: https://docs.cloud.google.com/workstations/docs/preconfigured-base-images
- Google Cloud Workstations: Customize container images: https://docs.cloud.google.com/workstations/docs/customize-container-images
- Google Cloud Workstations: Develop code using local JetBrains IDEs: https://docs.cloud.google.com/workstations/docs/develop-code-using-local-jetbrains-ides
- JetBrains IntelliJ IDEA documentation: Connect and work with JetBrains Gateway: https://www.jetbrains.com/help/idea/remote-development-a.html
- Google Cloud Workstations overview and persistent storage: https://docs.cloud.google.com/workstations/docs/overview
- Google Cloud Workstations authentication: https://docs.cloud.google.com/workstations/docs/authentication
- Google Cloud Application Default Credentials: https://cloud.google.com/docs/authentication/application-default-credentials
- Google Cloud SDK: `gcloud builds submit`: https://docs.cloud.google.com/sdk/gcloud/reference/builds/submit
- Google Cloud SDK: `gcloud sql connect`: https://cloud.google.com/sdk/gcloud/reference/sql/connect

## Issues Found
- The workstation configuration did not select a JetBrains-compatible predefined image. Added `--container-predefined-image=intellij-ultimate` so the configuration matches the documented Cloud Workstations + JetBrains Gateway flow.
- The configuration used `--disable-public-ip-addresses=false`, but the documented flag is a presence-only disable flag. Removed it so public IP behavior is controlled by the default rather than an invalid-looking boolean assignment.
- The custom Dockerfile extended the no-IDE `base` image, which does not match the native JetBrains Gateway setup described by the post. Changed it to extend the IntelliJ IDEA Ultimate Cloud Workstations image.
- The Dockerfile used `unzip` before installing it. Added `unzip` to the package installation step.
- The Dockerfile attempted to write Maven settings into `/home/user` at image build time. Cloud Workstations mounts persistent home storage at runtime, so build-time changes under `/home` can be overwritten. Removed that build-time home-directory customization.
- The Dockerfile installed `openjdk-21-jdk` through `apt`. To keep the snippet broadly compatible with the Cloud Workstations Debian-based image repositories, changed it to `openjdk-17-jdk` and updated `JAVA_HOME`.
- The post said Gateway installs the IntelliJ backend. Updated the wording to say Gateway starts the backend and establishes the connection, which better matches preconfigured JetBrains Workstations images.
- The port-forwarding section claimed forwarding is handled automatically in all cases. Updated it to say Gateway can forward automatically in some cases and also supports explicit rules under Tools > Port Forwarding.
- The Cloud SQL example said no proxy was needed. Removed that claim because `gcloud sql connect` behavior depends on Cloud SQL networking and the Cloud SDK command variant.
- The ADC example set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account key while describing automatic credentials. Replaced it with `gcloud auth application-default login`, matching Cloud Workstations authentication guidance.

## Review Notes
The local environment did not have `gcloud` installed, so CLI verification was performed against official Google Cloud SDK reference documentation rather than local `--help` output. The post is now technically valid as a current Cloud Workstations + JetBrains Gateway tutorial, but teams should still adjust machine type, IAM roles, service account scopes, and Cloud SQL networking for their organization.
