# Validation Summary: Groundcover Cost at Scale: Nodes, Storage, and BYOC Infrastructure

## Status

validated

## Post Type

Technical reference and FinOps cost-modeling guide

## Technologies Covered

- Groundcover observability platform
- Bring Your Own Cloud (BYOC) architecture
- Kubernetes and eBPF node sensors
- ClickHouse
- VictoriaMetrics
- Object storage and persistent block storage
- AWS, Google Cloud, and Microsoft Azure infrastructure
- Observability retention, sampling, filtering, and cost allocation

## Sources Consulted

- [Groundcover pricing](https://www.groundcover.com/pricing)
- [Groundcover billing](https://docs.groundcover.com/use-groundcover/billing)
- [Groundcover architecture overview](https://docs.groundcover.com/architecture/overview)
- [Groundcover BYOC architecture](https://docs.groundcover.com/architecture/byoc)
- [Groundcover BYOC high availability](https://docs.groundcover.com/architecture/byoc/high-availability)
- [Groundcover BYOC disaster recovery](https://docs.groundcover.com/architecture/byoc/disaster-recovery)
- [Groundcover BYOC setup on AWS](https://docs.groundcover.com/architecture/byoc/setup-byoc-with-aws)
- [Groundcover BYOC setup on GCP](https://docs.groundcover.com/architecture/byoc/setup-byoc-with-gcp)
- [Groundcover BYOC setup on Azure](https://docs.groundcover.com/architecture/byoc/setup-byoc-with-azure)
- [Groundcover requirements](https://docs.groundcover.com/getting-started/requirements)
- [Groundcover Kubernetes sensor deployment coverage](https://docs.groundcover.com/customization/customize-deployment/configuring-sensor-deployment-coverage)
- [Groundcover custom data retention](https://docs.groundcover.com/customization/customize-usage/custom-data-retention)
- [Groundcover custom storage](https://docs.groundcover.com/customization/customize-usage/custom-storage)
- [Groundcover custom logs collection](https://docs.groundcover.com/customization/customize-usage/custom-logs-collection)
- [Groundcover eBPF sampling controls](https://docs.groundcover.com/customization/customize-usage/controlling-the-ebpf-sampling-mechanism)
- [AWS Pricing Calculator](https://calculator.aws/)
- [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator)
- [Azure Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/)

## Issues Found

No technical issues found.

## Review Notes

The pricing page currently labels Free, Pro, and Enterprise as BYOC, while Groundcover's managed-BYOC architecture page says BYOC is available only on Enterprise. The post accurately identifies this documentation inconsistency and advises readers to confirm entitlement rather than assume. Pricing, plan names, retention defaults, and deployment requirements are time-sensitive; the post appropriately dates its research and tells readers to use contracted terms and current documentation.
