# Validation Summary: How to Set Up SBOM Generation in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher-managed Kubernetes clusters
- kubectl and Kubernetes JSONPath output
- Syft SBOM generation
- SPDX JSON and CycloneDX JSON SBOM formats
- Trivy SBOM vulnerability and license scanning
- GitHub Actions with `anchore/sbom-action`
- jq and shell scripting

## Sources Consulted
- Rancher documentation: Access a Cluster with Kubectl and kubeconfig - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/access-clusters/use-kubectl-and-kubeconfig
- Kubernetes documentation: List All Container Images Running in a Cluster - https://kubernetes.io/docs/tasks/access-application-cluster/list-all-running-container-images/
- Kubernetes documentation: `kubectl get` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Anchore documentation: Installing Syft - https://oss.anchore.com/docs/installation/syft/
- Anchore documentation: Syft SBOM output formats - https://oss.anchore.com/docs/guides/sbom/formats/
- Anchore documentation: Syft supported scan targets - https://oss.anchore.com/docs/guides/sbom/scan-targets/
- Anchore documentation: Private registry authentication - https://oss.anchore.com/docs/guides/private-registries/
- Anchore `sbom-action` documentation - https://github.com/anchore/sbom-action
- Trivy documentation: SBOM scanning and SPDX/CycloneDX support - https://trivy.dev/docs/latest/guide/target/sbom/

## Issues Found
1. **The original post did not configure SBOM generation.** Its title, tags, and description were about SBOM generation in Rancher, but all implementation steps covered generic Kubernetes pod security hardening. Replaced the body with an SBOM-specific workflow that discovers images from a Rancher-managed cluster and generates SBOMs with Syft.
2. **Invalid pod security audit command.** The original jq query checked `.securityContext.runAsRoot`, which is not a Kubernetes `SecurityContext` field. This content was removed because it was unrelated to SBOM generation.
3. **Placeholder "security feature" ConfigMap was not tied to any Rancher, Kubernetes, or SBOM controller.** Removed the fabricated configuration and replaced it with the documented Syft installation and SBOM output workflow.
4. **Example Helm repository and chart were non-existent placeholders.** Removed `https://charts.example.com/security` and the generic `security-tool` install because they did not implement the stated topic.
5. **Prometheus alert rules were unrelated and contained questionable metric joins.** Removed the pod security alerting section and replaced it with Trivy `sbom` commands for vulnerability and license checks against generated SPDX/CycloneDX SBOMs.
6. **The verification script checked pod security controls instead of SBOM output.** Replaced it with checks that compare the number of discovered images to generated SPDX SBOM files and validate basic SPDX JSON structure with jq.

## Review Notes
- Rancher itself is used here as the cluster access and workload management layer; SBOM generation is performed by standard SBOM tooling against image references discovered from the Rancher-managed Kubernetes cluster.
- The article now recommends immutable image digests for production SBOM generation because tags can move after the SBOM is produced.
- The examples require registry credentials when workloads use private registries; Syft and `anchore/sbom-action` both support authenticated registry access.
