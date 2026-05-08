# Validation Summary: How to Operationalize Calicoctl Kubernetes API Datastore Configuration

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes API datastore
- Kubernetes CronJob
- GitHub Actions CI/CD
- GitOps-style configuration management

## Sources Consulted
- Calico resource definitions: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico Kubernetes API datastore and calicoctl configuration: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl apply command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico API server and native v3 CRD guidance for kubectl management: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- GitHub Actions environment files: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands

## Issues Found
- The GitHub Actions workflow exported `DATASTORE_TYPE` and `KUBECONFIG` in one step, but exported shell variables do not persist to later steps. Updated the workflow to write those values to `$GITHUB_ENV`.
- The workflow used `calico-config/**/*.yaml`, which is not reliable for recursive matching in the default shell configuration and missed top-level files such as `calico-config/felix.yaml`. Replaced it with `find` over `.yaml` and `.yml` files.
- The post used `kubectl apply --dry-run=server` for Calico `projectcalico.org/v3` manifests without stating the required Calico API exposure. Added a prerequisite noting that the Calico API server or native v3 CRDs must be enabled for that validation path.
- The diff script printed `No differences found` when `diff` found differences because `diff` exits with status 1 in that case. Replaced it with an explicit `if diff ...; then` check.
- The diff script parsed `kind` and `metadata.name` with `grep`, which was fragile for valid calicoctl YAML output containing lists or multiple resources. Changed it to use `calicoctl get -f "$FILE" -o yaml`, which is supported by the calicoctl command reference.

## Review Notes
The backup CronJob is structurally valid, but it assumes the referenced service account, RBAC permissions, and persistent volume claim already exist. That is acceptable for this post because the troubleshooting section calls out RBAC and PVC failures, but a future expansion could include a complete RBAC/PVC example.
