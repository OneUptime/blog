# Validation Summary: How to Implement Velero Disaster Recovery Drills and Runbook Automation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Velero
- Bash
- Python
- Kubernetes CronJobs
- GitHub Actions
- YAML
- AWS Route 53 CLI

## Sources Consulted
- Velero documentation: Overview and version guidance: https://velero.io/docs/v1.17/
- Velero documentation: Restore reference and namespace mappings: https://velero.io/docs/v1.15/restore-reference/
- Velero documentation: Restore API type: https://velero.io/docs/v1.17/api-types/restore/
- Velero documentation: Backup API type: https://velero.io/docs/v1.17/api-types/backup/
- Velero documentation: Resource filtering and include-resources behavior: https://velero.io/docs/v1.17/resource-filtering/
- Velero source: Backup status/progress fields: https://github.com/vmware-tanzu/velero/blob/main/pkg/apis/velero/v1/backup_types.go
- Velero source: Official container image Dockerfile: https://github.com/vmware-tanzu/velero/blob/main/Dockerfile
- Velero GitHub releases API, latest release and asset naming: https://api.github.com/repos/velero-io/velero/releases/latest
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors
- GitHub Actions workflow syntax: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- GitHub Actions environment variable documentation: https://docs.github.com/actions/how-tos/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables
- actions/upload-artifact README and deprecation notice: https://github.com/actions/upload-artifact

## Issues Found
- The manual and CronJob drill examples selected the most recent backup regardless of backup phase. Updated the `jq` filters to select only backups with `status.phase == "Completed"` and to fail clearly when no completed backup is found.
- The CronJob used `velero/velero:latest` while invoking `/bin/bash`, `jq`, and `kubectl`. The official Velero image is built as a Velero runtime image and should not be assumed to include those tools. Changed the example to use a purpose-built runner image that includes bash, jq, kubectl, and the Velero CLI.
- The Python framework read `backup_data['status']['totalItems']`, but Velero stores backup item counts under `status.progress.totalItems`. Updated the code to read `status.progress.totalItems` defensively.
- The GitHub Actions workflow used `actions/checkout@v2` and `actions/upload-artifact@v2`; artifact v1/v2 are deprecated, and v2 actions are not current. Updated these to v4.
- The GitHub Actions workflow exported `KUBECONFIG` inside one step, which would not persist to later steps. Updated it to write the variable to `$GITHUB_ENV` and set restrictive permissions on the kubeconfig file.
- The Velero CLI install command used a non-existent/latest-asset URL pattern. Updated it to read the latest Velero release tag from the official GitHub API and download the correctly named Linux AMD64 tarball.

## Review Notes
- The examples remain operational templates: users still need a valid Velero installation, correct RBAC for the CronJob service account, a runner image that contains the stated tools, and backup labels such as `environment=production` if they use the labeled backup selector.
- The Python, YAML, CronJob, Velero restore flags, namespace mapping examples, Kubernetes `kubectl wait`, and field selector usage were checked against official references. The Python snippet compiles, and all YAML snippets parse locally.
