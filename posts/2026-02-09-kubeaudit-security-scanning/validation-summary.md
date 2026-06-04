# Validation Summary: How to Run Security Scanning Tests Against Kubernetes Clusters Using Kubeaudit

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubeaudit
- Kubernetes securityContext, AppArmor, Seccomp, Linux capabilities, RBAC, CronJob
- GitHub Actions
- GitLab CI
- jq
- Python JSON parsing

## Sources Consulted
- Shopify kubeaudit README and official CLI documentation: https://github.com/Shopify/kubeaudit
- Kubeaudit v0.22.2 release assets and local `kubeaudit all --help`: https://github.com/Shopify/kubeaudit/releases/tag/v0.22.2
- Kubeaudit all auditor documentation: https://github.com/Shopify/kubeaudit/blob/v0.22.2/docs/all.md
- Kubeaudit capabilities auditor documentation: https://github.com/Shopify/kubeaudit/blob/v0.22.2/docs/auditors/capabilities.md
- Kubeaudit netpols auditor documentation: https://github.com/Shopify/kubeaudit/blob/v0.22.2/docs/auditors/netpols.md
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- GitHub actions/checkout documentation: https://github.com/actions/checkout
- GitHub actions/upload-artifact documentation: https://github.com/actions/upload-artifact
- GitLab CI/CD YAML and artifacts documentation: https://docs.gitlab.com/ci/yaml/ and https://docs.gitlab.com/ci/jobs/job_artifacts/

## Issues Found
- Updated Kubeaudit release references from v0.22.0 to v0.22.2, the latest official release, and noted that the project was archived after its October 2024 deprecation notice.
- Replaced incorrect `-o json` output flags with `--format json --no-color`; kubeaudit v0.22.2 does not support `-o json` for the `all` command.
- Added `--exitcode 0` to CI scan commands that parse results later, because kubeaudit exits with code 2 when error-level findings are present.
- Fixed the CI `jq` examples to use `jq -s`, because kubeaudit JSON output is newline-delimited JSON objects rather than one JSON array.
- Updated GitHub Actions examples from deprecated `actions/checkout@v3` and `actions/upload-artifact@v3` to current documented major versions.
- Corrected the kubeaudit configuration example to use a map under `enabledAuditors`, an `auditors` section for auditor-specific options, and `--kconfig` instead of unsupported `--config`.
- Removed unsupported config-file exception fields and replaced the explanation with documented capability and limits options.
- Corrected the secure Deployment example so it produces zero kubeaudit results under v0.22.2 by adding the AppArmor annotation, explicitly setting `privileged: false`, and removing an unconfigured added capability.
- Replaced the unmaintained `shopify/kubeaudit:latest` CronJob image reference with a placeholder internal image built from v0.22.2, and changed the posted content type to `application/x-ndjson`.
- Scoped the CronJob RBAC example to the resource types kubeaudit needs to list instead of granting list access to all API groups and resources.
- Fixed the Python parser to read newline-delimited JSON and categorize results by kubeaudit's `level` field instead of using non-existent critical/high severity names.

## Review Notes
Kubeaudit remains usable for the examples shown, but it is archived and no longer actively maintained. New production security programs should evaluate actively maintained tools alongside or instead of kubeaudit.
