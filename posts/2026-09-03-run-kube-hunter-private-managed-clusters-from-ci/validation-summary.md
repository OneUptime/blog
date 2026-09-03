# Validation Summary: How to Run kube-hunter Against Private EKS, AKS, or GKE Endpoints from CI

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- kube-hunter
- Kubernetes security scanning
- Amazon Elastic Kubernetes Service (EKS)
- Azure Kubernetes Service (AKS)
- Google Kubernetes Engine (GKE)
- Docker
- AWS CLI
- Google Cloud CLI
- CI/CD runners and private cloud networking

## Sources Consulted

- [kube-hunter documentation](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
- [kube-hunter argument parser](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/conf/parser.py)
- [kube-hunter Dockerfile](https://github.com/aquasecurity/kube-hunter/blob/main/Dockerfile)
- [Amazon EKS cluster endpoint access](https://docs.aws.amazon.com/eks/latest/userguide/config-cluster-endpoint.html)
- [Amazon EKS PrivateLink considerations](https://docs.aws.amazon.com/eks/latest/userguide/vpc-interface-endpoints.html)
- [AWS CLI `describe-cluster` reference](https://docs.aws.amazon.com/cli/latest/reference/eks/describe-cluster.html)
- [Create a private AKS cluster](https://learn.microsoft.com/en-us/azure/aks/private-clusters)
- [Connect to a private AKS cluster](https://learn.microsoft.com/en-us/azure/aks/private-cluster-connect)
- [GKE network isolation](https://cloud.google.com/kubernetes-engine/docs/how-to/latest/network-isolation)
- [Google Cloud CLI `container clusters describe` reference](https://cloud.google.com/sdk/gcloud/reference/container/clusters/describe)
- [Docker run reference](https://docs.docker.com/reference/cli/docker/container/run/)

## Issues Found

- The introduction said kube-hunter remote mode can target a CIDR. Corrected it to distinguish `--remote`, which accepts one or more host names or IP addresses, from network scanning with `--cidr`.

## Review Notes

- The digest placeholder in the Docker example is intentionally non-runnable until replaced with an approved image digest.
- The GKE inventory fields can differ with cluster configuration and CLI release, as the post already cautions.
