# Validation Summary: How to Create and Configure a Databricks Cluster in Azure Databricks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Databricks
- Databricks classic all-purpose compute and jobs compute
- Databricks Runtime and Databricks Runtime ML
- Apache Spark configuration
- Delta Lake optimized writes and auto compaction
- Photon
- Azure Spot Virtual Machines
- Azure Cost Management

## Sources Consulted
- Azure Databricks compute overview: https://learn.microsoft.com/en-us/azure/databricks/compute/
- Azure Databricks compute configuration reference: https://learn.microsoft.com/en-us/azure/databricks/clusters/create-cluster
- Azure Databricks jobs compute documentation: https://learn.microsoft.com/en-us/azure/databricks/jobs/compute
- Azure Databricks Photon documentation: https://learn.microsoft.com/en-us/azure/databricks/compute/photon
- Azure Databricks Runtime versions and compatibility: https://learn.microsoft.com/en-us/azure/databricks/release-notes/runtime/
- Azure Databricks Runtime 17.3 LTS release notes: https://learn.microsoft.com/en-us/azure/databricks/release-notes/runtime/17.3lts
- Azure Databricks compute policy reference: https://learn.microsoft.com/en-us/azure/databricks/admin/clusters/policy-definition
- Azure Databricks init scripts documentation: https://learn.microsoft.com/en-us/azure/databricks/init-scripts/
- Azure Databricks cluster-scoped init scripts documentation: https://learn.microsoft.com/en-us/azure/databricks/init-scripts/cluster-scoped
- Azure Databricks data file size optimization documentation: https://learn.microsoft.com/en-us/azure/databricks/optimizations/auto-optimize
- Azure Databricks compute metrics documentation: https://learn.microsoft.com/en-us/azure/databricks/compute/cluster-metrics
- Azure Databricks compute system tables reference: https://learn.microsoft.com/en-us/azure/databricks/admin/system-tables/compute
- Databricks Clusters API reference: https://docs.databricks.com/api/workspace/clusters/create
- Azure Spot Virtual Machines documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms

## Issues Found
- The introduction claimed every notebook, job, and query runs on a cluster. Updated this to reflect current Azure Databricks compute options, including all-purpose compute, jobs compute, serverless compute, and SQL warehouses.
- The post stated Azure Databricks offers two cluster types. Updated this to clarify that all-purpose compute and jobs compute are the two common classic Spark cluster types, not the full set of Azure Databricks compute options.
- The all-purpose setup steps used older "cluster" UI terminology. Updated the heading and button label to current all-purpose compute terminology.
- The runtime section described Photon as a separate "Photon Runtime." Updated it to describe Photon as a runtime engine enabled through the UI checkbox or `runtime_engine` API field.
- The cluster policy and job cluster examples used `14.3.x-scala2.12`. Updated examples to `17.3.x-scala2.13`, the latest supported LTS runtime at review time.
- The JSON snippets contained JavaScript-style comments, which made them invalid JSON. Moved those comments into surrounding prose so the snippets parse as JSON.
- The job cluster example claimed to use spot instances but set `azure_attributes.availability` to `ON_DEMAND_AZURE`. Changed it to `SPOT_WITH_FALLBACK_AZURE` and added `runtime_engine: "PHOTON"` for the Photon example.
- The init script section said to store init scripts in DBFS. Updated it to recommend Unity Catalog volumes, workspace files, or cloud storage, and to avoid the deprecated DBFS root.
- The monitoring section referenced Ganglia UI as generally available. Replaced it with current compute metrics UI and compute system tables guidance.

## Review Notes
The remaining sizing recommendations are reasonable examples, but exact VM availability, DBU rates, and supported runtimes can vary by workspace, region, policy, and access mode. Users should confirm available node types and runtime IDs in their own Azure Databricks workspace before applying these examples.
