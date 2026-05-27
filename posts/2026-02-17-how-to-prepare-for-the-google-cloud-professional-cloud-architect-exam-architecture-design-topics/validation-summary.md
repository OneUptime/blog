# Validation Summary: How to Prepare for the Google Cloud Professional Cloud Architect Exam

## Status
validated

## Post Type
Certification study guide

## Technologies Covered
- Google Cloud Professional Cloud Architect certification
- Google Cloud architecture design
- Compute Engine managed instance groups
- Google Kubernetes Engine
- Cloud Run
- App Engine
- Cloud Functions
- Cloud SQL
- Cloud Spanner
- Cloud Firestore
- Cloud Bigtable
- BigQuery
- Memorystore
- Cloud Storage
- Storage Transfer Service
- Transfer Appliance
- Cloud VPN
- Cloud Interconnect
- Cloud Armor
- Cloud NAT
- VPC Service Controls
- Private Google Access

## Sources Consulted
- Google Cloud Professional Cloud Architect exam guide: https://cloud.google.com/learn/certification/guides/professional-cloud-architect
- Google Cloud Storage Transfer Service `gcloud transfer jobs create` documentation: https://cloud.google.com/storage-transfer/docs/create-transfers
- Transfer from a file system to Cloud Storage: https://cloud.google.com/storage-transfer/docs/create-transfers/agent-based/file-system-to-cloud-storage
- Google Cloud SDK `gcloud storage cp` reference: https://cloud.google.com/sdk/gcloud/reference/storage/cp
- Google Cloud gsutil documentation: https://cloud.google.com/storage/docs/gsutil/commands/cp
- Cloud Spanner SLA: https://cloud.google.com/spanner/sla
- Cloud Spanner instance configurations: https://cloud.google.com/spanner/docs/instance-configurations
- Cloud Storage storage classes and availability: https://cloud.google.com/storage/docs/storage-classes
- GKE regional clusters: https://cloud.google.com/kubernetes-engine/docs/concepts/regional-clusters
- GKE Horizontal Pod Autoscaler: https://cloud.google.com/kubernetes-engine/docs/concepts/horizontalpodautoscaler
- GKE Cluster Autoscaler: https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-autoscaler
- Compute Engine managed instance group autoscaling: https://cloud.google.com/compute/docs/autoscaler
- Cloud Run instance autoscaling and concurrency: https://cloud.google.com/run/docs/about-instance-autoscaling
- App Engine instance management and automatic scaling: https://cloud.google.com/appengine/docs/standard/how-instances-are-managed
- Migrate to Virtual Machines lifecycle: https://cloud.google.com/migrate/virtual-machines/docs/5.0/discover/lifecycle
- Transfer Appliance overview and transfer documentation: https://cloud.google.com/transfer-appliance/docs/4.0/overview
- Bigtable overview: https://cloud.google.com/bigtable/docs/overview
- BigQuery overview: https://cloud.google.com/bigquery/docs/introduction
- Firestore offline data documentation: https://cloud.google.com/firestore/native/docs/manage-data/enable-offline
- Cloud VPN overview: https://cloud.google.com/network-connectivity/docs/vpn/concepts/overview
- Cloud Interconnect overview: https://cloud.google.com/network-connectivity/docs/interconnect/concepts/overview
- Cloud Armor overview: https://cloud.google.com/armor/docs/cloud-armor-overview
- Cloud NAT overview: https://cloud.google.com/nat/docs/overview
- VPC Service Controls overview: https://cloud.google.com/vpc-service-controls/docs/overview
- Private Google Access overview: https://cloud.google.com/vpc/docs/private-google-access

## Issues Found
- The migration planning section recommended `gsutil` for uploads. Google Cloud documentation now describes `gsutil` as the legacy Cloud Storage CLI and recommends `gcloud storage` commands instead. Changed the prose and example to use `gcloud storage cp --recursive`.
- The Storage Transfer Service command used unsupported `--destination` and `--source-directory` flags for the current `gcloud transfer jobs create` syntax. Changed the example to pass the POSIX source and Cloud Storage destination as positional arguments and kept `--source-agent-pool`.

## Review Notes
The high-availability examples are simplified for exam-study purposes. Actual availability depends on the selected service, topology, configuration, and SLA; for example, Cloud Storage Standard has different SLA and typical availability values by location type. No further corrections were required for the scope of this study guide.
