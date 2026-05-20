# Validation Summary: How to Handle ML Model Versioning with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications and AppProjects
- Argo Rollouts canary deployments
- Kubernetes Deployments, ConfigMaps, init containers, and GPU resource requests
- AWS CLI S3 artifact downloads
- GNU sha256sum checksum verification
- yq YAML editing
- Git-based rollback workflow

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD app sync command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo Rollouts Rollout specification: https://argoproj.github.io/argo-rollouts/features/specification/
- Argo Rollouts canary strategy documentation: https://argoproj.github.io/argo-rollouts/features/canary/
- Kubernetes ConfigMaps documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes GPU scheduling documentation: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- AWS CLI s3 cp command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- yq evaluate command documentation: https://mikefarah.gitbook.io/yq/commands/evaluate
- GNU Coreutils sha2 utilities documentation: https://www.gnu.org/software/coreutils/manual/html_node/sha2-utilities.html

## Issues Found
- The ConfigMap update flow incorrectly implied that changing ConfigMap data alone would roll out new Pods. Kubernetes does not automatically update environment variables in already-running Pods, so I added guidance to reflect the model version/checksum in the Pod template and added a Pod template annotation to trigger a Deployment rollout.
- The checksum example used a `sha256:` prefix, but `sha256sum -c` expects the raw checksum format. I changed the example to a raw 64-character SHA-256 digest and clarified the script input.
- The automation script updated only the ConfigMap, which could leave existing Pods running the old model configuration. I added a `yq` update for the Pod template annotation and adjusted the explanation accordingly.
- The Argo CD Application referenced project `ml-models`, while the AppProject example defined `ml-models-prod`. I aligned the Application to use `ml-models-prod`.
- The rollback section described syncing to `HEAD~1` without noting the interaction with automated sync. I changed it to describe this as a faster manual rollback when automated sync is paused.
- The Argo Rollouts snippet only included `spec.strategy`, but a Rollout also needs fields such as `replicas`, `selector`, and `template`. I added a minimal complete Rollout shape around the existing canary strategy.
- The AppProject section claimed AppProjects enforce model versions. AppProjects govern allowed repositories, destinations, and resource kinds, not semantic model versions, so I corrected the wording and pointed version-specific approval to CI, PR review, or admission policy.

## Review Notes
The examples remain illustrative and assume supporting pieces exist, such as AWS credentials in the downloader image, Argo Rollouts CRDs and controller installation, stable/canary Services, and an AnalysisTemplate named `model-performance-check`.
