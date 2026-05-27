# Validation Summary: How to Scale a Google Cloud VMware Engine Private Cloud by Adding ESXi Hosts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud VMware Engine
- VMware ESXi
- vSphere clusters
- vSAN
- Google Cloud CLI
- Google Cloud VMware Engine API
- Python client library for VMware Engine
- VMware Engine autoscale

## Sources Consulted
- Google Cloud VMware Engine: Manage private cloud resources and activity: https://docs.cloud.google.com/vmware-engine/docs/private-clouds/howto-manage-private-cloud
- Google Cloud VMware Engine: Manage autoscale: https://docs.cloud.google.com/vmware-engine/docs/howto-autoscale
- Google Cloud VMware Engine: VMware Engine private clouds and node limits: https://docs.cloud.google.com/vmware-engine/docs/concepts-private-cloud
- Google Cloud VMware Engine REST API: Cluster resource and autoscaling settings: https://docs.cloud.google.com/vmware-engine/docs/reference/rest/v1/projects.locations.privateClouds.clusters
- Google Cloud SDK reference: gcloud vmware private-clouds clusters update: https://cloud.google.com/sdk/gcloud/reference/vmware/private-clouds/clusters/update
- Google Cloud Python client reference: VmwareEngineClient: https://docs.cloud.google.com/python/docs/reference/vmwareengine/latest/google.cloud.vmwareengine_v1.services.vmware_engine.VmwareEngineClient

## Issues Found
- The post stated that cluster expansion and new cluster creation happen "within minutes." Official samples describe cluster modification and creation as long-running operations that may take over an hour, so the wording was changed to avoid an inaccurate time guarantee.
- The post stated that a cluster can have 3 to 16 hosts. Current Google Cloud VMware Engine limits list 3 to 32 nodes per standard cluster that meets SLA requirements, so the host limit was corrected.
- The host add and remove examples used `--node-type-config` with `clusters update`. Official CLI guidance uses `--update-nodes-config` for updating node counts on an existing cluster, so the update examples were corrected.
- The Python update example mutated the fetched cluster and used a broad update mask. Official Python guidance builds an `UpdateClusterRequest`, sets `node_type_configs`, and uses `nodeTypeConfigs.*.nodeCount`, so the sample was aligned with that pattern.
- The post described the Python sample as using the REST API. It uses the Python client library, so that wording was corrected.
- The new cluster example stated that creation takes approximately 30 minutes. Official guidance says creation is a long-running operation that may take over an hour, so the message was corrected.
- The post stated that GCVE has no built-in auto-scaling and provided a custom Cloud Monitoring and Cloud Functions workflow using an unverified metric. Current GCVE docs include built-in autoscale based on CPU, memory, and storage utilization thresholds, so the section was updated to use the built-in autoscale configuration.
- The wrap-up referenced building autoscaling with Cloud Monitoring and Cloud Functions. This was updated to reference GCVE APIs or built-in autoscale.

## Review Notes
The examples still use `standard-72`, which is the canonical node type identifier used in current API and CLI examples. In user-facing node type tables this may appear with a display name such as `ve1-standard-72`.
