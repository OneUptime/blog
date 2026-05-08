# Validation Summary: How to Use calicoctl version with Practical Examples

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- etcd datastore configuration
- GitHub Actions
- Bash scripting
- Prometheus Pushgateway metrics

## Sources Consulted
- Calico documentation: calicoctl version reference: https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Calico documentation: calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico documentation: Configure calicoctl: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico documentation: Configure calicoctl to connect to an etcd datastore: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico documentation: Install calicoctl: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Kubernetes documentation: kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Project Calico GitHub release binary help output for calicoctl v3.27.0 and v3.32.0: https://github.com/projectcalico/calico/releases

## Issues Found
- The post used `calicoctl version --client` while requiring calicoctl v3.27 or later and installing v3.27.0 in the CI example. The v3.27.0 binary does not support `--client`; it was added by v3.32.0. Removed the `--client` example and changed the CI script to parse the client version from `calicoctl version` output.
- The basic version example implied a dedicated client-only command was available for the documented v3.27 baseline. Updated the text to state that `calicoctl version` prints client information even when no cluster version can be detected.
- Several scripts parsed missing cluster-version output as an empty value and could continue as though the check succeeded. Added explicit cluster-version detection checks in the compatibility and CI examples.
- The Prometheus metrics script treated `unknown` client and cluster versions as a match. Updated the match logic so unknown values produce `calico_version_match` of `0`.
- The multi-cluster inventory script treated `N/A` client and cluster versions as a match. Updated the match logic so missing values are reported as `NO`.
- The troubleshooting snippet used `kubectl version --short`, which is not present in the current official `kubectl version` reference. Changed it to `kubectl version`.

## Review Notes
The remaining `calicoctl version`, datastore environment variable, GitHub release download, and `kubectl version` command forms align with the official documentation checked. Bash snippets edited during review were syntax-checked locally with `bash -n`; `shellcheck` and Ruby/YAML tooling were not installed in the workspace.
