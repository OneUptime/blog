# Validation Summary: How to Optimize Spot Instance Usage

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS EC2 Spot Instances and Auto Scaling mixed instances policies
- Google Cloud Spot VMs and Preemptible VMs
- Azure Spot Virtual Machines
- Kubernetes PodDisruptionBudgets and workload scheduling
- AWS Node Termination Handler
- Karpenter for EKS
- Terraform AWS and Google providers
- GitHub Actions self-hosted runners
- GitLab Runner autoscaling
- Jenkins EC2 agents
- Prometheus Operator alert rules
- Python, Bash, YAML, TOML, HCL, and Groovy snippets

## Sources Consulted
- AWS EC2 Spot best practices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html
- AWS EC2 Spot interruption notices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- AWS EC2 Instance Metadata Service v2: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- AWS Auto Scaling InstancesDistribution API: https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_InstancesDistribution.html
- AWS Node Termination Handler Helm values: https://github.com/aws/aws-node-termination-handler
- Google Cloud Spot VMs documentation: https://docs.cloud.google.com/compute/docs/instances/spot
- Google Cloud Billing Catalog API: https://docs.cloud.google.com/billing/v1/how-tos/catalog-api
- Azure Spot Virtual Machines documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms
- Azure Retail Prices API: https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices
- Karpenter v1 migration guide: https://karpenter.sh/v1.0/upgrading/v1-migration/
- Karpenter NodePools documentation: https://karpenter.sh/docs/concepts/nodepools/
- Karpenter NodeClasses documentation: https://karpenter.sh/docs/concepts/nodeclasses/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/version-and-name/
- GitLab Runner Docker Machine executor documentation: https://docs.gitlab.com/runner/executors/docker_machine/
- GitLab Runner Docker Autoscaler executor documentation: https://docs.gitlab.com/runner/executors/docker_autoscaler/
- GitLab Runner Fleeting plugin documentation: https://docs.gitlab.com/runner/fleet_scaling/fleeting/
- Jenkins EC2 plugin documentation: https://plugins.jenkins.io/ec2/
- Jenkins SpotConfiguration Javadoc: https://javadoc.jenkins.io/plugin/ec2/hudson/plugins/ec2/SpotConfiguration.html
- AWS Spot Blocks availability notice: https://aws.amazon.com/about-aws/whats-new/2015/10/introducing-amazon-ec2-spot-instances-for-specific-duration-workloads/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/

## Issues Found
- The provider pricing overview overgeneralized Spot pricing as per-AZ supply-and-demand pricing. Updated the wording to distinguish AWS Spot price history from GCP and Azure published pricing data.
- The GCP command used `gcloud compute machine-types describe`, which returns machine metadata rather than Spot pricing. Replaced it with a Cloud Billing Catalog API query for Spot/Preemptible Compute Engine SKUs.
- The Azure command used `az vm list-skus`, which returns SKU availability metadata rather than Spot prices. Replaced it with an Azure Retail Prices API query filtered for Spot VM pricing.
- The AWS spot price CLI example did not pass the region despite saying `us-east-1`. Added `--region us-east-1`.
- The AWS interruption polling Python example used IMDSv1-style metadata requests. Added IMDSv2 token retrieval and token headers so it works on instances configured with `http_tokens = "required"`.
- The Karpenter example used removed `Provisioner` and `AWSNodeTemplate` APIs. Replaced it with current `NodePool` and `EC2NodeClass` resources and updated the consolidation, expiration, selector, AMI, and role fields.
- The Karpenter workload example expected spot taints, but the NodePool did not define them. Added a matching `NoSchedule` taint to the NodePool.
- The Docker Compose example used the obsolete top-level `version` field. Removed it.
- The GitLab Runner example used the deprecated `docker+machine` executor. Replaced it with the current `docker-autoscaler` executor and AWS Fleeting plugin configuration.
- The Jenkins example set a Spot Block reservation duration. Updated it to `0` because AWS Spot Blocks are no longer available.
- The Prometheus alert examples included invalid or misleading PromQL: `rate()` over a termination-reason gauge and a vector comparison between node and deployment metrics. Updated them to syntactically valid PromQL using `increase()`, `avg_over_time()`, pending pods, and unavailable deployments.

## Review Notes
Local validation parsed the Python snippets with `ast` and the GitLab TOML snippet with Python `tomllib`. Full cloud-provider execution was not run because it would require configured AWS, GCP, Azure, Kubernetes, Jenkins, and GitLab environments.
