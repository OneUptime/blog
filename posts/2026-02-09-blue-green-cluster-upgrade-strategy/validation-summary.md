# Validation Summary: How to Implement Blue-Green Cluster Upgrade Strategy for Zero Downtime

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes cluster upgrades
- Amazon EKS and AWS CLI
- Google Kubernetes Engine and gcloud CLI
- Azure Kubernetes Service and Azure CLI
- Terraform and AWS Route 53
- Argo CD ApplicationSet
- Kubernetes PersistentVolumes and kubectl
- Amazon EFS CSI driver
- PostgreSQL physical replication

## Sources Consulted
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- AWS CLI `eks create-cluster` reference: https://docs.aws.amazon.com/cli/latest/reference/eks/create-cluster.html
- Amazon EKS cluster deletion guide: https://docs.aws.amazon.com/eks/latest/userguide/delete-cluster.html
- Amazon Route 53 weighted alias record documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-weighted-alias.html
- Terraform AWS provider `aws_route53_record` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- GKE release notes and current versions: https://docs.cloud.google.com/kubernetes-engine/docs/release-notes
- gcloud `container clusters create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/create
- AKS supported Kubernetes versions: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Azure CLI `az aks` reference: https://learn.microsoft.com/en-us/cli/azure/aks
- Argo CD ApplicationSet specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Amazon EFS CSI driver documentation: https://docs.aws.amazon.com/eks/latest/userguide/efs-csi.html
- PostgreSQL replication configuration documentation: https://www.postgresql.org/docs/current/runtime-config-replication.html

## Issues Found
- The EKS create-cluster command used `--version 1.29`, which is the AWS CLI global version flag rather than the EKS Kubernetes version option. Changed it to `--kubernetes-version 1.34` and added EKS wait commands before dependent node group and deployment steps.
- The examples used Kubernetes 1.28 and 1.29, which are no longer broadly supported across the managed Kubernetes providers covered. Updated the examples to use currently supported 1.33/1.34 upgrade examples.
- The Terraform Route 53 example aliased application DNS to EKS control-plane endpoints and referenced a non-existent `cluster_zone_id` module output. Updated the example to target application load balancers with valid alias `dns_name` and `zone_id` attributes.
- The rollback section described DNS rollback as "instant." Route 53 changes and client DNS caches make DNS rollback fast but not literally instant, so the wording now says "fast" rollback.
- The rollback script referenced `ZONE_ID` without defining it and hard-coded the record name in the JSON payload. Added `ZONE_ID` and `RECORD_NAME` variables and used the variable in both weighted records.
- The PostgreSQL replication example mixed arbitrary `blue` and `green` namespaces with the earlier `production` namespace pattern and used `kubectl exec -it` with stdin redirection. Updated it to switch contexts explicitly, use the `production` namespace, and use `kubectl exec -i`.
- The EKS cleanup script deleted the cluster without first deleting the managed node group. Updated it to delete and wait for the managed node group before deleting the EKS control plane.
- The cleanup script described `kubectl get all --all-namespaces` as a full backup, but that command only exports common resource types. Reworded the comment to say it exports common resources for reference.

## Review Notes
The high-level blue-green upgrade strategy is technically sound, but real production implementations still need provider-specific checks for supported Kubernetes versions in the target region, add-on compatibility, admission policy compatibility, DNS TTL behavior, database write cutover, and cleanup of external load balancers, volumes, and cloud resources created by Kubernetes controllers.
