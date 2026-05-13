# Validation Summary: Document Calico Host Endpoint Security for Operators

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico host endpoints
- Calico GlobalNetworkPolicy
- calicoctl
- Kubernetes node security
- GitHub Actions
- Mermaid diagrams

## Sources Consulted
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl delete command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico calicoctl overview and resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico host endpoints overview: https://docs.tigera.io/calico/latest/reference/host-endpoints/overview
- Calico calicoctl installation guide: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- actions/checkout repository: https://github.com/actions/checkout

## Issues Found
- The rollback runbook used `calicoctl get globalnetworkpolicies --sort-by=metadata.creationTimestamp`, but the official `calicoctl get` reference does not document a `--sort-by` flag. Updated the step to identify the recently applied policy from Git history or deployment logs, then inspect current policies with `calicoctl get globalnetworkpolicies -o wide`.
- The GitHub Actions example assumed `calicoctl` was already available on `ubuntu-latest` and did not create the destination directory before exporting files. Added an install step based on the official Calico binary installation instructions and added `mkdir -p docs/policies`.
- The GitHub Actions example could fail when committing without configured Git identity or when no policy files changed. Added the standard GitHub Actions bot identity and guarded the commit with `git diff --cached --quiet || git commit ...`.
- The workflow used `actions/checkout@v3`. Updated it to `actions/checkout@v5`, the current major version shown by the official action repository, and added `contents: write` permission so the workflow can push changes with `GITHUB_TOKEN`.

## Review Notes
- The Calico export and delete commands use valid resource aliases according to the official `calicoctl` resource alias documentation.
- The CI example now installs `calicoctl` v3.32.0. In production, operators should keep the `calicoctl` version aligned with the Calico version running in the cluster, as recommended by Calico documentation.
- The workflow still assumes cluster credentials and datastore access are provided by the environment or additional organization-specific setup.
