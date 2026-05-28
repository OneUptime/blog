# Validation Summary: How to Configure Private Service Access for AlloyDB Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud AlloyDB for PostgreSQL
- Private Service Access
- VPC Network Peering
- Service Networking API
- Google Cloud CLI (`gcloud`)
- Compute Engine
- Google Kubernetes Engine
- Cloud VPN and Cloud Interconnect
- Kubernetes Deployments

## Sources Consulted
- Google Cloud AlloyDB private services access overview: https://cloud.google.com/alloydb/docs/about-private-services-access
- Google Cloud AlloyDB enable private services access: https://cloud.google.com/alloydb/docs/configure-connectivity
- Google Cloud AlloyDB create a cluster and primary instance: https://cloud.google.com/alloydb/docs/cluster-create
- Google Cloud AlloyDB connection overview: https://cloud.google.com/alloydb/docs/connection-overview
- Google Cloud AlloyDB connectivity option guidance: https://cloud.google.com/alloydb/docs/choose-alloydb-connectivity
- Google Cloud AlloyDB public IP documentation: https://cloud.google.com/alloydb/docs/connect-public-ip
- Google Cloud AlloyDB external connection documentation: https://cloud.google.com/alloydb/docs/connect-external
- Google Cloud VPC private services access documentation: https://cloud.google.com/vpc/docs/private-services-access
- Google Cloud VPC configure private services access: https://cloud.google.com/vpc/docs/configure-private-services-access
- Google Cloud CLI reference for `gcloud services vpc-peerings connect`: https://cloud.google.com/sdk/gcloud/reference/services/vpc-peerings/connect
- Google Cloud CLI reference for `gcloud services vpc-peerings update`: https://cloud.google.com/sdk/gcloud/reference/services/vpc-peerings/update
- Google Cloud CLI reference for `gcloud alloydb clusters create`: https://cloud.google.com/sdk/gcloud/reference/alloydb/clusters/create
- Google Cloud CLI reference for `gcloud alloydb instances create`: https://cloud.google.com/sdk/gcloud/reference/alloydb/instances/create
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The introduction said AlloyDB clusters do not get public IP addresses and that every AlloyDB instance communicates only over private IP. This is outdated because AlloyDB now supports optional inbound and outbound public IP. I changed the wording to clarify that this guide covers clusters using a private IP interface through Private Service Access.
- The introduction implied PSA is required before any first AlloyDB cluster. Current AlloyDB supports Private Service Connect as another private IP interface. I narrowed the statement to clusters that use PSA.
- The allocated range guidance said the minimum recommended size is `/20`. Google documents AlloyDB as using `/24` per region and recommends `/16` for sufficient address space. I updated the text accordingly.
- The connectivity section said applications can connect from the same VPC or a peered VPC. Private Service Access uses VPC peering, and transitive peering is not supported by default. I changed this to say direct private IP connectivity is from the configured VPC, and other environments need additional connectivity.
- The Kubernetes Deployment example was missing required `spec.selector` and pod template labels. I added matching selector and labels so the manifest is valid.
- The on-premises route example used both `--export-custom-routes` and `--import-custom-routes`. For PSA hybrid connectivity, the consumer VPC must export custom routes to the service producer network, and Cloud Router must advertise the AlloyDB ranges to on-premises. I removed `--import-custom-routes` from the command and clarified the surrounding text.

## Review Notes
The `gcloud` commands for allocating ranges, creating the private service connection, creating AlloyDB clusters and instances, describing instances, and adding additional allocated ranges match current Google Cloud CLI documentation. The post intentionally uses placeholder project, network, and password values; readers still need to substitute secure, environment-specific values.
