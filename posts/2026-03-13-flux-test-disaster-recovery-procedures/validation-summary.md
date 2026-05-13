# Validation Summary: How to Test Disaster Recovery Procedures with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- kubectl
- kind
- GitHub bootstrap for Flux
- Bash scripting
- YAML
- JSON Lines

## Sources Consulted
- Flux CD GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux CD `flux bootstrap github` CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux CD `flux reconcile kustomization` CLI reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CD `flux get all` CLI reference: https://fluxcd.io/flux/cmd/flux_get_all/
- kind configuration documentation: https://kind.sigs.k8s.io/docs/user/configuration/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The kind kubeconfig example used `export KUBECONFIG=$(kind get kubeconfig ...)`, but `KUBECONFIG` expects a file path or list of file paths, not the kubeconfig document content. Changed the example to use `kind export kubeconfig --name "$CLUSTER_NAME"` and `kubectl config use-context`.
- The Flux bootstrap command used `--token-env=GITHUB_TOKEN`, which is not listed in the current official `flux bootstrap github` command reference. Flux's GitHub bootstrap flow reads `GITHUB_TOKEN` from the environment, so the example now exports `GITHUB_TOKEN` and omits the invalid flag.
- The test branch name was recomputed in multiple commands with `date`, which could produce mismatched branch names if the commands run across midnight. Changed the example to store the branch in `DR_BRANCH` and reuse it.
- The RTO results snippet appended multiple JSON objects to `dr-test-results.json`, which would make the file invalid JSON after more than one run. Changed it to write newline-delimited JSON records to `dr-test-results.jsonl`.
- The cleanup script recomputed the branch name from the current date, which could delete the wrong branch or fail after a date change. Changed it to accept the test branch as an explicit argument.
- The placeholder `export GITHUB_TOKEN=<your-github-token>` would be interpreted by the shell as redirection. Changed it to a quoted placeholder value.

## Review Notes
- The destructive recovery examples assume the affected namespace, CRDs, and workloads are all actually managed by Flux and are safe to delete in the disposable DR test cluster.
- Deleting a CRD also deletes its custom resources, so this drill should only be run against a disposable copy of the environment and with CR definitions stored in Git or otherwise restorable through Flux.
