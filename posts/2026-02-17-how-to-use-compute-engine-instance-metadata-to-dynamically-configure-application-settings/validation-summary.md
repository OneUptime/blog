# Validation Summary: How to Use Compute Engine Instance Metadata to Dynamically Configure App

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Compute Engine
- Compute Engine VM metadata server
- Google Cloud CLI
- Bash and curl
- Python requests
- Node.js HTTP module
- Cloud Storage and gsutil
- Secret Manager

## Sources Consulted
- Google Cloud Compute Engine: About VM metadata: https://docs.cloud.google.com/compute/docs/metadata/overview
- Google Cloud Compute Engine: View and query VM metadata: https://docs.cloud.google.com/compute/docs/metadata/querying-metadata
- Google Cloud Compute Engine: Set and remove custom metadata: https://docs.cloud.google.com/compute/docs/metadata/setting-custom-metadata
- Google Cloud Compute Engine: Predefined metadata keys: https://docs.cloud.google.com/compute/docs/metadata/predefined-metadata-keys
- Google Cloud SDK: gcloud compute instances create: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud SDK: gcloud compute instances add-metadata: https://cloud.google.com/sdk/gcloud/reference/compute/instances/add-metadata
- Google Cloud SDK: gcloud compute project-info add-metadata: https://docs.cloud.google.com/sdk/gcloud/reference/compute/project-info/add-metadata
- Google Cloud Secret Manager overview: https://docs.cloud.google.com/secret-manager/docs/overview
- Node.js HTTP documentation: https://nodejs.org/api/http.html

## Issues Found
- The post stated there were only two metadata levels. Google Cloud documents project, zonal, and instance metadata scopes. Updated the wording to include zonal metadata.
- The post stated instance metadata takes precedence when both levels define the same key. Google Cloud specifically documents project and zonal metadata precedence in the project metadata path, with zonal values taking precedence in that zone. Updated the explanation to avoid implying automatic project-to-instance fallback semantics.
- The Node.js example set a timeout option but did not abort the request on timeout. Node.js documents that setting the timeout option or using setTimeout only emits a timeout event unless the request is explicitly destroyed. Updated the sample to call req.setTimeout and destroy the request on timeout, and to reject non-200 responses.
- The post referred to a `wait-for-change` parameter. Google Cloud's query parameter is `wait_for_change`. Updated the text to use the exact parameter name.
- The post stated metadata is not encrypted at rest. The official metadata security guidance instead emphasizes that any process able to query the metadata URL can access metadata values. Updated the security guidance to match the documented risk.
- The post stated there is a 256KB limit for all custom metadata combined. Google Cloud documents a 512KB combined limit for all metadata entries and a 256KB limit per metadata value. Updated the limit statement.

## Review Notes
The remaining commands, metadata URLs, required `Metadata-Flavor: Google` header, recursive metadata query behavior, ETag usage, predefined metadata keys, and Google Cloud CLI flags were consistent with the official documentation reviewed.
