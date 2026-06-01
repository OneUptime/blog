# Validation Summary: How to Deploy Azure Arc-Enabled Data Services on Any Kubernetes Infrastructure

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Azure Arc-enabled data services
- Azure Arc-enabled Kubernetes
- Azure Arc-enabled SQL Managed Instance
- Azure CLI `arcdata`, `connectedk8s`, `k8s-extension`, and `customlocation` extensions
- Kubernetes storage classes and services
- Grafana, Kibana, and Azure Monitor

## Sources Consulted
- Microsoft Learn: Deploy Azure Arc data controller using Azure CLI - https://learn.microsoft.com/en-us/azure/azure-arc/data/create-data-controller-direct-cli
- Microsoft Learn: Azure CLI reference for `az arcdata dc` - https://learn.microsoft.com/en-us/cli/azure/arcdata/dc
- Microsoft Learn: Azure CLI reference for `az arcdata dc config` - https://learn.microsoft.com/en-us/cli/azure/arcdata/dc/config
- Microsoft Learn: Create custom locations on Azure Arc-enabled Kubernetes - https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/custom-locations
- Microsoft Learn: Plan an Azure Arc-enabled data services deployment - https://learn.microsoft.com/en-us/azure/azure-arc/data/plan-azure-arc-data-services
- Microsoft Learn: Deploy a SQL Managed Instance enabled by Azure Arc - https://learn.microsoft.com/en-us/azure/azure-arc/data/create-sql-managed-instance
- Microsoft Learn: Azure CLI reference for `az sql mi-arc` - https://learn.microsoft.com/en-us/cli/azure/sql/mi-arc
- Microsoft Learn: Azure CLI reference for `az sql mi-arc endpoint` - https://learn.microsoft.com/en-us/cli/azure/sql/mi-arc/endpoint
- Microsoft Learn: Azure CLI reference for `az sql midb-arc` - https://learn.microsoft.com/en-us/cli/azure/sql/midb-arc
- Microsoft Learn: Point-in-time restore for SQL Managed Instance enabled by Azure Arc - https://learn.microsoft.com/en-us/azure/azure-arc/data/point-in-time-restore
- Microsoft Learn: Limitations of SQL Managed Instance enabled by Azure Arc - https://learn.microsoft.com/en-us/azure/azure-arc/data/limitations-managed-instance
- Microsoft Learn: Azure Arc-enabled PostgreSQL server retirement notice - https://learn.microsoft.com/en-us/azure/azure-arc/data/what-is-azure-arc-enabled-postgresql
- Microsoft Learn: View logs and metrics using Kibana and Grafana - https://learn.microsoft.com/en-us/azure/azure-arc/data/monitor-grafana-kibana

## Issues Found
- The post described Azure Arc-enabled PostgreSQL as deployable. Azure Arc-enabled PostgreSQL server retired in July 2025, so I removed PostgreSQL from the title metadata, tags, description, introduction, and summary, and added a short retirement note where data service instances are introduced.
- The Kubernetes prerequisite listed version 1.24 or later. Microsoft Learn currently states the minimum supported Kubernetes version for Azure Arc-enabled data services is v1.21, so I corrected the prerequisite.
- The tools list only mentioned the `arcdata` extension, but the direct custom-location flow also uses `connectedk8s`, `k8s-extension`, and `customlocation`. I added those extensions to the prerequisites and install commands.
- The custom location sequence skipped creation of the Azure Arc data services Kubernetes extension. I added an `az k8s-extension create` command for the `microsoft.arcdataservices` extension before `az customlocation create`.
- The `control.json` sample included JavaScript-style comments inside a `json` fenced block, making it invalid JSON. I removed those comments.
- The SQL Managed Instance connection example queried an internal-looking `properties.k8sRaw` path from `az sql mi-arc show`. I changed it to use `az sql mi-arc endpoint list`, which is the documented endpoint command.
- The point-in-time restore command used `az sql mi-arc restore`, which is not the documented command for database PITR. I changed it to `az sql midb-arc restore` with source database, destination database, namespace, time, and `--use-k8s`.
- The storage scaling example used `az sql mi-arc update --volume-size-data`, but the update command does not expose `--volume-size-data`. I replaced that command with a note that storage expansion must be done by expanding the SQL Managed Instance data PVCs.

## Review Notes
The local environment did not have the Azure CLI installed, so CLI validation was performed against current Microsoft Learn CLI reference pages rather than local `az --help` output.
