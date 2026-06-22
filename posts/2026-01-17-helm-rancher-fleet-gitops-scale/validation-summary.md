# Validation Summary: How to Use Rancher Fleet for GitOps at Scale with Helm Charts

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Rancher Fleet
- Rancher Manager Continuous Delivery
- Kubernetes
- Helm
- GitOps
- External Secrets Operator
- Sealed Secrets
- Prometheus Operator ServiceMonitor
- Prometheus / Grafana queries

## Sources Consulted
- Rancher Fleet fleet.yaml reference: https://fleet.rancher.io/0.15/reference/ref-fleet-yaml
- Rancher Fleet Git repository contents and target customization behavior: https://fleet.rancher.io/0.11/explanations/gitrepo-content
- Rancher Fleet configuration reference: https://fleet.rancher.io/0.15/reference/ref-configuration
- Rancher Fleet troubleshooting reference: https://fleet.rancher.io/0.15/troubleshooting
- Rancher Manager Fleet overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Rancher Fleet source API structs and metrics implementation: https://github.com/rancher/fleet
- Helm install command reference: https://helm.sh/docs/helm/helm_install/
- External Secrets Operator ExternalSecret API docs: https://external-secrets.io/latest/api/externalsecret/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The basic `targetCustomizations` example only set display names (`production`, `staging`) and did not include match criteria. Fleet matches target customizations by cluster selector, cluster group selector, explicit cluster group, or cluster name, so the first customization could match too broadly. Added matching `clusterSelector` blocks.
- The OCI Helm chart example used `repo` plus `chart`; current Fleet docs prefer the OCI chart reference in `helm.repo` without a separate chart name. Updated the example and replaced the ImagePullSecrets authentication note with Fleet Helm/OCI credential guidance.
- The drift ignore example used a JSON patch operation where `jsonPointers` is the clearer Fleet-supported way to ignore `/spec/replicas`. Updated the snippet.
- The GitRepo pause example used the `fleet.cattle.io/paused` annotation. Current Fleet API exposes `spec.paused`; updated the example.
- The `dependsOn` example included a `namespace` field that is not part of Fleet's `BundleRef` API. Removed it.
- The External Secrets example used unsupported `yaml.overlays.contents` inline content. Fleet YAML overlays are names of overlay directories, not inline manifests. Split the example into a valid `fleet.yaml` snippet and a separate `external-secret.yaml` manifest in the same bundle path.
- The progressive rollout example claimed manual approval on the final production target, but the snippet only orders targets. Removed the unsupported manual approval claim.
- The rollout strategy example used non-existent fields (`maxConcurrent`, `pauseBetweenBatches`, `autoPromote`). Replaced them with documented Fleet rollout fields: `maxUnavailable`, `autoPartitionSize`, and `autoPartitionThreshold`.
- The Prometheus query examples referenced non-existent metric names. Updated them to source-backed Fleet metric names such as `fleet_bundledeployment_state`, `fleet_gitrepo_ready_clusters`, and `fleet_bundle_err_applied`.
- The force re-sync command used an annotation. Current Fleet exposes `spec.forceSyncGeneration`; replaced it with a `kubectl patch` command.
- The Fleet CLI validation command used an unsupported `fleet apply --dry-run -b ./charts/myapp` form. Replaced it with `fleet apply myapp ./charts/myapp -o -`.
- The comparison table claimed Fleet scales to `1M+ clusters`; current Rancher/Fleet public guidance is better stated as thousands of clusters. Updated the table.

## Review Notes
Fleet behavior is version-sensitive. This review used the current Fleet 0.15 documentation and the Rancher Fleet source available on June 22, 2026. The post remains a high-level guide; users should still pin Fleet, Rancher, Helm chart, and External Secrets Operator versions in production examples.
