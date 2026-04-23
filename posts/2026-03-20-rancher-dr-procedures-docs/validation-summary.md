# Validation Summary: How to Document Rancher DR Procedures

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- RKE2
- AWS CLI
- Amazon S3
- Bash
- Markdown
- YAML

## Sources Consulted
- Rancher Helm chart options: https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/v2.10/en/installation-and-upgrade/references/helm-chart-options.html
- RKE2 HA infrastructure guidance for Rancher: https://documentation.suse.com/cloudnative/rancher-manager/v2.9/en/installation-and-upgrade/infrastructure-setup/ha-rke2-kubernetes-cluster.html
- Rancher backup guide: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-rancher
- Rancher backup configuration reference: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- AWS CLI `s3 ls` reference: https://docs.aws.amazon.com/cli/latest/reference/s3/ls.html
- AWS CLI `s3 sync` reference: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- CommonMark fenced code block spec: https://spec.commonmark.org/0.31.2/#fenced-code-blocks
- RKE2 networking services reference: https://documentation.suse.com/cloudnative/rke2/latest/en/networking/networking_services.html
- Rancher support portal check: https://support.rancher.com

## Issues Found
- The sample runbook used `https://rancher.example.com/v3/ping` as the Rancher health check. For the post's RKE2-based Rancher example, official Rancher docs document `/healthz` for health checks and the RKE2 install path uses NGINX Ingress by default. I updated the command to `curl -I https://rancher.example.com/healthz`.
- The outer fenced Markdown example used triple backticks while containing inner triple-backtick `bash` blocks, and its closing fence incorrectly included an info string. CommonMark requires a matching closing fence without an info string. I changed the outer sample fence to four backticks so the example renders correctly.
- The DR documentation tree listed `contacts.md`, while the template below was `contacts.yaml`. I updated the tree entry to `contacts.yaml` to keep the file format consistent.
- The backup filename placeholder implied a fixed Rancher backup naming scheme. Official Rancher backup docs only require using the generated backup filename and show operator-generated names that vary. I replaced it with a generic placeholder based on the S3 listing.
- The monthly review reminder script stored its state in `/tmp`, which is not reliable for month-to-month tracking because `/tmp` is commonly ephemeral. I updated it to use `$HOME/.dr-docs-last-review.txt`.

## Review Notes
- `aws s3 ls s3://... --recursive` and `aws s3 sync ./dir s3://...` are valid current AWS CLI 2 commands.
- `support.rancher.com` currently resolves to the SUSE Customer Center, so the support URL in the YAML template is plausible.
- The restore section is intentionally left as `...`, so there were no restore commands to validate in this post.
- Version caveat: current RKE2 docs still show `ingress-nginx` deployed by default, but it is deprecated in RKE2 v1.36. Teams that switch Rancher on RKE2 to Traefik may prefer `/ping` instead of `/healthz` for ingress-level health checks.
