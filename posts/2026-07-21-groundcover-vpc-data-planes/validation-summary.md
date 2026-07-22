# Validation Summary: Does Groundcover Data Leave Your VPC? Control and Data Planes

## Status

validated

## Post Type

Technical reference and cloud-security architecture guide

## Technologies Covered

- Groundcover BYOC, on-premises, and air-gapped deployment modes
- Kubernetes and eBPF-based telemetry collection
- ClickHouse and VictoriaMetrics
- Cloud object storage, including Amazon S3, Google Cloud Storage, and Azure Blob Storage
- Cloud VPC networking, IAM federation, and managed control-plane access
- SSO authentication through OIDC and SAML
- Observability data flows for logs, metrics, traces, and Kubernetes events

## Sources Consulted

- [Groundcover architecture overview](https://docs.groundcover.com/architecture/overview)
- [Groundcover BYOC architecture](https://docs.groundcover.com/architecture/byoc)
- [Groundcover BYOC high availability](https://docs.groundcover.com/architecture/byoc/high-availability)
- [Groundcover security considerations](https://docs.groundcover.com/architecture/security-considerations)
- [Groundcover Kubernetes requirements](https://docs.groundcover.com/getting-started/requirements/kubernetes-requirements)
- [Groundcover FAQ](https://docs.groundcover.com/welcome/faq)

## Issues Found

No technical issues found.

## Review Notes

The post contains no executable code, CLI commands, or configuration, but it does contain substantive technical implementation and security-architecture details, so it was reviewed rather than classified as a non-code blog. The official documentation distinguishes customer-environment storage from the external BYOC frontend, SSO, managed control plane, encrypted UI tunnel, SaaS governance metadata, and opt-out deployment telemetry. It also confirms object-storage transfer for logs, traces, and events and network transfer for metrics. Groundcover's deployment architecture and product packaging may change, so the post's recommendation to date each assessment and verify the installed deployment mode remains important.
