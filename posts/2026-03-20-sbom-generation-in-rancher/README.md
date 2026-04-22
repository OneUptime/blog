# How to Generate SBOMs in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Security, SBOM, Supply Chain, DevSecOps

Description: Learn how to generate Software Bill of Materials (SBOMs) for container images running in Rancher-managed Kubernetes clusters to improve supply chain security.

## Introduction

A Software Bill of Materials (SBOM) is a comprehensive list of all software components, libraries, and dependencies within a container image. Generating SBOMs for workloads in Rancher helps you maintain visibility into your software supply chain and identify vulnerabilities.

## Prerequisites

- A running Rancher instance
- kubectl configured for your cluster
- Syft or Trivy installed locally or as a cluster workload

## Installing Syft for SBOM Generation

Syft is a popular open-source tool for generating SBOMs. Install it on your workstation:

```bash
curl -sSfL https://get.anchore.io/syft | sudo sh -s -- -b /usr/local/bin
```

Verify the installation:

```bash
syft version
```

## Generating an SBOM for a Container Image

To generate an SBOM for a specific image used in your Rancher workload:

```bash
syft nginx:latest -o spdx-json > nginx-sbom.json
```

For CycloneDX format:

```bash
syft nginx:latest -o cyclonedx-json > nginx-sbom-cyclonedx.json
```

## Scanning Running Pods in Rancher

List running images across your cluster:

```bash
kubectl get pods --all-namespaces --field-selector=status.phase=Running \
  -o jsonpath='{range .items[*]}{.spec.containers[*].image}{"\n"}{end}' | sort -u > images.txt
```

Generate SBOMs for each:

```bash
while IFS= read -r image; do
  name=$(echo "$image" | tr '/:' '-')
  syft "$image" -o spdx-json > "sbom-${name}.json"
done < images.txt
```

## Automating SBOM Generation in CI/CD

Integrate SBOM generation into your pipeline:

```yaml
- name: Generate SBOM
  run: |
    syft ${{ env.IMAGE_NAME }}:${{ env.IMAGE_TAG }} \
      -o spdx-json > sbom.json

- name: Upload SBOM as artifact
  uses: actions/upload-artifact@v7
  with:
    name: sbom
    path: sbom.json
```

## Using Trivy for SBOM Generation

Trivy also supports SBOM generation:

```bash
trivy image --format spdx-json --output trivy-sbom.json nginx:latest
```

## Storing SBOMs in Rancher

You can store SBOMs as ConfigMaps or publish signed SBOM attestations in an OCI registry alongside immutable image references:

```bash
cosign attest --yes --predicate sbom.json --type spdxjson <image-uri>@sha256:<digest>
```

## Conclusion

Generating SBOMs for workloads in Rancher is a key step toward supply chain security. By automating SBOM creation in your CI/CD pipeline and storing them alongside images, you build a foundation for ongoing vulnerability management and compliance.
