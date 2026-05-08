# Validation Summary: How to Use the Calico GlobalNetworkSet Resource in Real Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Calico GlobalNetworkSet
- Calico GlobalNetworkPolicy
- calicoctl
- Kubernetes
- Kubernetes CronJob

## Sources Consulted
- Calico GlobalNetworkSet resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl apply command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl replace command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/replace
- Calico calicoctl user reference and resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico API server / kubectl management guidance: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The tier2 example said the policy allowed only specific workloads to reach tier2 vendors. A standalone allow policy with `selector: app == 'vendor-integration'` only applies to matching workloads; it does not deny other workloads by itself. Updated the text to say the policy allows vendor integration workloads and requires a default-deny egress policy or separate deny rule to make that access exclusive.
- The CronJob example used `/tmp/updated-feed.yaml` without showing where it came from. Added a comment that the job must fetch or generate that full replacement resource before running `calicoctl replace`.
- The allowed-traffic verification command used an unlabeled test pod and a tier1 example address, so it did not exercise the shown `allow-tier2-egress` policy. Updated the command to label the pod `app=vendor-integration` and test a tier2 example address, with a note to replace it with a reachable IP from the reader's environment.
- The verification section used documentation/example CIDRs as if they were guaranteed live endpoints. Added notes to replace them with environment-specific addresses that would otherwise respond.
- The `calicoctl get globalnetworkset -o wide` description said it listed labels. The Calico command reference documents `wide` as a ps-style output with resource-specific columns, while the post already uses YAML output for label inspection. Updated the wording to avoid promising label output from `wide`.

## Review Notes
The GlobalNetworkSet manifests, GlobalNetworkPolicy `destination.selector` usage, Calico selector syntax, `kubectl run` flags, and `calicoctl apply`, `get`, and `replace` commands are consistent with current documentation. The example CIDRs remain placeholders and should be replaced before production testing. Local CLI verification was limited because `calicoctl` and `kubectl` are not installed in this workspace.
