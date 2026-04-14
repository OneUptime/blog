# How to Use Dapr with Private Container Registries on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Private Registry, Air-Gap, Docker

Description: Configure Dapr to pull control plane and sidecar images from a private container registry for air-gapped environments or enterprise image management.

---

## Why Use a Private Registry with Dapr

Enterprises often proxy or mirror public images to a private registry for:
- Air-gapped cluster environments with no internet access
- Image scanning and vulnerability management
- Bandwidth reduction through local caching
- Compliance requirements

## Mirroring Dapr Images

First, pull and push all required Dapr images to your registry:

```bash
DAPR_VERSION="1.13.0"
PRIVATE_REGISTRY="registry.internal.example.com"

# List of Dapr images to mirror
IMAGES=(
  "daprio/operator:${DAPR_VERSION}"
  "daprio/sentry:${DAPR_VERSION}"
  "daprio/placement:${DAPR_VERSION}"
  "daprio/injector:${DAPR_VERSION}"
  "daprio/dashboard:0.14.0"
  "daprio/daprd:${DAPR_VERSION}"
)

for image in "${IMAGES[@]}"; do
  docker pull docker.io/${image}
  docker tag docker.io/${image} ${PRIVATE_REGISTRY}/${image}
  docker push ${PRIVATE_REGISTRY}/${image}
done
```

## Installing Dapr from a Private Registry

```bash
helm install dapr dapr/dapr \
  --namespace dapr-system \
  --set global.registry=${PRIVATE_REGISTRY}/daprio \
  --set global.tag=${DAPR_VERSION} \
  --wait
```

Or in a values file:

```yaml
# private-registry-values.yaml
global:
  registry: registry.internal.example.com/daprio
  tag: "1.13.0"
  imagePullSecrets:
  - name: registry-credentials
```

## Creating an Image Pull Secret

```bash
kubectl create secret docker-registry registry-credentials \
  --docker-server=registry.internal.example.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  --docker-email=admin@example.com \
  --namespace dapr-system
```

## Configuring the Sidecar to Pull from Private Registry

For the injected sidecar, use the annotation:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "myapp"
  dapr.io/app-port: "8080"
  dapr.io/sidecar-image: "registry.internal.example.com/daprio/daprd:1.13.0"
```

Or set a global default in Helm:

```yaml
dapr_sidecar_injector:
  image:
    name: "registry.internal.example.com/daprio/daprd"
```

## Verifying Images Are Pulled from Private Registry

```bash
# Check which registry images are from
kubectl get pods -n dapr-system -o jsonpath=\
'{range .items[*]}{.metadata.name}{"\n"}{range .spec.containers[*]}{.image}{"\n"}{end}{end}'

# Check pull events
kubectl describe pod dapr-operator-xxxxxxxxx -n dapr-system | grep -E "Pulling|Pulled|registry"
```

## Summary

Dapr's Helm chart accepts a `global.registry` value to redirect all image pulls to a private registry. Mirror all Dapr images (operator, sentry, placement, injector, dashboard, daprd) to your private registry before installation. Use the `dapr.io/sidecar-image` annotation to control the sidecar image per deployment or set a global default in the sidecar injector Helm values.
