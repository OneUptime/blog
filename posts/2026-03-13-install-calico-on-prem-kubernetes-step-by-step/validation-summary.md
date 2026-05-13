# Validation Summary: How to Install Calico on On-Prem Kubernetes Step by Step

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes
- kubeadm
- kubectl
- CNI networking
- Calico IP pools
- calicoctl

## Sources Consulted
- Calico Open Source on-premises Kubernetes installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico Open Source Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico Open Source Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Open Source calicoctl installation documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Kubernetes kubeadm init reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes kubeadm cluster creation documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/

## Issues Found
- The post used Calico v3.27.0 URLs, which are outdated for a March 2026 installation guide. Updated the operator manifest and calicoctl download commands to Calico v3.32.0, the current version in the official Calico documentation consulted during review.
- The Tigera Operator installation command omitted the current `v1_crd_projectcalico_org.yaml` manifest that official Calico on-premises operator installation instructions apply before `tigera-operator.yaml`. Added that command.
- The prerequisite listed Linux kernel 4.19 or later, but current Calico Kubernetes requirements specify Linux kernel 5.10 or later with required dependencies. Updated the prerequisite.
- The readiness command waited for `condition=Ready` on `tigerastatus/calico`. The TigeraStatus status conditions used for component health are `Available`, `Progressing`, and `Degraded`; official install instructions also track the `AVAILABLE` column. Updated the command to wait for `condition=Available`.

## Review Notes
- The `Installation` custom resource fields in the post, including `apiVersion: operator.tigera.io/v1`, `blockSize`, `cidr`, `encapsulation: IPIPCrossSubnet`, `natOutgoing: Enabled`, and `nodeSelector: all()`, match supported Calico operator API fields and values.
- The kubeadm `--pod-network-cidr` flag and kubeconfig setup commands match Kubernetes documentation.
