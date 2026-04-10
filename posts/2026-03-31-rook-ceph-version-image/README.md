# How to Configure Ceph Version Image and Pull Policy in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Storage, Configuration, Container

Description: Configure the Ceph container image, version tag, image pull policy, and allowUnsupported flag in the CephCluster CRD for controlled version management.

---

## cephVersion Spec Overview

The `spec.cephVersion` section of the CephCluster CRD controls which Ceph container image Rook uses for all Ceph daemon pods (Mon, OSD, MGR, MDS, RGW). It also controls whether Rook blocks deployment of unsupported Ceph versions.

```yaml
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v19.2.0
    allowUnsupported: false
    imagePullPolicy: IfNotPresent
```

## Choosing the Right Image Tag

Rook recommends using an explicit version tag (not `latest`) to ensure reproducible deployments:

| Tag Format | Example | Stability |
|---|---|---|
| Latest stable | `v19.2.0` | Recommended for production |
| Minor stream | `v19.2` | Tracks latest patch in minor |
| Development | `main` | Unstable, testing only |

Always pin to a specific patch version in production:

```yaml
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v19.2.0
```

## Official Ceph Image Registries

The official Ceph container images are hosted at:

- `quay.io/ceph/ceph` - Primary registry (recommended)
- `docker.io/ceph/ceph` - Docker Hub mirror

Using quay.io is preferred to avoid Docker Hub rate limits in CI/CD environments.

## allowUnsupported Flag

Set `allowUnsupported: false` (the default) to prevent deploying a Ceph version that is not validated by the installed Rook version:

```yaml
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v19.2.0
    allowUnsupported: false
```

If you set `allowUnsupported: true`, Rook will deploy the specified image even if it is not in the supported version list. This is useful for:

- Testing a new Ceph release candidate
- Running a hotfix build from your own registry

```yaml
spec:
  cephVersion:
    image: my-registry.example.com/ceph/ceph:v19.3.0-rc1
    allowUnsupported: true
```

## imagePullPolicy

The `imagePullPolicy` follows standard Kubernetes conventions:

```yaml
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v19.2.0
    imagePullPolicy: IfNotPresent
```

| Policy | Behavior |
|---|---|
| `IfNotPresent` | Pull only if image is not cached on node (default) |
| `Always` | Pull on every pod start (useful for mutable tags) |
| `Never` | Never pull; fail if not cached (air-gapped environments) |

For production with pinned version tags, `IfNotPresent` is the correct choice.

## Using a Private Registry

In air-gapped or private registry environments, mirror the Ceph image and configure imagePullSecrets:

```bash
# Pull and re-tag
docker pull quay.io/ceph/ceph:v19.2.0
docker tag quay.io/ceph/ceph:v19.2.0 my-registry.internal/ceph/ceph:v19.2.0
docker push my-registry.internal/ceph/ceph:v19.2.0
```

Create a pull secret:

```bash
kubectl -n rook-ceph create secret docker-registry ceph-pull-secret \
  --docker-server=my-registry.internal \
  --docker-username=username \
  --docker-password=password
```

Override the CSI plugin image in the Rook operator ConfigMap to use your private registry:

```yaml
data:
  ROOK_CSI_CEPH_IMAGE: "my-registry.internal/cephcsi/cephcsi:v3.12.0"
```

And configure the Ceph daemon image and pull secret in the CephCluster:

```yaml
spec:
  cephVersion:
    image: my-registry.internal/ceph/ceph:v19.2.0
    imagePullPolicy: IfNotPresent
  imagePullSecrets:
    - name: ceph-pull-secret
```

## Upgrading the Ceph Image

To upgrade Ceph, update the image tag in the CephCluster spec:

```bash
kubectl -n rook-ceph patch cephcluster rook-ceph \
  --type merge \
  -p '{"spec":{"cephVersion":{"image":"quay.io/ceph/ceph:v19.2.1"}}}'
```

Rook performs a rolling upgrade, updating one daemon at a time. Monitor progress:

```bash
kubectl -n rook-ceph get pods -w
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph versions
```

## Checking the Currently Deployed Version

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph version
# ceph version 19.2.0 (xxx) squid (stable)
```

Or check the image being used by running OSD pods:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd \
  -o jsonpath='{.items[0].spec.containers[0].image}'
```

## Summary

Configure `spec.cephVersion.image` with an explicit version tag like `quay.io/ceph/ceph:v19.2.0` to ensure reproducible deployments. Use `imagePullPolicy: IfNotPresent` for production with pinned tags. Set `allowUnsupported: false` to prevent accidental deployment of unsupported Ceph versions. For air-gapped deployments, mirror the Ceph image to an internal registry and configure `imagePullSecrets` in the CephCluster spec. Upgrade by patching the image field and monitoring the rolling update with `ceph versions`.
