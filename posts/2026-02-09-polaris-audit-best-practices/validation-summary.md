# Validation Summary: How to Use Polaris to Audit Kubernetes Deployments for Best Practice Compliance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Fairwinds Polaris
- Helm
- GitHub Actions
- jq

## Sources Consulted
- Fairwinds Polaris CLI Options: https://polaris.docs.fairwinds.com/cli/
- Fairwinds Polaris Infrastructure as Code: https://polaris.docs.fairwinds.com/infrastructure-as-code/
- Fairwinds Polaris Dashboard: https://polaris.docs.fairwinds.com/dashboard/
- Fairwinds Polaris Admission Controller: https://polaris.docs.fairwinds.com/admission-controller/
- Fairwinds Polaris Configuration: https://polaris.docs.fairwinds.com/customization/configuration/
- Fairwinds Polaris Check Settings: https://polaris.docs.fairwinds.com/customization/checks/
- Fairwinds Polaris Exemptions: https://polaris.docs.fairwinds.com/customization/exemptions/
- Fairwinds Polaris Security Checks: https://polaris.docs.fairwinds.com/checks/security/
- Fairwinds Polaris Reliability Checks: https://polaris.docs.fairwinds.com/checks/reliability/
- FairwindsOps Polaris GitHub releases: https://github.com/FairwindsOps/polaris/releases
- Fairwinds Helm chart templates for Polaris: https://github.com/FairwindsOps/charts/tree/master/stable/polaris

## Issues Found
- Updated the Linux install command from the older 8.5.0 release asset name to the current v10.2.0 release asset naming convention.
- Updated the Homebrew install snippet to include the documented FairwindsOps tap command.
- Replaced the dashboard `kubectl apply` URL because `releases/latest/download/dashboard.yaml` returns 404 for the current Polaris release; the official docs now show Helm installation.
- Renamed the "Configuring Custom Checks" heading to "Configuring Check Settings" because the snippet changes built-in check severities rather than defining custom JSON Schema checks.
- Corrected `readOnlyRootFilesystem` to `notReadOnlyRootFilesystem`, which is the current Polaris built-in check key.
- Updated GitHub Actions examples from v2 actions to current v4 actions and changed the report upload path to a report file that the audit command actually creates.
- Replaced the webhook `kubectl apply` URL because `releases/latest/download/webhook.yaml` returns 404 for the current Polaris release; the official docs now show Helm installation.
- Corrected the validating webhook configuration name to `polaris-validate-webhook`, matching the current Fairwinds Helm chart template.
- Removed the unsupported `--format html` audit example. Current Polaris audit formats are `json`, `yaml`, `pretty`, and `score`.
- Updated the `jq` examples to match the actual current Polaris JSON output shape and count failed checks across nested result objects.

## Review Notes
The revised Polaris configuration and `jq` examples were tested locally with the Polaris v10.2.0 Linux amd64 binary against a sample Kubernetes Deployment manifest.
