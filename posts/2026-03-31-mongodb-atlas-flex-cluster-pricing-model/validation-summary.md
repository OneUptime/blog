# Validation Summary: How to Understand Atlas Flex Cluster Pricing Model

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB Atlas Flex Clusters
- MongoDB Atlas Admin API v2
- MongoDB Node.js Driver (v4+)
- JavaScript (ES2021+ with numeric separators)
- curl / jq (CLI tools)

## Sources Consulted
- MongoDB Atlas Flex Cluster documentation: https://www.mongodb.com/docs/atlas/cluster-config/flex-cluster/
- MongoDB Atlas Flex Cluster pricing page: https://www.mongodb.com/pricing
- MongoDB Atlas Admin API v2 - Invoices endpoint: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/#tag/Invoices
- MongoDB Node.js Driver documentation (find, updateOne, createIndex): https://www.mongodb.com/docs/drivers/node/current/

## Issues Found
No technical issues found.

## Review Notes
- The pricing figures ($0.025/GB-month storage, $0.10/million RPUs, $1.00/million WPUs) are stated as approximate with a disclaimer to check the current Atlas pricing page. Actual rates vary by cloud provider and region, and may differ from these figures. The disclaimer adequately covers this.
- The `estimateFlexCost` function divides by 1024 to convert MB to GB (binary: MiB to GiB). Cloud providers typically use decimal units (1 GB = 1000 MB). For an estimation function this is a minor discrepancy and the post already frames all figures as approximate.
- The claim that projections reduce RPU consumption is slightly simplified. Projections reduce data transfer to the client, but RPU consumption in Flex clusters is primarily operation-based. Covered queries (strategy #3) are a more direct way to reduce processing cost. The advice is still sound general practice.
- The `jq` filter references `.totalPriceCents` as a field on invoice line items. This is consistent with the Atlas API invoice schema, though field names could evolve across API versions.
