# Validation Summary: Preventing FailedCreatePodSandBox Errors in Calico

## Status
validated

## Post Type
Troubleshooting and operational best-practices guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico CNI
- Calico IPAM
- `calicoctl`
- `kubectl`
- YAML Calico resources

## Sources Consulted
- Calico `calicoctl` user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico `calicoctl apply` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico `calicoctl validate` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico `calicoctl ipam check` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Kubernetes CNI troubleshooting guidance: https://kubernetes.io/docs/tasks/administer-cluster/migrating-from-dockershim/troubleshooting-cni-plugin-related-errors/
- Kubernetes Pods concept reference: https://kubernetes.io/docs/concepts/workloads/pods/

## Issues Found
- Replaced `calicoctl apply -f ... --dry-run` with `calicoctl validate -f ...`. Current Calico documentation does not list `--dry-run` for `calicoctl apply`; `calicoctl validate` is the documented offline validation command for Calico resource manifests.
- Changed calico-node health checks from `-n calico-system` to `-A -l k8s-app=calico-node`. Calico documentation notes that `calico-system` is used for operator-based examples, while manifest-based installations use `kube-system`, so querying all namespaces by label is more accurate for a general Calico guide.
- Changed Calico warning-event checks to search all namespaces and filter for Calico-related namespaces/components instead of assuming `calico-system`.
- Replaced the recovery validation command that used `wget` against `http://kubernetes.default.svc/healthz` with a BusyBox `nslookup` check. The default Kubernetes service exposes HTTPS on port 443, so the original HTTP command was not a reliable connectivity test.
- Updated the related checklist text from `calico-system` Warning events to Calico-related Warning events.

## Review Notes
The IPPool example uses valid `projectcalico.org/v3` fields for current Calico: `cidr`, `blockSize`, `ipipMode`, `natOutgoing`, and `disabled`. The 80% and 30% capacity thresholds are operational recommendations rather than Calico API requirements.
