# Validation Summary: How to Use CAPI with AWS Provider via Rancher Turtles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher Turtles
- Cluster API (CAPI)
- Cluster API Provider AWS (CAPA)
- Cluster API Provider RKE2 (CAPRKE2)
- Rancher Manager
- Kubernetes
- `kubectl`
- `clusterctl`
- AWS EC2

## Sources Consulted
- Rancher Turtles Rancher cluster registration guide: https://turtles.docs.rancher.com/turtles/v0.26/en/user/rancher-cluster-registration.html
- Rancher Turtles cluster resource mapping guide: https://turtles.docs.rancher.com/turtles/stable/en/user/cluster-resource-mapping.html
- Rancher Turtles `CAPIProvider` reference: https://turtles.docs.rancher.com/turtles/stable/en/reference/capiprovider.html
- Rancher Cluster API overview: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/cluster-api/overview
- Cluster API `clusterctl generate cluster` command reference: https://cluster-api.sigs.k8s.io/clusterctl/commands/generate-cluster.html
- Cluster API `clusterctl get kubeconfig` command reference: https://release-1-7.cluster-api.sigs.k8s.io/clusterctl/commands/get-kubeconfig
- Cluster API scaling guide: https://main.cluster-api.sigs.k8s.io/tasks/automated-machine-management/scaling
- CAPRKE2 AWS example: https://github.com/rancher/cluster-api-provider-rke2/blob/main/docs/book/src/03_examples/01_aws.md
- CAPRKE2 AWS cluster template: https://raw.githubusercontent.com/rancher/cluster-api-provider-rke2/main/examples/templates/aws/cluster-template.yaml
- CAPRKE2 metadata (`v1beta2` contract for current releases): https://raw.githubusercontent.com/rancher/cluster-api-provider-rke2/main/metadata.yaml
- RKE2 v1.34 release notes: https://docs.rke2.io/release-notes/v1.34.X

## Issues Found
- The prerequisites were too generic for an AWS EC2 walkthrough. Updated them to include `clusterctl`, CAPA/CAPRKE2, AWS IAM credentials for CAPA, and an AMI built for the target RKE2 version.
- The provider verification command used `kubectl get providers -A`, which does not match the Rancher Turtles `CAPIProvider` workflow. Updated it to `kubectl get capiproviders -A`.
- The main YAML example was not a valid AWS CAPI cluster definition. It used a placeholder `InfraCluster` kind, outdated API versions, and omitted the AWS and RKE2 resources required by the upstream CAPRKE2 AWS example. Replaced it with the supported `clusterctl generate cluster --from ...` flow using Rancher’s AWS template.
- The upstream CAPRKE2 AWS template is documented as air-gapped by default. Adjusted the example to rewrite `airGapped: true` to `airGapped: false` so the post matches a standard internet-connected AWS deployment.
- The progress watch command omitted the cluster namespace. Added `-n default`.
- The Rancher import verification targeted `clusters.provisioning.cattle.io` in `fleet-default`, which Rancher Turtles documents as legacy and not created by default for new Turtles-managed clusters. Updated it to `kubectl get clusters.management.cattle.io`.
- The worker scaling example used a MachineDeployment name that does not match the upstream CAPRKE2 AWS template. Updated it from `example-cluster-workers` to `example-cluster-md-0`.
- The kubeconfig command omitted the namespace. Updated it to `clusterctl get kubeconfig example-cluster --namespace default`.

## Review Notes
- Rancher’s CAPRKE2 AWS example requires an AMI built for the chosen RKE2 version; a stock AMI is not sufficient for that template.
- The local review environment did not have `clusterctl` installed, so `clusterctl` command syntax was validated against the official Cluster API documentation and Rancher’s CAPRKE2 example docs rather than local `--help` output.
