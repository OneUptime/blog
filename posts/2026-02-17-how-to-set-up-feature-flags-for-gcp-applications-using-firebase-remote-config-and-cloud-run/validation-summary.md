# Validation Summary: How to Set Up Feature Flags for GCP Applications Using Firebase Remote Config

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Firebase Remote Config
- Firebase Admin SDK for Python
- Firebase Remote Config REST API
- Google Cloud IAM
- Cloud Monitoring custom metrics
- Flask

## Sources Consulted
- Firebase Remote Config server environments: https://firebase.google.com/docs/remote-config/server
- Firebase Remote Config REST API automation and ETag handling: https://firebase.google.com/docs/remote-config/automate-rc
- Firebase Remote Config conditional expression reference: https://firebase.google.com/docs/remote-config/condition-reference
- Firebase Admin SDK Python Remote Config reference: https://firebase.google.com/docs/reference/admin/python/firebase_admin.remote_config
- Firebase Admin SDK Remote Config server template reference: https://firebase.google.com/docs/reference/admin/node/firebase-admin.remote-config
- Google Cloud IAM Firebase roles and permissions: https://cloud.google.com/iam/docs/roles-permissions/firebase
- Cloud Run service identity documentation: https://cloud.google.com/run/docs/securing/service-identity
- Google Cloud SDK `gcloud run deploy` reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Cloud Monitoring monitored resource types: https://docs.cloud.google.com/monitoring/api/resources

## Issues Found
1. The post said Remote Config changes take effect "in real time" for this Cloud Run pattern. With the sample cache, changes take effect after the service refreshes the server template. Updated the wording to avoid implying instant propagation.
2. The initial REST `PUT` example omitted `If-Match`. Remote Config REST updates require an `If-Match` header, either with the latest ETag or `*` for a forced update. Added `If-Match: *` to match the later example.
3. The first REST snippet was described as using the Firebase Admin SDK even though it used `curl` against the REST API. Updated the comment to say Remote Config REST API.
4. The server-side targeting description and condition example used Analytics user properties. Server-side Remote Config evaluates percentage conditions and custom signals passed in the evaluation context. Updated the wording, condition expression, and Python evaluation context to use custom signals.
5. The Python snippet called `remote_config.get_server_template()` synchronously and imported unused modules. The Python Admin SDK method is asynchronous. Updated the example to call it with `asyncio.run(...)` and removed unused imports.
6. The IAM role name `roles/firebaseremoteconfig.viewer` is not the documented Firebase Remote Config viewer role. Replaced it with `roles/cloudconfig.viewer`, and corrected the default Cloud Run service account format to use `PROJECT_NUMBER-compute@developer.gserviceaccount.com`.
7. The Cloud Monitoring snippet set `resource.type = cloud_run_revision` but omitted required monitored-resource labels. Added `project_id`, `service_name`, `revision_name`, `configuration_name`, and `location`.

## Review Notes
Server-side Remote Config is documented as Preview, so API details may change. The REST examples use `If-Match: *` for brevity, but production automation should fetch and reuse the latest ETag to avoid overwriting concurrent changes.
