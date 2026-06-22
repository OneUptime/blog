# Validation Summary: How to Rotate Kubernetes Cluster Certificates Before Expiry

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Kubernetes TLS certificates and PKI
- kubeadm certificate management
- etcd certificates
- kubelet client and serving certificate rotation
- Prometheus monitoring with cert-exporter
- Amazon EKS
- Google Kubernetes Engine (GKE)
- Azure Kubernetes Service (AKS)
- K3s
- Ansible

## Sources Consulted
- Kubernetes kubeadm certificate management: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/
- Kubernetes kubelet TLS bootstrapping: https://kubernetes.io/docs/reference/access-authn-authz/kubelet-tls-bootstrapping/
- Kubernetes kubelet v1beta1 configuration reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- cert-exporter documentation: https://github.com/joe-elliott/cert-exporter
- Amazon EKS managed node group update documentation: https://docs.aws.amazon.com/eks/latest/userguide/update-managed-node-group.html
- Google Cloud GKE credential rotation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/credential-rotation
- Microsoft AKS certificate rotation documentation: https://learn.microsoft.com/en-us/azure/aks/certificate-rotation
- Azure CLI `az aks rotate-certs` reference: https://learn.microsoft.com/en-us/cli/azure/aks
- K3s certificate command documentation: https://docs.k3s.io/cli/certificate
- K3s advanced certificate documentation: https://docs.k3s.io/advanced

## Issues Found
- The kubeadm automatic renewal section said certificates are renewed only when within 180 days of expiration. Kubernetes documentation states kubeadm renews all certificates during control plane upgrade unless certificate renewal is disabled. Updated the comment accordingly.
- The standalone etcd rotation example used `kubeadm init phase certs ...`, which is for generating certificates and does not overwrite existing certificate/key pairs. Updated the example to use `kubeadm certs renew` for the etcd certificates and clarified that this applies to an external etcd cluster managed by kubeadm.
- The kubelet CSR auto-approval example could be read as applying to all kubelet CSRs, including serving certificates. Kubernetes documentation says serving certificate CSRs are not auto-approved by the default signer. Updated the comment and binding name to specify kubelet client certificate renewal CSRs.
- The EKS example described `aws eks describe-nodegroup` as checking node certificate status. That command reports node group details, not certificate status. Updated the comment to check node group status before node replacement.
- The AKS example queried `aadProfile` as certificate status. That field is not certificate status. Updated the example to check cluster state and Kubernetes version before running manual rotation.
- The GKE summary listed `gcloud rotate-certs`, which is not the documented GKE command. Updated it to `gcloud container clusters update --start-credential-rotation`.
- The Ansible playbook had an invalid condition using an undefined `days` variable. Replaced it with a regex condition against kubeadm residual times under 30 days.

## Review Notes
The post is technically relevant and contains actionable operational examples. Some snippets are intentionally illustrative and still require environment-specific adaptation, especially multi-control-plane kubeadm clusters, external etcd topologies, RBAC for monitoring pods, and managed Kubernetes provider maintenance windows.
