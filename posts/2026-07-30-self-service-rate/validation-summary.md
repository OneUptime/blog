# Validation Summary: How to Calculate Self-Service Rate for Infrastructure, Deployments, and Access Requests

## Status
validated

## Post Type
Guide

## Technologies Covered
- Platform engineering and developer self-service workflows
- Infrastructure automation and Terraform
- CI/CD, deployment automation, and rollout health
- Identity and access management
- OpenTelemetry tracing
- Right-censored data and survival analysis

## Sources Consulted
- [Microsoft Learn: Self-service with guardrails](https://learn.microsoft.com/en-us/platform-engineering/about/self-service)
- [Microsoft Learn: Design a developer self-service foundation](https://learn.microsoft.com/en-us/platform-engineering/developer-self-service)
- [CNCF TAG App Delivery: Platforms White Paper](https://tag-app-delivery.cncf.io/whitepapers/platforms/)
- [OpenTelemetry Specification: Tracing API](https://opentelemetry.io/docs/specs/otel/trace/api/)
- [HashiCorp Developer: `terraform apply` command reference](https://developer.hashicorp.com/terraform/cli/commands/apply)
- [Kubernetes Documentation: `kubectl rollout status`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/)
- [DORA: Software delivery performance metrics](https://dora.dev/guides/dora-metrics/)
- [Microsoft Learn: Entitlement management request process and notifications](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-process)
- [NIST/SEMATECH e-Handbook: Censoring](https://www.itl.nist.gov/div898/handbook/apr/section1/apr131.htm)
- [NIST SP 800-53 Rev. 5: Security and Privacy Controls for Information Systems and Organizations](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)

## Issues Found
No technical issues found.

## Review Notes
- The two rate names and their formulas are explicitly defined operational metrics rather than standardized industry formulas. Their numerators, denominators, and worked arithmetic are internally consistent.
- The fenced `text` blocks are conceptual formulas, event names, and data fields, not executable code or configuration.
- Readiness checks, eligibility rules, and human-touch classifications necessarily vary by capability; the post correctly requires organizations to define and version them.
- The post contains no version-specific commands, executable configuration, or deprecated API usage.
