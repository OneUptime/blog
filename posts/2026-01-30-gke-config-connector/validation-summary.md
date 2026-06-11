# Validation Summary: How to Create GKE Config Connector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Config Connector
- Kubernetes custom resources and manifests
- Workload Identity Federation for GKE
- Google Cloud IAM
- Cloud SQL
- Cloud Storage
- Pub/Sub
- Service Networking

## Sources Consulted
- Google Cloud Config Connector: Installing with the GKE add-on: https://docs.cloud.google.com/config-connector/docs/how-to/install-upgrade-uninstall
- Google Cloud Config Connector: Install Config Connector manually: https://docs.cloud.google.com/config-connector/docs/how-to/install-manually
- Google Cloud Config Connector: Choosing an installation type: https://docs.cloud.google.com/config-connector/docs/concepts/installation-types
- Google Cloud Config Connector SQLInstance reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/sql/sqlinstance
- Google Cloud Config Connector SQLUser reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/sql/sqluser
- Google Cloud Config Connector StorageBucket reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/storage/storagebucket
- Google Cloud Config Connector PubSubTopic reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/pubsub/pubsubtopic
- Google Cloud Config Connector PubSubSubscription reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/pubsub/pubsubsubscription
- Google Cloud Config Connector ServiceNetworkingConnection reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/servicenetworking/servicenetworkingconnection
- Google Cloud Config Connector reconciliation strategy: https://docs.cloud.google.com/config-connector/docs/concepts/reconciliation
- Google Cloud Config Connector state-into-spec guidance: https://docs.cloud.google.com/config-connector/docs/concepts/ignore-unspecified-fields
- Google Cloud Config Connector troubleshooting: https://docs.cloud.google.com/config-connector/docs/troubleshooting

## Issues Found
- The prerequisites implied the GKE add-on works on Autopilot. Updated the text to clarify that the add-on is Standard-only, while manual operator installation supports Standard or Autopilot.
- The add-on cluster creation command was missing documented release channel, logging, and monitoring flags. Added `--release-channel regular`, `--logging=SYSTEM`, and `--monitoring=SYSTEM`.
- The existing-cluster add-on flow did not update existing node pools for Workload Identity metadata. Added the documented `gcloud container node-pools update ... --workload-metadata=GKE_METADATA` command.
- The manual install command used `gsutil cp` and did not distinguish Standard from Autopilot operator manifests. Updated it to `gcloud storage cp` and added the Autopilot manifest path.
- The ConfigConnector and ConfigConnectorContext examples omitted the recommended `stateIntoSpec: Absent` setting. Added it to both examples.
- The PostgreSQL `SQLUser` example set `spec.host`, which Config Connector documents as unsupported for PostgreSQL users. Removed the field.
- The StorageBucket examples used `lifecycle.rule` and `isLive`, which are not Config Connector StorageBucket fields. Changed them to `lifecycleRule` and `withState`.
- The storage access example used `StorageBucketAccessControl` on a bucket with uniform bucket-level access enabled. Replaced the main example with `IAMPolicyMember` and limited `StorageBucketAccessControl` to legacy ACL-based buckets.
- The private Cloud SQL combined infrastructure example lacked private services access. Added `ComputeAddress` and `ServiceNetworkingConnection` resources and clarified the standalone private Cloud SQL example assumes private services access is already configured.
- The best-practice section recommended `cnrm.cloud.google.com/state-into-spec: "merge"` to get current state. Updated it to recommend `"absent"` and changed the description to match current guidance.
- The troubleshooting command used an undocumented `cnrm.cloud.google.com/force-reconcile` annotation and assumed a specific controller Deployment. Replaced the log command with a label selector and changed the reconciliation trigger to a generic metadata update.

## Review Notes
The post is technically relevant and covers current Config Connector workflows. The GKE add-on can lag behind the latest Config Connector release; the post now reflects that manual installation is the path for Autopilot or tighter version control.
