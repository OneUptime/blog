# Validation Summary: How to Set Up Automated Disaster Recovery Testing for GCP Workloads

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Platform
- Google Kubernetes Engine
- LitmusChaos
- Kubernetes CronJobs
- Cloud SQL Admin API
- Google Cloud CLI
- Cloud Load Balancing backend services and NEGs
- Firestore
- Python
- Slack webhooks

## Sources Consulted
- LitmusChaos install FAQ: https://litmuschaos.github.io/litmus/experiments/faq/install/
- LitmusChaos pod-delete experiment docs: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-delete/
- LitmusChaos pod-network-loss experiment docs: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-network-loss/
- LitmusChaos chaos-charts repository: https://github.com/litmuschaos/chaos-charts
- Cloud SQL Admin API overview: https://cloud.google.com/sql/docs/postgres/admin-api
- Cloud SQL Admin API v1beta4 instances.failover: https://docs.cloud.google.com/sql/docs/postgres/admin-api/rest/v1beta4/instances/failover
- gcloud backend-services update-backend reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update-backend
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- GKE CronJob guide: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/cronjobs
- Firestore Python server timestamp sample: https://docs.cloud.google.com/firestore/docs/samples/firestore-data-set-server-timestamp

## Issues Found
- The Litmus installation command referenced a versioned manifest URL that now returns 404. Updated it to the official stable operator manifest URL documented by Litmus.
- The Litmus experiment library command referenced an old ChaosHub API path that no longer resolves for the Kubernetes experiment bundle. Updated it to the current chaos-charts Kubernetes experiments manifest.
- The setup installed experiment definitions in `litmus`, while the sample `ChaosEngine` resources are created in `production`. Updated the command to install experiment definitions in the namespace where the `ChaosEngine` resources are created.
- The Cloud SQL Python sample used `google.cloud.sqladmin_v1beta4.SqlAdminServiceClient`, which is not the documented Cloud SQL Admin API Python pattern. Replaced it with the official Discovery API client pattern using `googleapiclient.discovery.build('sqladmin', 'v1beta4')`.
- The Cloud SQL failover sample used object field names from a generated client style that did not match the REST request body. Replaced it with the documented `failoverContext` JSON body.
- The database failover experiment described the test as automatic failover even though the code triggers a manual failover. Updated the docstring to say manual failover.
- The pod and network Litmus `chaosServiceAccount` values used `litmus-admin`. Updated them to the experiment-specific service accounts shown in the Litmus experiment docs.
- The network partition example put a Kubernetes DNS name in `DESTINATION_IPS`, which is documented for IPs and CIDRs. Changed it to `DESTINATION_HOSTS`.
- The region evacuation example imported and instantiated `compute_v1.BackendServicesClient` but did not use it, and it called an undefined `check_endpoints` function. Removed the unused client and added a concrete `gcloud compute backend-services get-health` helper.
- The region evacuation example used `--network-endpoint-group-region`, but the documented `gcloud compute backend-services update-backend` command accepts `--network-endpoint-group-zone` for NEGs. Updated the function signature and both commands accordingly.
- The region evacuation function hard-coded `https://app.example.com` despite taking workload parameters. Updated it to accept and use `app_url`.
- The orchestration script used `os.environ` without importing `os`. Added the missing import.
- The pod failure result did not set `hypothesis_confirmed`, causing the reporter to treat the experiment as passed by default. Added an explicit error-rate threshold result.

## Review Notes
- Embedded Python snippets were syntax-checked with `ast.parse`.
- The examples are still templates: they require real application endpoints, Cloud SQL HA instances, service accounts/RBAC, image builds, and Kubernetes permissions before they can run in a production or staging environment.
