# Validation Summary: How to Set Up Cloud Run Multi-Region Deployment with Global Load Balancing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Run
- Google Cloud global external Application Load Balancer
- Serverless Network Endpoint Groups
- Google Cloud CLI
- Google-managed SSL certificates
- Cloud CDN
- Google Cloud Armor
- Cloud Monitoring and Cloud Logging
- Cloud Spanner, Firestore, Cloud SQL, and Memorystore

## Sources Consulted
- Google Cloud: Set up a global external Application Load Balancer with Cloud Run, App Engine, or Cloud Run functions: https://docs.cloud.google.com/load-balancing/docs/https/setup-global-ext-https-serverless
- Google Cloud: Serverless network endpoint groups overview: https://docs.cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts
- Google Cloud: Forwarding rules overview: https://cloud.google.com/load-balancing/docs/forwarding-rule-concepts
- Google Cloud: Set up an HTTP-to-HTTPS redirect: https://cloud.google.com/load-balancing/docs/https/setting-up-http-https-redirect
- Google Cloud Armor: Configure rate limiting: https://cloud.google.com/armor/docs/configure-rate-limiting
- Google Cloud: Load balancing metrics: https://cloud.google.com/load-balancing/docs/metrics
- Google Cloud: Global external Application Load Balancer logging and monitoring: https://cloud.google.com/load-balancing/docs/https/https-logging-monitoring
- Google Cloud Firestore: Understand reads and writes at scale: https://docs.cloud.google.com/firestore/native/docs/understand-reads-writes-scale
- Google Cloud Spanner: TrueTime and external consistency: https://cloud.google.com/spanner/docs/true-time-external-consistency
- Google Cloud SQL: About replication: https://docs.cloud.google.com/sql/docs/mysql/replication

## Issues Found
- The post described routing to the closest healthy Cloud Run region and automatic failover as if serverless NEGs used load balancer health checks. Serverless NEG health checks are not supported, and application-level failures require outlier detection to reduce traffic to unhealthy serverless resources. Updated the architecture and summary wording and replaced the health check section with outlier detection and logging guidance.
- The global forwarding rule examples omitted `--load-balancing-scheme=EXTERNAL_MANAGED` and `--network-tier=PREMIUM`, which are part of the documented global external Application Load Balancer setup and required for global multi-region serving. Added those flags to the HTTP and HTTPS forwarding rules and added `--network-tier=PREMIUM` to the reserved global IP address.
- The HTTP redirect URL map import omitted `--global`. Added it to match the documented global URL map import flow.
- The Cloud Armor rate limiting rule omitted the required match condition and enforcement key. Added `--src-ip-ranges="*"` and `--enforce-on-key=IP`.
- The rollout verification example used a custom `Host` header when curling the direct Cloud Run `run.app` URL, which can produce misleading host-routing behavior. Simplified it to curl the regional Cloud Run URL directly.
- The stateful data section described Firestore as eventually consistent. Firestore provides strongly consistent reads by default, including in multi-region deployments. Updated the database guidance accordingly.
- The Cloud SQL read replica wording implied automatic nearest-replica reads. Updated it to clarify that the application must send reads to the nearest replica.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was performed against official Google Cloud SDK and product documentation rather than local `--help` output.
