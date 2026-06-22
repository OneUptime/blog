# Validation Summary: How to Scan Kubernetes Clusters for CIS Benchmark Compliance

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes
- CIS Kubernetes Benchmark
- kube-bench
- Kubernetes Jobs, DaemonSets, and CronJobs
- kube-apiserver, kube-controller-manager, kubelet, and etcd configuration
- Pod Security Standards / Pod Security Admission
- NetworkPolicy
- EncryptionConfiguration
- jq

## Sources Consulted
- Aqua Security kube-bench README: https://github.com/aquasecurity/kube-bench
- Aqua Security kube-bench running documentation: https://github.com/aquasecurity/kube-bench/blob/main/docs/running.md
- Aqua Security kube-bench flags and commands: https://github.com/aquasecurity/kube-bench/blob/main/docs/flags-and-commands.md
- Aqua Security kube-bench architecture / targets: https://github.com/aquasecurity/kube-bench/blob/main/docs/architecture.md
- Aqua Security kube-bench releases: https://github.com/aquasecurity/kube-bench/releases
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes kube-controller-manager reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes kubelet configuration API reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes admission controllers reference: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes feature gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Kubernetes PodSecurityPolicy removal notice: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes Pod Security Standards namespace labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes encryption at rest documentation: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/

## Issues Found
- The kube-bench image tag was outdated (`v0.7.1`). Updated examples to `aquasec/kube-bench:v0.15.6`, the current release found during review.
- The control-plane Job selected a control-plane node but only ran `node,policies` targets. Updated it to run `master,controlplane,etcd,policies` so the scheduled node and benchmark scope match.
- The DaemonSet and CronJob examples did not mount `/etc/kubernetes`, `/etc/systemd`, or both in places where kube-bench node checks may need them. Added the missing hostPath volumes and mounts.
- Manual control-plane example only ran the `master` target. Updated it to include `master,controlplane,etcd`.
- The section-filtering example used `--check 1.1,1.2`; kube-bench documents `--group` for running grouped sections. Updated the command to use `--group`.
- The API server remediation used the removed `--kubelet-https=true` flag. Replaced it with `--kubelet-certificate-authority=/etc/kubernetes/pki/ca.crt`, which is current and aligns with kube-bench output for securing API server to kubelet communication.
- The API server remediation enabled the removed `PodSecurityPolicy` admission plugin. Replaced it with the current `PodSecurity` admission plugin and updated the diagram label to Pod Security Standards.
- The JSON and benchmark examples used global kube-bench flags after `run`. Updated those examples to match the official command style.

## Review Notes
- Some CIS check numbers vary by CIS benchmark version. The post now avoids removed Kubernetes flags and APIs, but readers should still run the benchmark version that matches their Kubernetes distribution and version.
- kube-bench cannot inspect managed control-plane nodes on managed Kubernetes services such as EKS, AKS, GKE, and ACK; those environments should use provider-specific benchmark profiles and worker-node checks.
- No local YAML linter was available in the environment (`ruby`, `yq`, and `yamllint` were not installed), so validation was done by source review against Kubernetes and kube-bench documentation.
