# How to Set Up OCI-Format Registries in Portainer for Helm Charts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, OCI, Helm, Container Registry, Kubernetes

Description: Learn how to configure OCI-compliant registries in Portainer to store and deploy Helm charts alongside container images.

## What Are OCI-Format Registries?

The OCI (Open Container Initiative) Distribution Specification extends container registries to store arbitrary artifacts - including Helm charts. This means you can store Helm charts in the same registry as your container images, using standard registry credentials.

## Supported OCI Registries for Helm Charts

- **Amazon ECR** - supports OCI artifacts natively
- **GitHub Container Registry (GHCR)** - supports OCI artifacts
- **Azure Container Registry (ACR)** - supports OCI artifacts
- **Harbor 2.0+** - supports OCI artifacts
- **Google Artifact Registry** - supports OCI artifacts

## Pushing a Helm Chart to an OCI Registry

```bash
# Enable OCI support in Helm (required for Helm 3.7 and earlier)

export HELM_EXPERIMENTAL_OCI=1

# Package your Helm chart
helm package ./my-chart
# Creates: my-chart-0.1.0.tgz

# Log in to the OCI registry
helm registry login registry.mycompany.com \
  --username myuser \
  --password mypassword

# Push the chart to the OCI registry
helm push my-chart-0.1.0.tgz oci://registry.mycompany.com/helm-charts
```

## Pulling a Helm Chart from an OCI Registry

```bash
# Pull a chart from an OCI registry
helm pull oci://registry.mycompany.com/helm-charts/my-chart --version 0.1.0

# Install directly from an OCI registry
helm install my-release \
  oci://registry.mycompany.com/helm-charts/my-chart \
  --version 0.1.0
```

## Adding an OCI Registry to Portainer

Since OCI registries use the same authentication as container registries, add them in Portainer the same way:

1. Go to **Settings > Registries** and click **Add registry**.
2. Select **Custom registry**.
3. Enter your registry URL, username, and password.
4. Click **Add registry**.

When deploying Helm charts in Portainer (Kubernetes environments), select the registered OCI registry as the source.

## Using OCI Charts in Portainer Kubernetes Deployments

1. In your Kubernetes environment, go to **Applications** and click **Add application**.
2. Select **Helm chart** as the deployment type.
3. Choose your OCI registry and enter the chart path.
4. Portainer will authenticate using the stored credentials.

## Storing Charts in AWS ECR (Example)

```bash
# Create an ECR repository for Helm charts
aws ecr create-repository \
  --repository-name helm-charts/my-app \
  --region us-east-1

# Authenticate and push
aws ecr get-login-password --region us-east-1 | \
  helm registry login \
  --username AWS \
  --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

helm push my-app-1.0.0.tgz \
  oci://123456789012.dkr.ecr.us-east-1.amazonaws.com/helm-charts
```

## Conclusion

OCI-format registries unify container image and Helm chart storage under a single registry with consistent authentication. Portainer's registry management makes it easy to deploy Helm charts from OCI sources alongside your container workloads.
