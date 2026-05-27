# Validation Summary: How to Set Up Internal Application Load Balancer with Serverless NEGs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Internal Application Load Balancer
- Serverless Network Endpoint Groups
- Cloud Run
- Google Cloud CLI
- Cloud DNS private zones
- Terraform Google provider resources
- Cloud Logging

## Sources Consulted
- Google Cloud: Set up a regional internal Application Load Balancer with Cloud Run - https://cloud.google.com/load-balancing/docs/l7-internal/setting-up-l7-internal-serverless
- Google Cloud: Serverless network endpoint groups overview - https://cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts
- Google Cloud: Internal Application Load Balancer overview - https://cloud.google.com/load-balancing/docs/l7-internal
- Google Cloud: Proxy-only subnets for Envoy-based load balancers - https://cloud.google.com/load-balancing/docs/proxy-only-subnets
- Google Cloud SDK: gcloud compute forwarding-rules create - https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- Google Cloud SDK: gcloud compute ssl-certificates create - https://cloud.google.com/sdk/gcloud/reference/compute/ssl-certificates/create
- Google Cloud SDK: gcloud compute target-https-proxies create - https://cloud.google.com/sdk/gcloud/reference/compute/target-https-proxies/create
- Google Cloud SDK: gcloud compute url-maps add-path-matcher - https://cloud.google.com/sdk/gcloud/reference/compute/url-maps/add-path-matcher
- Google Cloud: Restrict network ingress for Cloud Run - https://cloud.google.com/run/docs/securing/ingress
- Google Cloud: Internal Application Load Balancer logging and monitoring - https://cloud.google.com/load-balancing/docs/l7-internal/monitoring

## Issues Found
- The post described internal Application Load Balancers with serverless NEGs as a way to access Cloud Run, Cloud Functions, and App Engine. Internal Application Load Balancers with serverless NEGs support Cloud Run and Cloud Run functions (2nd gen), but not Cloud Functions 1st gen or App Engine. Updated the description and introduction accordingly.
- The sample Cloud Run deployment used `--ingress=internal-and-cloud-load-balancing` and described that as the critical internal-only setting. Google Cloud's internal Application Load Balancer guide recommends `--ingress=internal` because traffic from the internal Application Load Balancer is considered internal. Updated the command and explanation.
- The sample Cloud Run deployment used `--no-allow-unauthenticated`, but the later plain `curl` test expects an unauthenticated response. Updated the sample to `--allow-unauthenticated`, matching Google Cloud's internal load balancer guide where ingress restriction provides the network boundary.
- The URL mask example used `--cloud-run-url-mask="<service>"` while the explanation described path-based service extraction. Updated the mask to `internal.example.com/<service>` and aligned the explanation with Google Cloud's URL mask examples.
- The path matcher example omitted the host rule association required when adding a path matcher with `gcloud compute url-maps add-path-matcher`. Added `--new-hosts=internal.example.com`.
- The proxy-only subnet tip tied sizing directly to concurrent connections. Google Cloud recommends starting with `/23` and changing size as traffic needs change, with proxy allocation based on bandwidth, connections, and requests. Updated the wording.

## Review Notes
The `gcloud` CLI was not installed in the local environment, so command verification used official Google Cloud SDK reference documentation instead of local `--help` output.
