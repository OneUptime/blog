# Validation Summary: How to Prepare for the Google Cloud Associate Cloud Engineer Exam Core Services

## Status
validated

## Post Type
Certification study guide

## Technologies Covered
- Google Cloud Associate Cloud Engineer certification
- Google Cloud CLI (`gcloud`)
- Compute Engine
- Google Kubernetes Engine (GKE)
- App Engine
- Cloud Run
- Cloud Run functions
- Cloud Storage and `gsutil`
- Cloud SQL, Spanner, Bigtable, and Firestore
- Google Cloud VPC, Cloud DNS, Cloud VPN, Cloud Interconnect, and Cloud Load Balancing
- Cloud Monitoring, Cloud Logging, Error Reporting, and Cloud Trace
- IAM and service accounts

## Sources Consulted
- Google Cloud Associate Cloud Engineer certification page: https://cloud.google.com/learn/certification/cloud-engineer
- Google Cloud Associate Cloud Engineer exam guide: https://services.google.com/fh/files/misc/associate_cloud_engineer_exam_guide_english.pdf
- `gcloud compute instances create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- `gcloud container clusters create-auto` reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/create-auto
- `gcloud run deploy` reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- `gcloud compute networks create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/create
- `gcloud compute networks subnets create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/create
- `gcloud logging sinks create` reference: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Cloud Storage storage classes: https://cloud.google.com/storage/docs/storage-classes
- Compute Engine Spot VMs: https://docs.cloud.google.com/compute/docs/instances/spot
- Compute Engine machine families: https://docs.cloud.google.com/compute/docs/general-purpose-machines, https://docs.cloud.google.com/compute/docs/compute-optimized-machines, https://docs.cloud.google.com/compute/docs/memory-optimized-machines
- App Engine environments: https://docs.cloud.google.com/appengine/docs/the-appengine-environments
- Cloud Run functions documentation: https://docs.cloud.google.com/functions/docs
- Cloud SQL Auth Proxy documentation: https://cloud.google.com/sql/docs/sqlserver/sql-proxy
- Cloud Load Balancing overview and selection guide: https://cloud.google.com/load-balancing/docs/load-balancing-overview, https://cloud.google.com/load-balancing/docs/choosing-load-balancer

## Issues Found
- The exam overview used an older five-domain breakdown and outdated weights. Updated it to the current four-section structure and approximate percentages from the official exam guide.
- The exam details said 50 questions and $200. Updated the standard exam to 50-60 questions, 2 hours, and $125 plus applicable tax.
- The post referred to Cloud Functions as a standalone exam topic. Updated the section to Cloud Run functions, matching current Google Cloud documentation and the current exam guide wording.
- The Cloud Storage bucket command comment incorrectly said the `gsutil mb` command created a lifecycle rule. Changed the comment to say it creates a bucket; the lifecycle rule is set by the following command.
- The Cloud SQL section used the older "Cloud SQL Proxy" name. Updated it to Cloud SQL Auth Proxy.
- The load balancing list used older product labels and oversimplified global/regional availability. Updated it to the current Application Load Balancer, Proxy Network Load Balancer, Passthrough Network Load Balancer, and internal load balancer terminology.
- The study strategy described a Google "practice exam." Updated this to "sample questions," which is the current official resource wording.
- The time management section used outdated domain names and weights. Updated it to match the current exam guide sections.
- The conclusion referenced an official practice exam and overemphasized Compute Engine/GKE as carrying the most weight. Updated it to reference official sample questions and broader compute, storage, and networking coverage.

## Review Notes
The shell environment did not have `gcloud`, `gsutil`, or `kubectl` installed, so CLI syntax was verified against official command reference documentation rather than local `--help` output. The remaining command examples match the referenced official CLI syntax, assuming the reader has an authenticated project and the required APIs enabled.
