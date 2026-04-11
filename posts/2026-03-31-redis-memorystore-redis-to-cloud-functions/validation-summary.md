# Validation Summary: How to Connect Memorystore Redis to Cloud Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Memorystore for Redis
- Google Cloud Functions (2nd gen)
- Serverless VPC Access Connector
- Python 3.12 with redis-py and functions-framework
- Terraform (Google Cloud provider)
- gcloud CLI

## Sources Consulted
- Google Cloud Functions deploy CLI reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Functions VPC networking docs: https://cloud.google.com/functions/docs/networking/connecting-vpc
- Google Cloud VPC Access Connector docs: https://cloud.google.com/vpc/docs/configure-serverless-vpc-access
- Terraform google_cloudfunctions2_function resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions2_function
- Terraform google_vpc_access_connector resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/vpc_access_connector
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/
- functions-framework-python: https://github.com/GoogleCloudPlatform/functions-framework-python

## Issues Found
1. **Incorrect gcloud flag for VPC egress settings**: The `gcloud functions deploy` command used `--vpc-egress=private-ranges-only`, but `--vpc-egress` is a `gcloud run deploy` flag, not a `gcloud functions deploy` flag. When using a VPC Access Connector with `gcloud functions deploy`, the correct flag is `--egress-settings=private-ranges-only`. Changed in both the deploy command (Step 2) and the Summary section.

## Review Notes
- The Python code correctly uses module-level connection reuse, which is the recommended pattern for Cloud Functions to minimize cold start overhead.
- The Terraform configuration correctly uses `vpc_connector_egress_settings = "PRIVATE_RANGES_ONLY"` (the Terraform attribute name differs from the gcloud flag name, and this is correct).
- The `redis==5.0.1` and `functions-framework==3.5.0` versions are valid and current.
- The VPC connector CIDR `/28` is the correct minimum size required by Serverless VPC Access.
