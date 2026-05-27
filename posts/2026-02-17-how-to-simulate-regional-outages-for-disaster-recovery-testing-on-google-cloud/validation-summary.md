# Validation Summary: How to Simulate Regional Outages for Disaster Recovery Testing on Google Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud
- Compute Engine VPC firewall rules
- Cloud Load Balancing backend services
- Google Kubernetes Engine
- kubectl
- Cloud SQL for MySQL
- Bash scripting
- Cloud Monitoring metrics

## Sources Consulted
- Google Cloud SDK reference: gcloud compute firewall-rules create: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Google Cloud VPC firewall rules overview: https://cloud.google.com/firewall/docs/firewalls
- Google Cloud SDK reference: gcloud compute backend-services update: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google Cloud SDK reference: gcloud compute backend-services update-backend: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update-backend
- Google Cloud SDK reference: gcloud compute backend-services add-backend: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/add-backend
- Google Cloud SDK reference: gcloud sql instances promote-replica: https://cloud.google.com/sdk/gcloud/reference/sql/instances/promote-replica
- Google Cloud SDK reference: gcloud sql instances failover: https://cloud.google.com/sdk/gcloud/reference/sql/instances/failover
- Cloud SQL for MySQL read replica management: https://cloud.google.com/sql/docs/mysql/replication/manage-replicas
- Cloud SQL for MySQL high availability overview: https://cloud.google.com/sql/docs/mysql/high-availability
- Cloud SQL for MySQL replication lag: https://cloud.google.com/sql/docs/mysql/replication/replication-lag
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The firewall-based isolation text implied that VPC firewall rules could block all regional resources. Updated the wording to clarify that this method applies to tagged Compute Engine or GKE node resources.
- The load balancer example used `gcloud compute backend-services update --no-backends`, but `--no-backends` is not a valid flag for that command. Replaced it with `gcloud compute backend-services update-backend` and `--capacity-scaler=0` for the primary backend.
- The Cloud SQL replication status example used `replicaConfiguration.failoverTarget`, which is not the useful field for current read-replica status. Updated it to display `databaseReplicationEnabled` and `masterInstanceName`.
- The Cloud SQL HA failover description could be read as a cross-region test. Updated it to clarify that Cloud SQL built-in HA failover is a zonal failover test.
- The DR test script scaled all deployments to zero but restored only two named deployments. Added the missing `worker` restore command and rollout checks for all restored deployments.
- The RPO snippet attempted to read `replicaConfiguration.mysqlReplicaConfiguration.secondsBehindMaster` from `gcloud sql instances describe`, but replication lag is exposed through Cloud SQL metrics or `SHOW REPLICA STATUS`. Replaced it with a Cloud SQL connection step and `SHOW REPLICA STATUS \G`.

## Review Notes
The commands are examples and still require environment-specific substitutions such as backend names, zones, namespaces, deployment names, Cloud SQL users, and private connectivity choices. The local workspace did not have `gcloud` or `kubectl` installed, so CLI validation was performed against official command references rather than local `--help` output.
