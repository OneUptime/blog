# Validation Summary: Install Calico on EKS Step by Step

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Amazon EKS
- AWS VPC CNI
- eksctl
- Kubernetes
- kubectl
- Calico Open Source
- Tigera Operator
- calicoctl
- Calico NetworkPolicy

## Sources Consulted
- Calico EKS installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/managed-public-cloud/eks
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico datastore and calicoctl Kubernetes datastore documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl node reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico eBPF dataplane documentation: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- AWS eksctl cluster creation documentation: https://docs.aws.amazon.com/eks/latest/eksctl/creating-and-managing-clusters.html

## Issues Found
- The post installed only the Tigera Operator manifest and pinned an older Calico v3.27.0 URL. Updated the install commands to current v3.32.0 manifests and added the Calico CRD manifest required by the official EKS flow.
- The EKS VPC CNI policy-only install omitted the AWS VPC CNI pod IP annotation setup. Added the `aws-node` ClusterRole patch and `ANNOTATE_POD_IP=true` setting from the official Calico EKS instructions.
- The Installation resource omitted `kubernetesProvider: EKS`. Added it to match the official EKS configuration.
- The post verified pods in `calico-apiserver` without creating an `APIServer` resource. Added the `APIServer` custom resource so the verification command matches the installation.
- The calicoctl environment variables used `CALICO_DATASTORE_TYPE` and `CALICO_KUBECONFIG`, but Calico documents `DATASTORE_TYPE` and `KUBECONFIG`. Updated the commands.
- The post used `calicoctl node status` as a normal workstation command. Calico documents `calicoctl node` commands as requiring direct execution on the compute host, and this policy-only configuration disables BGP. Replaced it with `kubectl get tigerastatus`.
- The network policy workflow assumed the `production` namespace already existed and did not apply the policy file. Added `kubectl create namespace production` and `kubectl apply -f namespace-isolation.yaml`.
- The DNS allow policy only allowed UDP port 53. Added TCP port 53 because DNS may use TCP as well as UDP.
- The best-practice recommendation to enable eBPF was too broad. Changed it to recommend considering eBPF only after checking prerequisites and following the migration procedure.
- The description claimed the guide covered both Calico full CNI replacement and network policy mode, while the post only documents policy-only mode. Updated the description to match the actual scope.

## Review Notes
The guide is validated for Calico Open Source v3.32.0 and the current documented EKS policy-only installation path. The example connectivity tests still assume sample pods and services named `frontend-pod`, `other-pod`, and `api-service` already exist in the `production` namespace.
