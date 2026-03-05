# How to Set Up HelmRepository for Private Helm Registries in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRepository, Private Registry, ChartMuseum, Harbor

Description: Learn how to configure Flux CD HelmRepository sources for private Helm registries including ChartMuseum, Harbor, Artifactory, and self-hosted solutions.

---

## Introduction

Enterprise environments commonly host Helm charts in private registries to control access, enforce security policies, and manage internal software distribution. Flux CD supports connecting to various private Helm registry solutions through the HelmRepository custom resource. This guide covers setting up HelmRepository sources for popular private registry platforms including ChartMuseum, Harbor, JFrog Artifactory, and Nexus Repository Manager.

## Prerequisites

- A running Kubernetes cluster with Flux CD v2.x installed
- kubectl and the Flux CLI configured
- A private Helm registry with at least one chart published
- Network connectivity from the cluster to the private registry

## Setting Up a ChartMuseum HelmRepository

ChartMuseum is a popular open-source Helm chart repository server. To connect Flux to a ChartMuseum instance, create a secret with the credentials and a HelmRepository resource.

Create the authentication secret first.

```bash
# Create a secret with ChartMuseum basic auth credentials
kubectl create secret generic chartmuseum-creds \
  --namespace flux-system \
  --from-literal=username=admin \
  --from-literal=password=changeme
```

Now define the HelmRepository resource.

```yaml
# helmrepository-chartmuseum.yaml
# HelmRepository pointing to a private ChartMuseum instance
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: chartmuseum
  namespace: flux-system
spec:
  # URL of your ChartMuseum instance
  url: https://chartmuseum.internal.example.com
  interval: 15m
  # Reference the secret with ChartMuseum credentials
  secretRef:
    name: chartmuseum-creds
```

## Setting Up a Harbor HelmRepository

Harbor is an open-source container and Helm chart registry. Harbor exposes a ChartMuseum-compatible API for Helm charts within each project.

```bash
# Create a secret with Harbor credentials
# Harbor uses a robot account or user credentials
kubectl create secret generic harbor-creds \
  --namespace flux-system \
  --from-literal=username=robot\$flux-reader \
  --from-literal=password=your-robot-account-token
```

Define the HelmRepository pointing to the Harbor project's chart repository.

```yaml
# helmrepository-harbor.yaml
# HelmRepository pointing to a Harbor project's Helm chart repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: harbor-charts
  namespace: flux-system
spec:
  # Harbor chart repository URL follows the pattern: https://<harbor-host>/chartrepo/<project>
  url: https://harbor.internal.example.com/chartrepo/my-project
  interval: 15m
  secretRef:
    name: harbor-creds
```

Harbor also supports OCI-based chart storage. For OCI access, use the following configuration instead.

```yaml
# helmrepository-harbor-oci.yaml
# HelmRepository using OCI protocol for Harbor registry
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: harbor-oci
  namespace: flux-system
spec:
  type: oci
  # OCI URL for Harbor follows: oci://<harbor-host>/<project>
  url: oci://harbor.internal.example.com/my-project
  interval: 15m
  secretRef:
    name: harbor-creds
```

## Setting Up a JFrog Artifactory HelmRepository

JFrog Artifactory supports Helm chart repositories natively. You can use either the virtual or local repository URL.

```bash
# Create a secret with Artifactory credentials
# Use an API key or access token as the password
kubectl create secret generic artifactory-creds \
  --namespace flux-system \
  --from-literal=username=flux-reader \
  --from-literal=password=your-api-key
```

```yaml
# helmrepository-artifactory.yaml
# HelmRepository pointing to a JFrog Artifactory Helm repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: artifactory
  namespace: flux-system
spec:
  # Artifactory virtual repository URL for Helm charts
  url: https://artifactory.example.com/artifactory/helm-virtual
  interval: 30m
  secretRef:
    name: artifactory-creds
```

## Setting Up a Nexus Repository Manager HelmRepository

Sonatype Nexus Repository Manager can host Helm chart repositories. Use the hosted or proxy repository URL.

```bash
# Create a secret with Nexus credentials
kubectl create secret generic nexus-creds \
  --namespace flux-system \
  --from-literal=username=flux-reader \
  --from-literal=password=your-nexus-password
```

```yaml
# helmrepository-nexus.yaml
# HelmRepository pointing to a Nexus Repository Manager Helm repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: nexus-charts
  namespace: flux-system
spec:
  # Nexus Helm hosted repository URL
  url: https://nexus.example.com/repository/helm-hosted/
  interval: 30m
  secretRef:
    name: nexus-creds
```

## Handling Self-Signed Certificates

Private registries often use self-signed TLS certificates or internal certificate authorities. You need to provide the CA certificate so Flux can verify the connection.

Create a secret containing the CA certificate.

```bash
# Create a secret with the CA certificate for the private registry
kubectl create secret generic registry-ca \
  --namespace flux-system \
  --from-file=caFile=/path/to/internal-ca.crt
```

Reference the CA secret in the HelmRepository.

```yaml
# helmrepository-selfsigned.yaml
# HelmRepository with a custom CA certificate for self-signed TLS
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: internal-charts
  namespace: flux-system
spec:
  url: https://charts.internal.example.com
  interval: 30m
  # This secret contains both credentials and the CA certificate
  secretRef:
    name: registry-ca
```

If you need both authentication and a custom CA, combine them in a single secret.

```bash
# Create a combined secret with credentials and CA certificate
kubectl create secret generic registry-full-creds \
  --namespace flux-system \
  --from-literal=username=flux-reader \
  --from-literal=password=your-password \
  --from-file=caFile=/path/to/internal-ca.crt
```

## Network Considerations

When your private registry is behind a firewall or in a different network segment, ensure that the Flux source controller pods can reach the registry. Common configurations include:

- **NetworkPolicy**: Allow egress from the flux-system namespace to the registry endpoint
- **DNS resolution**: Ensure the registry hostname resolves from within the cluster
- **Proxy settings**: Configure HTTP_PROXY and HTTPS_PROXY if traffic must go through a proxy

Here is an example NetworkPolicy allowing outbound traffic to your registry.

```yaml
# networkpolicy-helm-registry.yaml
# Allow the Flux source controller to reach the private Helm registry
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-helm-registry
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: source-controller
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            # Replace with your registry's IP range
            cidr: 10.0.0.0/8
      ports:
        - protocol: TCP
          port: 443
```

## Verifying Connectivity

After creating the HelmRepository, verify that Flux can reach and authenticate with your private registry.

```bash
# Check the HelmRepository status
flux get sources helm --all-namespaces

# Look for specific error messages if the repository is not ready
kubectl describe helmrepository -n flux-system internal-charts
```

Common status messages and what they mean:

- **stored artifact** -- Flux successfully fetched the repository index
- **failed to fetch** -- Network connectivity or DNS issue
- **401 Unauthorized** -- Invalid or missing credentials
- **x509: certificate signed by unknown authority** -- Missing or incorrect CA certificate

## Summary

Connecting Flux CD to private Helm registries requires a HelmRepository resource with appropriate credentials and TLS configuration. Each registry platform (ChartMuseum, Harbor, Artifactory, Nexus) follows the same pattern: create a Kubernetes secret with credentials, optionally include a CA certificate, and reference the secret in the HelmRepository spec. Always verify connectivity after setup and ensure network policies allow traffic from the Flux source controller to your registry.
