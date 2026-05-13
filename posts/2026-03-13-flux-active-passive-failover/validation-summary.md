# Validation Summary: How to Implement Active-Passive Failover with Flux CD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize overlays
- Amazon Route 53 DNS failover
- Terraform AWS provider
- Bash scripting
- GitOps disaster recovery

## Sources Consulted
- Flux CLI documentation for `flux get all`, including `--context`, `--status-selector`, and `--no-header`: https://fluxcd.io/flux/cmd/flux_get_all/
- Flux notification Alert documentation, including Alert event sources and `eventMetadata.summary`: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference: https://fluxcd.io/flux/components/notification/api/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Terraform AWS provider `aws_route53_record` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS provider `aws_route53_health_check` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- Amazon Route 53 active-active and active-passive failover documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-types.html
- Amazon Route 53 health check documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover.html

## Issues Found
- The promotion script used `kubectl get nodes | grep -v NotReady`, which did not actually fail when a NotReady node existed and could succeed because of headers or Ready rows. Replaced it with `kubectl wait --for=condition=Ready nodes --all --timeout=2m`, which checks the Kubernetes Ready condition directly.
- The promotion script used `flux get all | grep -v True` to detect unhealthy Flux resources. This was unreliable because Flux output includes headers and other columns, and healthy rows can contain both `False` and `True` values. Replaced it with `flux get all --status-selector ready=false --no-header` and an explicit non-empty output check.
- The promotion script created and pushed a new failover branch, but Flux commonly reconciles a configured branch such as `main`; an unmerged branch would not be applied automatically. Updated the script to commit and push the standby promotion change to `main`.
- The Flux Alert example used `notification.toolkit.fluxcd.io/v1` for `Alert`, but current Flux documentation shows Alert examples under `v1beta3`; the v1 API reference only lists Receiver. Updated the Alert manifest to `notification.toolkit.fluxcd.io/v1beta3`.
- The Alert example used deprecated `.spec.summary`. Updated it to `.spec.eventMetadata.summary`, as recommended by Flux documentation.
- The failback script used `flux get all | grep -c "True"`, which only counted matching rows and did not prove the primary was healthy. Replaced it with the same `ready=false` non-empty output check used in the promotion script.
- The failback script referenced `apps/overlays/standby/replica-patch.yaml.original`, which was not part of the documented repository structure. Replaced it with an inline restoration of the documented minimal standby replica patch.
- The promotion script said DNS would route traffic once pods were Ready. Adjusted the wording to clarify that Route 53 routes based on DNS failover health, not directly on Kubernetes pod readiness.

## Review Notes
The Route 53 and Terraform snippets use valid failover routing and alias record fields. For production use, teams should still validate provider-specific details such as hosted zone IDs, load balancer resources, TTL behavior, and whether failover should rely on alias target health, explicit health checks, or both.
