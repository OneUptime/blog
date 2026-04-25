# Validation Summary: How to Plan Cluster Topology in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- RKE2
- Kubernetes
- Rancher Projects and namespaces
- Prometheus and Prometheus Operator
- Istio multicluster
- Submariner
- PCI DSS
- HIPAA
- FedRAMP

## Sources Consulted
- Rancher Installation Requirements: https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/installation-requirements
- Rancher Projects workflow: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher Projects and Kubernetes Namespaces: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/manage-clusters/projects-and-namespaces
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher Launching Kubernetes on New Nodes in an Infrastructure Provider: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider
- Rancher Recommended Cluster Architecture: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/checklist-for-production-ready-clusters/recommended-cluster-architecture
- Prometheus HTTP API remote write receiver docs: https://prometheus.io/docs/prometheus/latest/querying/api/#remote-write-receiver
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Istio multicluster install docs: https://istio.io/latest/docs/setup/install/multicluster/
- Istio multi-cluster traffic management docs: https://istio.io/latest/docs/ops/configuration/traffic-management/multicluster/
- Submariner architecture docs: https://submariner.io/getting-started/architecture/
- HHS HIPAA Security Rule: https://www.hhs.gov/ocr/privacy/hipaa/administrative/securityrule/index.html
- HHS HIPAA cloud computing guidance: https://www.hhs.gov/hipaa/for-professionals/special-topics/health-information-technology/cloud-computing/index.html
- PCI SSC scoping and segmentation FAQ: https://www.pcisecuritystandards.org/faq/articles/Frequently_Asked_Question/How-do-I-reduce-the-scope-of-a-PCI-DSS-assessment/
- PCI SSC scoping and segmentation guidance overview: https://blog.pcisecuritystandards.org/new-information-supplement-pci-dss-scoping-and-segmentation-guidance-for-modern-network-architectures
- FedRAMP Minimum Assessment Scope: https://www.fedramp.gov/docs/rev5/balance/minimum-assessment-scope/
- FedRAMP subnet and boundary protection guidance: https://help.fedramp.gov/hc/en-us/articles/28906580266395-Subnets-What-They-Are-and-Why-They-Matter

## Issues Found
- The compliance guidance overstated several framework requirements. I changed the PCI DSS, HIPAA, and FedRAMP bullets to reflect official scoping, safeguard, and boundary guidance rather than implying that dedicated infrastructure or air-gapped clusters are universally required.
- The sizing section was ambiguous about whether CPU and memory values were per-node or total cluster resources. I clarified that the listed values are per node and aligned the Rancher management-cluster note with Rancher’s documented medium upstream-cluster baseline for up to 300 downstream clusters.
- The RKE2 provisioning example used the wrong schema for `provisioning.cattle.io/v1` clusters. I replaced `nodePools` with `machinePools` and changed the invalid `roles: [...]` array to the current `controlPlaneRole`, `etcdRole`, and `workerRole` fields.
- The Rancher Project example was not valid as written. `Project.spec` does not take a `namespaces` list; projects are created in the management cluster namespace for the target cluster, and namespaces are associated to a project using the `field.cattle.io/projectId` annotation. I rewrote the snippet to match Rancher’s documented workflow.
- The cross-cluster monitoring example implied placing central observability on the Rancher management cluster and used an ambiguous YAML fragment. I changed it to a shared-services-cluster pattern and a valid Prometheus Operator `Prometheus` resource using `spec.remoteWrite`.

## Review Notes
- The downstream cluster sizing values are still planning heuristics, not Rancher product minimums. The post now makes that explicit, but real deployments should still validate sizing with workload data and load testing.
- Rancher’s official documentation is versioned across multiple doc branches. The APIs and workflows used in the corrected snippets are consistent with the currently published Rancher documentation and current Prometheus Operator documentation.
