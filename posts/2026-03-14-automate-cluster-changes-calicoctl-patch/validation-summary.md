# Validation Summary: How to Automate Cluster Changes with calicoctl patch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes
- GitHub Actions
- Bash
- Python
- Kubernetes CronJob

## Sources Consulted
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico install calicoctl documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico Kubernetes API datastore configuration documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico v3.27.0 and v3.32.0 CRD manifests: https://github.com/projectcalico/calico/tree/v3.32.0/manifests
- Azure/setup-kubectl README: https://github.com/Azure/setup-kubectl
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The prerequisites said to use `calicoctl v3.27 or later`, but Calico documentation recommends installing the `calicoctl` version that matches the Calico version running in the cluster. Updated the prerequisite accordingly.
- The GitHub Actions example pinned `calicoctl` v3.27.0 and used `azure/setup-kubectl@v3`. Updated the example to the current documented Calico v3.32.0 binary and `azure/setup-kubectl@v4`.
- The GitHub Actions workflow installed kubectl but did not configure cluster access. Added a kubeconfig setup step using a `KUBECONFIG` secret so `calicoctl` can reach the Kubernetes API datastore.
- The GitHub Actions workflow interpolated `policy_name` and `patch_json` directly in shell commands. Moved them into environment variables and quoted the variables so valid JSON patches and policy names are handled more reliably.
- The bulk patch script embedded the shell-provided name pattern directly inside Python code. Changed it to read the pattern from an environment variable so regex values containing quotes or other Python-sensitive characters do not break the script.
- The CronJob used the older `calico/ctl:v3.27.0` image and only set `DATASTORE_TYPE`, which is not sufficient when the container lacks a default kubeconfig. Updated it to `calico/ctl:v3.32.0` and added a generated `CalicoAPIConfig` that uses the mounted service account token and CA certificate.
- The CronJob troubleshooting note listed expired service account tokens as a common issue. Updated it to missing service account RBAC or API connectivity, which better matches the revised in-cluster configuration.

## Review Notes
The FelixConfiguration fields used in the examples, including `logSeverityScreen`, `reportingInterval`, and `ipipEnabled`, are present in the Calico v3.27.0 and v3.32.0 CRD schemas. The examples still assume the `calico-admin` service account exists and has RBAC permissions to patch Calico resources.
