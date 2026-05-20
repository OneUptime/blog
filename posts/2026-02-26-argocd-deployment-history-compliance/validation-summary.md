# Validation Summary: How to Track Deployment History for Compliance with ArgoCD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD Applications and sync history
- Argo CD CLI and API
- Argo CD Notifications
- Git and GitOps repositories
- Kubernetes audit logs
- AWS CLI / Amazon S3 artifact storage
- Compliance evidence for SOC 2, PCI DSS, HIPAA, and ISO 27001

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD `argocd app history` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_history/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_manifests/
- Argo CD Notifications webhook documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD Notifications subscriptions documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/notifications/subscriptions/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Git `git log` documentation: https://git-scm.com/docs/git-log
- AWS CLI `s3 cp` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- HHS HIPAA Security Rule overview: https://www.hhs.gov/hipaa/for-professionals/security/
- PCI Security Standards Council PCI DSS v4.0 publication notice: https://www.pcisecuritystandards.org/about_us/press_releases/securing-the-future-of-payments-pci-ssc-publishes-pci-data-security-standard-v4-0/

## Issues Found
- The retention example used `controller.status.processors` in `argocd-cmd-params-cm` as if it controlled deployment history retention. That key controls Application controller status worker count, not history retention. I removed the ConfigMap snippet and kept the correct `spec.revisionHistoryLimit` Application field.
- The post described Git as immutable and said every Argo CD deployment corresponds to a Git commit. I narrowed this to protected Git repositories and Git-backed Applications, because Git history can be rewritten without repository controls and Argo CD can also sync non-Git sources.
- The notification example defined a webhook service, template, and triggers but no subscription, so it would not deliver events. I added a global `subscriptions` block for the `compliance-tracker` webhook and added `oncePer` plus optional chaining in the triggers.
- The notification JSON could render an invalid boolean for automated syncs when `initiatedBy.automated` is absent. I changed it to render explicit `true` or `false` and default the initiator text to `automated`.
- The report script used `argocd app history --output json`, but current Argo CD CLI documentation lists only `wide` and `id` output for `argocd app history`. I changed the script to use `argocd app get -o json` and query `.status.history`.
- The Git report used a JSON-looking `git log --format` string that could produce invalid JSON if commit subjects or author names contained quotes. I changed it to a tab-separated format with ISO-strict dates.
- The image query and API history queries assumed arrays always exist. I added optional jq iteration so the examples do not fail on Applications without image or history data.
- The artifact-capture Job used a `bitnami/kubectl` image but then ran `aws s3 cp`, which would not work without AWS CLI in the image. It also captured a live namespace resource snapshot, not the exact rendered manifests. I replaced it with a script using `argocd app manifests --revision` and `aws s3 cp`.
- The PCI DSS reference used `6.4` for change control, which is outdated for PCI DSS v4.x. I updated it to `6.5.1`.
- The HIPAA mapping implied Argo CD provides ePHI access logs and that webhooks are inherently tamper-evident. I changed the wording to audit-controls evidence and noted that webhook records need append-only or WORM storage to be tamper-evident.

## Review Notes
The corrected examples are version-sensitive to current Argo CD CLI behavior as documented on the stable/latest command reference pages. In production, the S3 artifact upload script still needs normal operational setup: authenticated Argo CD CLI access, AWS credentials or workload identity, and S3 retention/object-lock policies if the compliance target requires tamper-resistant storage.
