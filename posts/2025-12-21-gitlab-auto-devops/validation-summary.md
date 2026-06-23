# Validation Summary: How to Set Up Auto DevOps in GitLab

## Status
validated

## Post Type
Tutorial / Guide (setting up and customizing GitLab Auto DevOps)

## Technologies Covered
- GitLab CI/CD
- GitLab Auto DevOps
- Kubernetes
- Cloud Native Buildpacks / Dockerfile builds
- Helm charts
- Canary and incremental rollouts
- GitLab security scanning (SAST, Dependency Scanning, Container Scanning)
- Code Quality (CodeClimate-based)

## Sources Consulted
- Auto DevOps CI/CD variables: https://docs.gitlab.com/topics/autodevops/cicd_variables/ (build/deployment table and job-skipping table)
- Customize Auto DevOps: https://docs.gitlab.com/topics/autodevops/customize/
- Incremental rollouts: https://docs.gitlab.com/ci/environments/incremental_rollouts/
- Code Quality: https://docs.gitlab.com/ci/testing/code_quality/ and CodeClimate-based scanning (deprecated) page
- GitLab issue confirming AUTO_DEVOPS_DOMAIN → KUBE_INGRESS_BASE_DOMAIN migration (deprecated 11.8, removed 12.0)

## Issues Found
The post's structure and core Auto DevOps concepts are accurate, but it contained a layer of fabricated or removed CI/CD variables and two misused job-skipping variables. Fixes made:

1. **`AUTO_DEVOPS_DOMAIN` (removed in GitLab 12.0).** It appeared twice alongside `KUBE_INGRESS_BASE_DOMAIN`. Removed both occurrences; `KUBE_INGRESS_BASE_DOMAIN` (the current variable) was already present in both blocks.

2. **`AUTO_DEVOPS_TEST_SCRIPT` (does not exist).** Auto Test has no command-override variable. Rewrote the Auto Test example to use the real, presence-based `TEST_DISABLED` knob and clarified that you customize tests by defining your own test job.

3. **`TEST_DISABLED: "false"` and `REVIEW_DISABLED: "false"` (misused).** These are *presence-based* in GitLab docs — the job is skipped if the variable is present at all, regardless of value. Setting them to `"false"` would actually disable Auto Test / review apps. Corrected the examples to `"true"` and added comments explaining the presence-based behavior. (Note: the security `*_DISABLED` variables — `SAST_DISABLED`, `DEPENDENCY_SCANNING_DISABLED`, `CONTAINER_SCANNING_DISABLED`, `CODE_QUALITY_DISABLED` — are value-based, so `"false"` is correct for those and was left unchanged.)

4. **`CODE_QUALITY_EXCLUDE_PATHS` (does not exist).** CodeClimate-based Code Quality excludes paths via an `exclude_patterns` section in a `.codeclimate.yml` file, not a CI/CD variable. Replaced the fabricated variable line with an accurate note.

5. **`CANARY_WEIGHT` (does not exist).** Auto DevOps controls canary size with replica-count variables, not a traffic-weight percentage. Replaced `CANARY_WEIGHT: 25` with the real `CANARY_PRODUCTION_REPLICAS: 1`.

6. **`KUBERNETES_MEMORY_LIMIT`, `KUBERNETES_MEMORY_REQUEST`, `KUBERNETES_CPU_LIMIT`, `KUBERNETES_CPU_REQUEST` (not Auto DevOps variables).** Resource requests/limits are configured through the deploy Helm chart values (e.g. a `.gitlab/auto-deploy-values.yaml` file or `HELM_UPGRADE_VALUES_FILE`). Removed these from the deploy block, the environment-specific block, and the complete-config block, and added a note pointing to the Helm values mechanism.

7. **`INCREMENTAL_ROLLOUT_INTERVAL` (does not exist).** Timed incremental rollouts pause for a fixed default of 5 minutes between tranches; there is no such interval variable in the documented set. Removed the line and corrected the prose ("after a pause (5 minutes by default) between steps").

8. **`REVIEW_APP_AUTO_STOP_IN` (not a documented Auto DevOps variable).** Removed from the review-apps block and the complete-config block.

9. **`PROMETHEUS_METRICS_ENABLED` and `AUTO_DEVOPS_MODSECURITY_SEC_RULE_ENGINE` (removed/outdated).** Both depended on GitLab-managed cluster applications (in-cluster Prometheus and the managed NGINX Ingress ModSecurity WAF) that have been removed. Replaced the fabricated "Monitoring Integration" code block with an accurate statement that Auto DevOps no longer bundles these and that you should run your own monitoring stack.

## Review Notes
- **CodeClimate-based Code Quality is deprecated.** The post still describes Code Quality "using Code Climate," which is accurate today: the feature was deprecated in GitLab 17.3 with planned removal in 19.0, but it has not been removed yet. Left as-is; worth revisiting once 19.0 removal lands, after which integrating a supported tool directly is the recommended path.
- **Auto Build with Cloud Native Buildpacks:** `AUTO_DEVOPS_BUILD_IMAGE_EXTRA_ARGS` (passes `--build-arg` to `docker build`) and `BUILDPACK_URL` are real and were kept, though `--build-arg` applies to Dockerfile/kaniko builds rather than CNB builds — a minor nuance, not an error.
- The flowchart's "Auto Monitoring" node is left as a high-level conceptual stage; the body text now reflects that managed in-cluster monitoring was removed.
- Remaining variables and CI snippets (template `include`, `REPLICAS`, `CANARY_ENABLED`, `INCREMENTAL_ROLLOUT_MODE`, `ROLLOUT_RESOURCE_TYPE`, `STAGING_ENABLED`, `DOCKERFILE_PATH`, the `AUTO_DEVOPS_CHART*` variables, `SAST_EXCLUDED_PATHS`, the custom job overrides, and the Dockerfile example) were verified against the GitLab docs and are correct.
