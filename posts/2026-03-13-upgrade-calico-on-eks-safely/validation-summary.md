# Validation Summary: Upgrade Calico on EKS Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Amazon EKS
- AWS VPC CNI
- Kubernetes NetworkPolicy
- AWS CLI
- kubectl
- calicoctl
- eksctl

## Sources Consulted
- Calico documentation: Upgrade Calico on Kubernetes - https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico documentation: Installing on EKS - https://docs.tigera.io/calico/latest/getting-started/kubernetes/managed-public-cloud/eks
- Calico documentation: System requirements for Kubernetes - https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl node status - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- AWS CLI documentation: eks describe-cluster - https://docs.aws.amazon.com/cli/latest/reference/eks/describe-cluster.html
- AWS CLI documentation: eks list-updates - https://docs.aws.amazon.com/cli/latest/reference/eks/list-updates.html
- Amazon EKS documentation: Update existing cluster to new Kubernetes version - https://docs.aws.amazon.com/eks/latest/userguide/update-cluster.html

## Issues Found
- The prerequisites implied the same rolling upgrade procedure applied to both Tigera Operator and manifest installs. Updated the wording to clarify that the procedure shown is for operator-managed installs and that manifest installs should follow Calico's manifest upgrade path.
- The `calicoctl` prerequisite only mentioned the current installed version. Updated it to also require the target version after the upgrade, matching Calico's guidance not to use older `calicoctl` versions after upgrading.
- The Calico version check selected the first container image from an arbitrary pod in `calico-system`. Replaced it with `calicoctl version`, which reports the client and cluster versions directly.
- The pre-upgrade health check used `calicoctl node status`, which is primarily a node/BGP status command and is not a general policy-only EKS health check. Replaced it with `kubectl get tigerastatus`.
- The EKS version command omitted `--region` while the surrounding AWS CLI examples used an explicit region. Added the region flag for consistency and reliability.
- The backup loop passed `-A` to cluster-scoped Calico resources. Split namespaced `networkpolicies` from cluster-scoped resources so `--all-namespaces` is only used where applicable.
- The S3 backup command used a shell glob with `aws s3 cp`, which does not safely copy multiple matching files as one source. Replaced it with a recursive copy using `--exclude` and `--include`.
- The operator upgrade sequence applied only the Tigera Operator manifest and then reapplied the generic `custom-resources.yaml`. Updated it to apply the current Calico CRD bundle and operator manifest with server-side apply and force conflicts, and to preserve the existing `Installation` custom resource settings.
- The post-upgrade NetworkPolicy validation only created a policy and listed Calico policies with `calicoctl`, which does not prove Kubernetes NetworkPolicy enforcement. Replaced it with a smoke test that creates a labeled pod, applies a default-deny ingress policy, verifies traffic to the pod IP is denied, and cleans up.
- The best-practice note recommended `calicoctl node status` for all EKS Calico upgrades to confirm BGP stability. Updated it to apply only when using Calico networking with BGP, since EKS policy-only mode with AWS VPC CNI disables BGP.

## Review Notes
- The guide now uses Calico v3.32.0 in upgrade examples, which matches the latest Calico documentation available during validation. Future reviews should re-check the Calico latest release and Kubernetes compatibility matrix before publishing.
- `kubectl` and `calicoctl` were not installed in the local review environment, so command syntax was verified against official documentation and published manifests rather than by executing against a cluster.
