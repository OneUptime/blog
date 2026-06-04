# Validation Summary: How to Compare Managed Kubernetes Pricing Across AWS, GCP, Azure,

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon EKS
- Google Kubernetes Engine (GKE)
- Azure Kubernetes Service (AKS)
- DigitalOcean Kubernetes (DOKS)
- Kubernetes node pools, load balancers, persistent storage, networking, logging, and monitoring
- eksctl managed node group configuration

## Sources Consulted
- AWS EKS pricing: https://aws.amazon.com/eks/pricing/
- Google Kubernetes Engine pricing: https://cloud.google.com/kubernetes-engine/pricing
- Azure Kubernetes Service pricing: https://azure.microsoft.com/en-us/pricing/details/kubernetes-service/
- AKS pricing tiers documentation: https://learn.microsoft.com/en-us/azure/aks/free-standard-pricing-tiers
- DigitalOcean Kubernetes pricing: https://docs.digitalocean.com/products/kubernetes/details/pricing/
- DigitalOcean Droplet pricing: https://www.digitalocean.com/pricing/droplets
- AWS Elastic Load Balancing pricing: https://aws.amazon.com/elasticloadbalancing/pricing/
- Google Cloud Load Balancing pricing: https://cloud.google.com/load-balancing/pricing
- Azure Load Balancer pricing: https://azure.microsoft.com/en-us/pricing/details/load-balancer
- Azure Load Balancer SKU retirement documentation: https://learn.microsoft.com/en-us/azure/load-balancer/skus
- AWS EBS pricing: https://aws.amazon.com/ebs/pricing/
- Google Cloud disk and image pricing: https://cloud.google.com/compute/disks-image-pricing
- Azure Managed Disks pricing: https://azure.microsoft.com/en-us/pricing/details/managed-disks/
- DigitalOcean Volumes pricing: https://www.digitalocean.com/pricing/volumes
- AWS Fargate pricing: https://aws.amazon.com/fargate/pricing/
- Google Cloud Spot VM documentation: https://cloud.google.com/compute/docs/instances/spot
- Google Cloud preemptible VM documentation: https://cloud.google.com/compute/docs/instances/preemptible
- AWS NAT Gateway pricing documentation: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html
- AWS CloudWatch pricing: https://aws.amazon.com/cloudwatch/pricing/
- Google Cloud Observability pricing: https://cloud.google.com/products/observability
- Azure Monitor pricing: https://azure.microsoft.com/en-us/pricing/details/monitor/
- eksctl Spot instances documentation: https://docs.aws.amazon.com/eks/latest/eksctl/spot-instances.html

## Issues Found
- Corrected GKE control plane pricing. The post said Standard clusters were free and only Autopilot was charged; current GKE pricing applies a $0.10/hour cluster management fee to all GKE clusters, with a monthly free-tier credit for one Autopilot or zonal Standard cluster.
- Corrected AKS tier descriptions. The post described the Standard tier as free; AKS Free tier is free with no SLA, Standard tier includes uptime SLA, and Premium tier adds long-term support.
- Added the EKS extended support control plane fee and DOKS high-availability control plane charge.
- Corrected DigitalOcean compute comparison from an 8 GB shared CPU Droplet to a 4 vCPU / 16 GiB General Purpose Droplet and recalculated affected examples.
- Updated GCP discounted VM language from legacy preemptible-only wording to Spot VMs, which are the current recommended model and do not have a fixed 24-hour maximum runtime.
- Corrected Azure Load Balancer Basic SKU status; it was retired on September 30, 2025.
- Corrected DigitalOcean load balancer terminology from NodeBalancer to Load Balancer.
- Updated DigitalOcean load balancer and snapshot prices to current published rates.
- Corrected GKE Autopilot and Config Sync feature-pricing descriptions.
- Corrected AKS Uptime SLA and Defender for Containers wording to reflect current AKS and Microsoft Defender for Cloud pricing models.
- Fixed the EKS spot node group YAML snippet to use `managedNodeGroups`, which matches eksctl managed node group configuration.

## Review Notes
Cloud prices vary by region, currency, discount program, support plan, negotiated contract, and usage shape. The post remains a high-level comparison and should be treated as illustrative rather than a fixed quote.
