# Validation Summary: How to Migrate Amazon EKS Clusters to Google Kubernetes Engine

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Amazon EKS
- Google Kubernetes Engine
- Kubernetes manifests and kubectl
- Terraform Google provider
- Google Cloud DNS
- Google Artifact Registry
- Amazon ECR
- Workload Identity Federation for GKE
- eksctl
- Python YAML processing

## Sources Consulted
- Google Cloud GKE release schedule: https://cloud.google.com/kubernetes-engine/docs/release-schedule
- Terraform Google provider `google_container_cluster`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Terraform Google provider `google_dns_record_set`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_record_set
- Google Cloud DNS routing policies: https://cloud.google.com/dns/docs/routing-policies-overview
- Google Cloud GKE Persistent Disk CSI driver: https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver
- Google Cloud GKE internal LoadBalancer Services: https://cloud.google.com/kubernetes-engine/docs/how-to/internal-load-balancing
- Google Cloud Workload Identity Federation for GKE: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Artifact Registry Docker authentication: https://cloud.google.com/artifact-registry/docs/docker/authentication
- AWS CLI `ecr get-login-password`: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Amazon EKS cluster deletion with eksctl: https://docs.aws.amazon.com/eks/latest/userguide/getting-started-eksctl.html
- Kubernetes `kubectl apply`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply

## Issues Found
- The Terraform GKE example used Kubernetes `1.28`, which GKE 1.29 and earlier no longer support as of the current release schedule. Updated the example to use `1.35`.
- The export script claimed to export all needed resources but did not export namespaces and exported cluster-scoped RBAC resources inside each namespace loop. Updated it to export namespaces once, namespaced resources per namespace, and cluster-scoped resources once.
- The manifest translator called an undefined `translate_annotations()` function, so the Python script would fail at runtime. Added the function.
- The translator did not process `kubectl get ... -o yaml` `List` documents, which is the normal output shape for the exported resources. Added recursive translation for `List.items`.
- The exported manifests retained source-cluster-managed metadata and `status` fields that should not be applied to the target cluster. Added cleanup for fields such as `uid`, `resourceVersion`, `managedFields`, and `status`.
- The ingress translator left AWS ALB annotations in manifests and did not map internal ALB ingress to GKE's internal ingress class. Updated it to remove ALB annotations and use `gce` or `gce-internal` as appropriate.
- The Service translator checked for internal load balancer intent after deleting AWS annotations, so it could miss internal NLB Services. Updated it to detect AWS internal load balancer annotations before removal and use GKE's current `networking.gke.io/load-balancer-type: "Internal"` annotation.
- The storage class mapping used `standard` for EBS `gp2` and `gp3`. Updated it to `standard-rwo`, which is the current CSI-backed GKE standard persistent disk StorageClass name.
- The deployment commands referenced paths such as `gke-manifests/configmaps/` and `gke-manifests/deployments/`, but the export and translation scripts produce namespace subdirectories. Updated the commands to apply the translated directory recursively.
- The weighted DNS example created an `A` record but used an AWS load balancer DNS name as record data. Updated the example to use weighted `CNAME` records pointing to DNS names for the GKE and EKS endpoints.

## Review Notes
The overall parallel-run and gradual traffic shifting strategy is technically sound. The snippets remain examples and still require environment-specific mapping for IAM roles, service accounts, image repositories, certificates, static IPs, and DNS endpoint names.
