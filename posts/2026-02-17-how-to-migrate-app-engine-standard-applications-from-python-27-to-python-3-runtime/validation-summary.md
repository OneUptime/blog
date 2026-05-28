# Validation Summary: Migrate App Engine Standard Applications from Python 2.7 to Python 3 Runtime

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google App Engine Standard
- Python 2.7 and Python 3
- App Engine app.yaml
- Flask and WSGI
- App Engine legacy bundled services
- Memorystore for Redis
- Cloud Tasks
- Identity-Aware Proxy
- Cloud NDB
- Datastore mode
- Cloud Storage
- Google Cloud CLI

## Sources Consulted
- Google Cloud App Engine migration guide for Python 2.7 to Python 3: https://docs.cloud.google.com/appengine/migration-center/standard/migrate-to-second-gen/python-differences
- Google Cloud App Engine Python 3 runtime documentation: https://docs.cloud.google.com/appengine/docs/standard/python3/runtime
- Google Cloud App Engine app.yaml reference: https://docs.cloud.google.com/appengine/docs/standard/reference/app-yaml
- Google Cloud legacy bundled services migration guide: https://docs.cloud.google.com/appengine/migration-center/standard/services/migrating-services
- Google Cloud App Engine services SDK for Python 3 documentation: https://docs.cloud.google.com/appengine/docs/standard/python3/services/access
- Google Cloud Tasks App Engine task creation documentation: https://docs.cloud.google.com/tasks/docs/creating-appengine-tasks
- Google Cloud IAP signed headers documentation: https://docs.cloud.google.com/iap/docs/signed-headers-howto
- Google Cloud NDB migration documentation: https://docs.cloud.google.com/appengine/migration-center/standard/python/migrate-to-cloud-ndb
- Google Cloud Datastore mode client libraries documentation: https://docs.cloud.google.com/datastore/docs/reference/libraries
- Google Cloud Storage for App Engine documentation: https://docs.cloud.google.com/appengine/docs/standard/using-cloud-storage
- Google Cloud Storage V4 signed URL documentation: https://docs.cloud.google.com/storage/docs/access-control/signing-urls-with-helpers
- Google Cloud CLI app deploy reference: https://cloud.google.com/sdk/gcloud/reference/app/deploy
- Google Cloud CLI app services set-traffic reference: https://docs.cloud.google.com/sdk/gcloud/reference/app/services/set-traffic
- Python 2to3 documentation: https://docs.python.org/3/library/2to3.html

## Issues Found
- The post said Google "officially ended support" for Python 2.7 without the exact support status. Updated it to state that Python 2.7 reached end of support on January 31, 2024 and that existing apps may still serve traffic while redeployment may be blocked.
- The post implied bundled services are simply gone in Python 3. Updated the wording to explain that Google recommends migrating to standalone products, but many legacy bundled services can still be accessed through the App Engine services SDK as a fallback.
- The post described `webapp2` as replaced by Flask. Updated this to say `webapp2` is not bundled or supported in Python 3 and that Flask, Django, or another WSGI framework should be used.
- The `app.yaml` explanation for `script: auto` was imprecise. Updated it to match the App Engine reference: `auto` is the only accepted value for Python 3 dynamic handlers because dynamic traffic is served by the entrypoint command.
- Several code snippets omitted required imports or placeholders. Added missing `json`, `os`, and Flask `request` imports, plus Cloud Tasks project/location/queue placeholders and a JSON content-type header.
- The Cloud Tasks example used the older request-wrapper style. Updated it to the current documented Python client call style, `client.create_task(parent=parent, task=task)`.
- The IAP example did not mention signed-header validation. Added a production note to validate `X-Goog-IAP-JWT-Assertion` before trusting identity values.
- The Datastore migration section recommended Cloud Firestore native mode for new development. Updated it to Datastore mode, which is the official recommendation for new Python 3 apps migrating from App Engine NDB/DB.
- The Blobstore replacement example showed a server-side Cloud Storage upload even though the old code generated an upload URL. Replaced it with a Cloud Storage V4 signed upload URL example.
- The dependency list included `google-cloud-firestore` for the Datastore migration path. Replaced it with `google-cloud-datastore`.

## Review Notes
The pinned package versions are illustrative and still use current APIs, but future readers may want to refresh them before starting a migration. Python 3.12 is still a valid runtime, though App Engine documentation currently shows newer Python runtimes as available.
