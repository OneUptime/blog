# Validation Summary: How to Convert Kubernetes CronJobs to Argo Workflows for Advanced Scheduling

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes CronJobs
- Argo Workflows and CronWorkflows
- Argo CLI
- YAML workflow manifests
- Bash shell scripting
- PostgreSQL backup commands
- AWS CLI / S3 uploads
- Prometheus Operator ServiceMonitor and PrometheusRule resources

## Sources Consulted
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Argo Workflows installation documentation: https://argoproj.github.io/argo-workflows/installation/
- Argo Workflows CronWorkflow documentation: https://argo-workflows.readthedocs.io/en/latest/cron-workflows/
- Argo Workflows artifact repository documentation: https://argo-workflows.readthedocs.io/en/latest/configure-artifact-repository/
- Argo Workflows artifacts walkthrough: https://argo-workflows.readthedocs.io/en/release-3.7/walk-through/artifacts/
- Argo Workflows volumes walkthrough: https://argo-workflows.readthedocs.io/en/latest/walk-through/volumes/
- Argo Workflows output parameters documentation: https://argo-workflows.readthedocs.io/en/latest/walk-through/output-parameters/
- Argo Workflows enhanced depends logic: https://argo-workflows.readthedocs.io/en/release-3.4/enhanced-depends-logic/
- Argo Workflows variables reference: https://argo-workflows.readthedocs.io/en/release-3.5/variables/
- Argo Workflows CLI `argo cron list`: https://argo-workflows.readthedocs.io/en/latest/cli/argo_cron_list/
- Argo Workflows CLI `argo watch`: https://argo-workflows.readthedocs.io/en/latest/cli/argo_watch/
- Argo Workflows CLI logs quick-start usage: https://argo-workflows.readthedocs.io/en/release-3.5/quick-start/
- Argo Workflows metrics documentation: https://argo-workflows.readthedocs.io/en/release-3.4/metrics/

## Issues Found
- The original Kubernetes CronJob used the stock `postgres:15` image while also invoking `aws s3 cp`. The stock PostgreSQL image does not include the AWS CLI, so the example was changed to a custom `myorg/postgres-aws-cli:15` image for that combined backup/upload CronJob.
- The Argo backup examples attempted to share backup files between separate workflow steps using `emptyDir`. Separate Argo steps run in separate pods, so an `emptyDir` volume is not shared across those pods. The examples now use `volumeClaimTemplates` and write the output parameter file to the shared mounted path.
- The AWS CLI workflow templates used `bash` and the retry example omitted AWS credential environment variables. The examples now use `sh` for `amazon/aws-cli` containers and include the required AWS credential secret references.
- The ETL artifact example did not mention that Argo artifact passing requires an artifact repository. A short prerequisite sentence was added before the artifact-based workflow.
- The ETL conditional logic used `outputs.result` even though the script printed multiple lines, so the value would not equal `success`. The workflow now writes a dedicated `quality-status` output parameter and checks that parameter.
- The ETL failure notification depended on `load-to-warehouse` and checked a nonexistent `failure` result string, so it would not run when the task failed. The DAG now uses Argo enhanced `depends` expressions with `.Succeeded`, `.Failed`, and `.Errored` task results.
- The ETL DAG mixed `dependencies` and enhanced `depends` after adding failure handling. The DAG was converted to `depends` consistently, matching Argo's enhanced dependency rules.
- The warehouse and Slack `curl` calls did not fail on HTTP error responses. `-f` was added so failed HTTP responses cause the workflow task to fail.
- The `argo watch -n data` command omitted the required workflow argument. It now uses the documented `@latest` shortcut.
- The migration script generated invalid or incomplete YAML for array-valued container fields such as `command`. It now emits the first container and volumes as JSON values inside YAML using `jq`, and the surrounding text clarifies that it generates starter manifests.
- The ServiceMonitor example assumed a metrics Service existed, but Argo's default install does not include one. The snippet now creates the `workflow-controller-metrics` Service before the ServiceMonitor.
- The Prometheus alert used `argo_workflow_status_phase`, which is not the documented controller metric name for the referenced Argo metrics docs. It now uses `argo_workflows_count{phase="Failed"}`.

## Review Notes
- Static YAML parsing passed for all YAML snippets after the corrections.
- Local `argo` and `kubectl` binaries were not installed in the review environment, so CLI verification was performed against official documentation rather than local `--help` output.
- The article pins Argo Workflows `v3.5.5`. The examples were reviewed in that version context where relevant, but new installations should check the current Argo release notes and installation manifests before pinning an older version.
