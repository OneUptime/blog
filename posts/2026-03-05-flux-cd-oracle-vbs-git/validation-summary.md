# Validation Summary: How to Set Up Flux CD on Oracle VBS Git Repositories

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Oracle Visual Builder Studio Git repositories
- Oracle Kubernetes Engine
- OCI CLI
- SSH and HTTPS Git authentication
- Flux webhook Receivers

## Sources Consulted
- Flux CLI documentation for `flux create secret git`: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Flux bootstrap documentation for Oracle VBS Git Repositories: https://fluxcd.io/flux/installation/bootstrap/oracle-vbs-git-repositories/
- Flux Source API reference for `GitRepository` authentication secrets: https://fluxcd.io/flux/components/source/api/v1/
- Flux installation documentation for `flux install`: https://fluxcd.io/flux/installation/
- Flux webhook Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver setup guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux CLI documentation for `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Oracle Visual Builder Studio Git clone documentation: https://docs.oracle.com/en/cloud/paas/visual-builder/visualbuilder-building-applications/download-your-applications-sources.html
- Oracle Visual Builder Studio webhook documentation: https://docs.oracle.com/en/cloud/paas/visual-builder/visualbuilder-manage-development-process/send-notifications-external-software-using-webhooks.html
- OCI CLI `ce cluster create-kubeconfig` command reference: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/ce/cluster/create-kubeconfig.html

## Issues Found
- The VBS SSH examples used `git@host`, which is not the SSH user format shown in Oracle Visual Builder Studio Git clone examples. Updated the examples to use a VBS SSH user placeholder and instruct readers to copy the exact SSH URL from the VBS repository Clone menu.
- The `flux create secret git` example used `--known-hosts-file`, which is not a current documented flag. Removed the flag and clarified that Flux scans the SSH host key automatically, while the kubectl secret path can use a pre-scanned `known_hosts` file.
- The HTTPS VBS URL examples did not match Oracle's documented VBS HTTPS repository path shape. Updated them to include the `/s/<project>/scm/<repo>.git` path segment.
- The HTTPS Flux secret used username/password basic auth. Updated it to use `--bearer-token`, which matches the current Flux Oracle VBS bootstrap documentation and Flux GitRepository secret support.
- The post implied Flux had no VBS bootstrap option. Updated the wording to say Flux has a documented Oracle VBS bootstrap flow, while this guide covers the manual `flux install` plus `GitRepository` approach.
- The Flux generic Receiver example included `events: ["push"]`, but Flux documentation states generic receivers do not support event filtering. Removed the `events` field.
- The webhook instructions treated `flux get receivers` as producing a complete public webhook URL. Updated the command to retrieve the generated receiver path and added the requirement to expose the `webhook-receiver` service publicly.
- The troubleshooting pod attempted SSH authentication from a fresh Alpine pod without mounting the private key and used the wrong generic Git SSH user. Changed it to a DNS/TCP connectivity check from inside the cluster.

## Review Notes
The OKE kubeconfig and core Flux/Kubernetes manifests are technically valid. In a production version, the tutorial could add a concrete example for exposing the Flux webhook receiver through an Ingress or LoadBalancer, but the current note is accurate without expanding the scope of the post.
