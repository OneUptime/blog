# Validation Summary: How to Deploy Teleport Access Platform with Flux CD

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Teleport Access Platform
- Teleport Helm charts
- Flux CD HelmRelease, HelmRepository, and Kustomization resources
- Kubernetes
- GitHub OAuth / Teleport GitHub connector
- NGINX Ingress

## Sources Consulted
- Teleport `teleport-cluster` Helm chart reference: https://goteleport.com/docs/reference/helm-reference/teleport-cluster/
- Teleport Helm chart source values: https://raw.githubusercontent.com/gravitational/teleport/branch/v18/examples/chart/teleport-cluster/values.yaml
- Teleport `tctl` CLI reference: https://goteleport.com/docs/reference/cli/tctl/
- Teleport role templates and GitHub connector example: https://goteleport.com/docs/zero-trust-access/rbac-get-started/role-templates/
- Teleport role reference / preset roles: https://goteleport.com/docs/reference/access-controls/roles
- Teleport enhanced session recording with BPF: https://goteleport.com/docs/enroll-resources/server-access/guides/bpf-session-recording/
- Teleport session recording architecture: https://goteleport.com/docs/reference/architecture/session-recording/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization health checks: https://v2-0.docs.fluxcd.io/flux/components/kustomize/kustomization/
- GitHub OAuth App callback URL documentation: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app
- Kubernetes TLS Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/#tls-secrets

## Issues Found
- The post created a `teleport.yaml` ConfigMap that was never referenced by the Flux `HelmRelease`, and the claim that the chart requires a large external `teleport.yaml` was inaccurate. Replaced that step with creation of the TLS secret that the Helm values actually reference.
- The `teleport-cluster` chart version range was pinned to Teleport 15.x. Updated it to 18.x to match the current official Teleport chart documentation reviewed on 2026-05-13.
- The Helm values used several incorrect or outdated chart keys: `persistence.size`, `auth.replicas`, `proxy.replicas`, and `ingress.annotations`. Updated them to current chart values including `persistence.volumeSize`, `highAvailability.replicaCount`, `proxy.highAvailability.replicaCount`, and `annotations.ingress`.
- The Ingress example omitted required chart settings for Ingress exposure. Added `proxyListenerMode: multiplex` and `service.type: ClusterIP`, which the Teleport chart documents for Ingress deployments.
- The session recording example used a non-existent `sessionRecording.uploadTo` value. Replaced it with the chart-supported `sessionRecording: proxy` value and updated the production object-storage note to reference supported cloud chart modes such as `chartMode: aws` with `aws.sessionRecordingBucket`.
- The GitHub connector command used a quoted heredoc, so shell substitutions for the OAuth client ID and secret would not run. Reworked the command to read the Kubernetes Secret into variables and pass the rendered connector YAML to `tctl create -f -`.
- The `kubectl exec` examples used uncertain pod labels and service names. Updated them to use the chart-created auth Deployment name for the `teleport-cluster` release.
- The verification command said it listed nodes and clusters but only used `tctl nodes ls`. Changed it to `tctl kube ls` to verify Kubernetes cluster enrollment.
- The best-practice command `tctl roles ls` is not a current documented `tctl` command. Changed it to `tctl get roles`.
- The enhanced recording note used `enhanced_recording: true`, but current Teleport configuration expects `ssh_service.enhanced_recording.enabled: true`. Updated the wording accordingly.

## Review Notes
- The tutorial now aligns with the current Teleport 18.x chart reference. Future updates should revisit the chart major version range when Teleport 19 becomes stable.
- The guide still uses imperative `kubectl create secret` commands for secrets, which is acceptable for a compact tutorial but could be replaced with a GitOps secret management workflow such as SOPS or External Secrets in a future post.
