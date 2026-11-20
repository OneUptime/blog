# Mirror Knative Serving Control Plane and Queue Proxy Images for Offline Installs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative, Kubernetes, Air-Gapped

Description: Inventory and mirror Knative Serving images, explicitly override queue-proxy, and prove offline operation with a new Revision on an uncached node.

An offline Knative installation can show healthy control-plane Deployments while every new application fails with `ImagePullBackOff`. The missing image is often `queue-proxy`, which Knative adds to application pods. It is configured separately from the images visible in the control-plane Deployments.

Build an inventory from the exact release you will install, mirror every required image, and test creation of a fresh Revision without external registry access. A running controller alone is not the acceptance test.

## Freeze the installation inputs

Save the release manifests, Operator version if applicable, networking layer manifests, enabled optional components, and application images. Record source digests and the architectures your nodes require. Do not combine images from unrelated release manifests just because their container names match.

The [Knative installation overview](https://knative.dev/docs/install/) distinguishes YAML and Operator installation. Include the Operator and its webhook images when using that path. Include the selected ingress implementation, certificates tooling if used, and any installation jobs. Also inventory URLs that an installation process retrieves: mirroring images does not make a remote YAML dependency available offline.

This Python helper lists ordinary image fields and explicit queue-proxy settings from already downloaded YAML files. It requires PyYAML:

```python
import sys
from pathlib import Path
import yaml

images = set()

def visit(value):
    if isinstance(value, dict):
        for key, item in value.items():
            if key in {"image", "queue-sidecar-image"} and isinstance(item, str):
                images.add(item)
            visit(item)
    elif isinstance(value, list):
        for item in value:
            visit(item)

for filename in sys.argv[1:]:
    for document in yaml.safe_load_all(Path(filename).read_text()):
        visit(document)

print("\n".join(sorted(images)))
```

Run it against the rendered manifests, not unrendered templates. Inspect embedded configuration strings and generated images manually; this helper is an inventory aid, not a proof of completeness. A `ko://` reference is a build-time placeholder and must be replaced by the released image reference before mirroring.

## Copy the images without losing architectures

Prepare a reviewed `images.tsv` with two tab-separated columns: a source reference pinned by digest and the intended mirror repository plus release tag. From a connected transfer environment with appropriate registry credentials:

```bash
set -euo pipefail
while IFS=$'\t' read -r source_image destination_image; do
  [ -n "$source_image" ] || continue
  skopeo copy --all --preserve-digests \
    "docker://$source_image" "docker://$destination_image"
done < images.tsv
```

[Skopeo's copy reference](https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md) explains that `--all` copies the image list and its members, while `--preserve-digests` fails if preservation is impossible. Do not quietly remove the latter flag and keep claiming unchanged digests. For a disconnected transfer, use an approved archive or registry replication process that preserves the same manifests and all needed blobs, then verify the imported images inside the restricted environment.

## Set control-plane and queue-proxy references

For Operator installations, merge the following into the existing `KnativeServing` resource. Replace the illustrative mirror paths and bundle tag with your verified mapping:

```yaml
spec:
  registry:
    default: registry.internal.example/knative/${NAME}:serving-bundle
    imagePullSecrets:
      - name: mirror-pull
  config:
    deployment:
      queue-sidecar-image: registry.internal.example/knative/queue-proxy:serving-bundle
```

The [Operator registry settings](https://knative.dev/docs/install/operator/configuring-serving-cr/) support a common image template and per-container overrides. Names that collide across Deployments can require deployment-qualified overrides. Check the actual rendered images after reconciliation.

Set `spec.config.deployment.queue-sidecar-image` explicitly because [config-deployment](https://knative.dev/docs/serving/configuration/deployment/) controls the injected queue proxy. For YAML-managed installations, update the workload images and the live `data.queue-sidecar-image` setting in the managed ConfigMap source.

The control-plane pull Secret belongs in its namespace. Application pods need suitable pull credentials in their own namespaces, including access to queue-proxy. Registry CA trust must work for both the controller's tag resolution and the node container runtimes.

## Prove the disconnected path

With external egress denied in the test environment, create a new Service using a mirrored application image. Inspect all generated container and init-container image references:

```bash
kubectl -n applications get pods -l serving.knative.dev/service=offline-probe \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{range .spec.initContainers[*]}{.image}{"\n"}{end}{range .spec.containers[*]}{.image}{"\n"}{end}{end}'
```

Use an uncached node, or otherwise demonstrate that images were pulled from the mirror rather than satisfied from old node caches. Check registry audit logs, pod events, readiness, and an actual request through the Knative route. Repeat after scale-to-zero and on each supported node architecture. Preserve the mapping and release inputs so the next upgrade follows the same reproducible process.
