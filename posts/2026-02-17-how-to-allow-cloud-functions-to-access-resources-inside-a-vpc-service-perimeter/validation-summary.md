# Validation Summary: How to Allow Cloud Functions to Access Resources Inside a VPC Service Perimeter

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud VPC Service Controls
- Cloud Run functions / Cloud Functions
- Serverless VPC Access
- Direct VPC egress
- Private Google Access and restricted.googleapis.com
- Cloud Storage, BigQuery, and Pub/Sub
- Google Cloud CLI
- Python Google Cloud client libraries

## Sources Consulted
- Google Cloud VPC Service Controls ingress and egress rules: https://docs.cloud.google.com/vpc-service-controls/docs/ingress-egress-rules
- Google Cloud VPC Service Controls private connectivity: https://docs.cloud.google.com/vpc-service-controls/docs/private-connectivity
- Google Cloud VPC Service Controls supported products and limitations: https://docs.cloud.google.com/vpc-service-controls/docs/supported-products
- Google Cloud SDK reference for gcloud functions deploy: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Serverless VPC Access connector documentation: https://docs.cloud.google.com/vpc/docs/configure-serverless-vpc-access
- Google Cloud SDK reference for Serverless VPC Access connector creation: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/vpc-access/connectors/create
- Cloud Run functions IAM documentation: https://cloud.google.com/functions/docs/concepts/iam
- Cloud Storage Python Blob reference: https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.blob.Blob
- BigQuery Python Client reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client

## Issues Found
- The post said VPC Service Controls does not care about IAM and only cares about the network boundary. I changed this to say VPC SC evaluates request context, including identity and network origin, because official ingress rule documentation supports identity-based and source-based conditions.
- The VPC connector section implied that `--egress-settings=all` alone makes Google API calls work correctly with VPC SC. I added the required Private Google Access and `restricted.googleapis.com` DNS caveat, because VPC SC private connectivity guidance recommends routing Google API calls to the restricted VIP.
- The Cloud Functions v2 Direct VPC egress command used `--egress-settings=all`. I changed it to `--direct-vpc-egress=all`, which is the current `gcloud functions deploy` flag for Direct VPC egress.
- The deployment ingress rule used `ANY_USER_ACCOUNT`. I changed it to `ANY_IDENTITY`, because VPC Service Controls documented limitations for Cloud Run functions say local-machine deployments cannot use `ANY_USER_ACCOUNT` or `ANY_SERVICE_ACCOUNT` in ingress/egress policies.
- The post used the App Engine default service account as the default Cloud Functions runtime identity. I changed the default examples and troubleshooting text to the Compute Engine default service account format, which current Cloud Run functions documentation lists as the default runtime service account.
- The conclusion and best practices repeated the connector-only framing. I updated those lines to include the restricted VIP requirement for Google API calls.

## Review Notes
The code snippets use current Google Cloud Python client methods (`Blob.download_as_text` and `Client.insert_rows_json`). The Pub/Sub background-function example is still a legacy-style function signature; it is valid for first-generation/background functions, but a future refresh could add a CloudEvents-style second-generation example.
