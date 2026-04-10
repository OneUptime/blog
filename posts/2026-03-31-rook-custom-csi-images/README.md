# How to Configure Custom CSI Images in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CSI, Kubernetes, Configuration

Description: Learn how to override default CSI sidecar and plugin container images in Rook for air-gapped environments or custom builds.

---

## Why Customize CSI Images?

In air-gapped environments, regulated data centers, or when testing custom CSI builds, you may need to override the default CSI container images that Rook uses. Rook exposes all CSI image references through the `rook-ceph-operator-config` ConfigMap, allowing you to substitute any image without modifying the operator itself.

## Locate the Operator Config

```bash
kubectl get configmap rook-ceph-operator-config -n rook-ceph -o yaml
```

Look for keys prefixed with `ROOK_CSI_` - these control which images are pulled for each CSI component.

## Override CSI Images in the ConfigMap

Edit the operator ConfigMap to set your custom image references:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-operator-config
  namespace: rook-ceph
data:
  ROOK_CSI_CEPH_IMAGE: "myregistry.example.com/sig-storage/cephcsi:v3.11.0"
  ROOK_CSI_REGISTRAR_IMAGE: "myregistry.example.com/sig-storage/csi-node-driver-registrar:v2.10.1"
  ROOK_CSI_RESIZER_IMAGE: "myregistry.example.com/sig-storage/csi-resizer:v1.10.1"
  ROOK_CSI_PROVISIONER_IMAGE: "myregistry.example.com/sig-storage/csi-provisioner:v4.0.1"
  ROOK_CSI_SNAPSHOTTER_IMAGE: "myregistry.example.com/sig-storage/csi-snapshotter:v7.0.2"
  ROOK_CSI_ATTACHER_IMAGE: "myregistry.example.com/sig-storage/csi-attacher:v4.5.1"
```

Apply the changes:

```bash
kubectl apply -f operator-config.yaml
```

## Mirror Images to a Private Registry

For air-gapped clusters, mirror the required images using your registry tool:

```bash
# Example using skopeo to mirror images
skopeo copy \
  docker://quay.io/cephcsi/cephcsi:v3.11.0 \
  docker://myregistry.example.com/sig-storage/cephcsi:v3.11.0

skopeo copy \
  docker://registry.k8s.io/sig-storage/csi-provisioner:v4.0.1 \
  docker://myregistry.example.com/sig-storage/csi-provisioner:v4.0.1
```

## Configure imagePullSecrets

If your registry requires authentication, create a pull secret and reference it:

```bash
kubectl create secret docker-registry my-registry-creds \
  --docker-server=myregistry.example.com \
  --docker-username=robot \
  --docker-password=<token> \
  -n rook-ceph
```

Then add the pull secret to the CSI service accounts so that CSI pods can pull from your private registry:

```bash
kubectl patch serviceaccount rook-csi-rbd-plugin-sa -n rook-ceph \
  --type=json \
  -p='[{"op":"add","path":"/imagePullSecrets","value":[{"name":"my-registry-creds"}]}]'

kubectl patch serviceaccount rook-csi-rbd-provisioner-sa -n rook-ceph \
  --type=json \
  -p='[{"op":"add","path":"/imagePullSecrets","value":[{"name":"my-registry-creds"}]}]'

kubectl patch serviceaccount rook-csi-cephfs-plugin-sa -n rook-ceph \
  --type=json \
  -p='[{"op":"add","path":"/imagePullSecrets","value":[{"name":"my-registry-creds"}]}]'

kubectl patch serviceaccount rook-csi-cephfs-provisioner-sa -n rook-ceph \
  --type=json \
  -p='[{"op":"add","path":"/imagePullSecrets","value":[{"name":"my-registry-creds"}]}]'
```

You can also set the image pull policy in the operator ConfigMap if needed:

```yaml
data:
  ROOK_CSI_IMAGE_PULL_POLICY: "IfNotPresent"
```

For the operator itself, add `imagePullSecrets` to the operator Deployment:

```bash
kubectl patch deployment rook-ceph-operator -n rook-ceph \
  --type=json \
  -p='[{"op":"add","path":"/spec/template/spec/imagePullSecrets","value":[{"name":"my-registry-creds"}]}]'
```

## Verify CSI Pods Are Updated

The Rook operator watches the `rook-ceph-operator-config` ConfigMap and automatically reconciles the CSI deployments and daemonsets when changes are detected. After applying your ConfigMap changes, the operator will roll out updated CSI pods with the new images.

If the pods are not updated automatically, you can trigger a manual restart:

```bash
kubectl rollout restart deployment/csi-rbdplugin-provisioner -n rook-ceph
kubectl rollout restart deployment/csi-cephfsplugin-provisioner -n rook-ceph
kubectl rollout restart daemonset/csi-rbdplugin -n rook-ceph
kubectl rollout restart daemonset/csi-cephfsplugin -n rook-ceph
```

Verify the new images are in use:

```bash
kubectl get pods -n rook-ceph -l app=csi-rbdplugin -o jsonpath='{.items[0].spec.containers[*].image}'
```

## Summary

Rook exposes all CSI component image references through the `rook-ceph-operator-config` ConfigMap, making it straightforward to substitute custom or mirrored images. This is essential for air-gapped deployments or when running specific CSI versions that differ from the Rook defaults.
