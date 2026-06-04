# Validation Summary: How to Set Up Git Webhook Receivers for Immediate Flux Reconciliation on Push

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Flux notification-controller
- Flux Receiver API
- Flux GitRepository API
- Flux Kustomization API
- Kubernetes Ingress
- Kubernetes NetworkPolicy
- GitHub webhooks
- GitLab webhooks
- HMAC-signed generic webhooks

## Sources Consulted
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The Ingress backend targeted `notification-controller`, but the current Flux webhook guide documents the in-cluster webhook Service as `webhook-receiver` on port 80. Updated the Ingress backend service name.
- The GitLab Receiver used `push` and `tag_push`, but Flux filters GitLab events by the `X-Gitlab-Event` values `Push Hook` and `Tag Push Hook`. Updated the GitLab Receiver events.
- The post claimed webhooks for non-main branches would not trigger reconciliation. Flux receivers can still receive those webhooks; the GitRepository fetches only the configured branch and reports no new artifact if that branch is unchanged. Reworded the claim.
- The tag example used `tag: v1.*`, but Flux `.spec.ref.tag` is for a specific tag. Changed the example to `.spec.ref.semver` with a SemVer range.
- The generic webhook example used `type: generic` while showing an `X-Signature` header. Flux's unsigned generic receiver does not validate requests; HMAC validation uses `type: generic-hmac` and signs the request body. Updated the Receiver and curl example.
- The path-specific webhook section described commit message filters and implied webhooks only reconcile for matching paths. Flux `.spec.ignore` limits the generated source artifact; it does not filter webhook delivery. Reworded the section.
- The verification command used `kubectl get gitrepository` and told readers to check a "Last Update" column. Flux documents the artifact "Last Update Time" under `kubectl describe gitrepository`. Updated the command and explanation.
- The debugging checklist said to verify ingress routes to `notification-controller`; with the corrected Ingress, it should route to the `webhook-receiver` Service. Updated the checklist.

## Review Notes
The local environment did not have the Flux CLI installed, so Flux CLI behavior was checked against official Flux documentation rather than local `--help` output. Kubernetes command syntax was reviewed against standard `kubectl` usage and Kubernetes API documentation.
