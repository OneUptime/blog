# Validation Summary: How to Test ArgoCD Disaster Recovery Procedures

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes and kubectl
- Bash scripting
- Python YAML parsing
- GitHub Actions
- AWS CLI
- jq

## Sources Consulted
- Argo CD Disaster Recovery documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/disaster_recovery/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Getting Started installation documentation: https://github.com/argoproj/argo-cd/blob/master/docs/getting_started.md
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes API concepts for resourceVersion metadata: https://kubernetes.io/docs/reference/using-api/api-concepts/
- GitHub Actions schedule event documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
- actions/checkout documentation: https://github.com/actions/checkout
- AWS CLI s3 cp documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html

## Issues Found
- The ConfigMap recovery script reapplied an exported ConfigMap with server-managed metadata such as `resourceVersion`, `uid`, `creationTimestamp`, and `managedFields`. I changed the restore step to strip those fields before applying the backup so the object can be safely restored through the Kubernetes API.
- The repository credential validation script could fail when no repository secrets were exported because `yaml.safe_load()` can return `None` for an empty file. I added explicit handling for an empty document and return a count of zero.
- The full restore drill installed a hard-coded Argo CD `v2.13.0` manifest. I replaced it with a configurable `ARGOCD_VERSION` variable that defaults to `stable`, so the example is not pinned to an old release and can be set to match the production Argo CD version under test.
- The full restore drill restored AppProjects but did not restore Applications, despite being described as a full restore. I added an Application import block using the same namespace/status/metadata cleanup pattern as the AppProject restore and added Applications to the verification output.
- The GitHub Actions example ran a repository-local script without first checking out the repository. I added an `actions/checkout@v6` step before the backup validation command.

## Review Notes
The post uses a custom split-file backup layout (`applications.yaml`, `projects.yaml`, and `cm-*.yaml`) rather than Argo CD's official single-file `argocd admin export` format. That can be valid for teams that intentionally back up individual Kubernetes resources, but the backup and restore scripts must use the same layout. For real DR testing, the Argo CD version used in the restore drill should match the version used to create the backup.
