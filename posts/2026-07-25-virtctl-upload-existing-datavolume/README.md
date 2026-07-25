# Upload a Local VM Disk to an Existing DataVolume with virtctl

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, CDI, virtctl, Image Upload

Description: Prepare an upload DataVolume and use virtctl image-upload with no-create so a local VM disk is sent to the exact existing target.

---

To upload into an existing DataVolume, create that DataVolume with `source.upload`, wait until CDI prepares its upload path, and run `virtctl image-upload dv ... --no-create`. The `--no-create` flag is the critical safety control: it tells `virtctl` to use the named object instead of trying to create one from command-line size and storage flags.

An existing arbitrary DataVolume is not automatically an upload target. Its immutable source must describe an upload workflow, and it must not already contain a completed disk you intend to preserve.

## Inspect the Local Disk

CDI supports raw and qcow2 VM images for this workflow. Bootable ISO files are treated like raw images. Inspect virtual size before sizing the DataVolume:

```bash
qemu-img info --output=json ./appliance.qcow2
sha256sum ./appliance.qcow2
```

The `spec.storage` request must accommodate the virtual disk after conversion, not only the compressed qcow2 file. For a Filesystem volume, CDI accounts for its configured filesystem overhead when it creates the underlying PVC. Keep the checksum for your own artifact audit; `virtctl image-upload` does not turn a local checksum into a CDI HTTP source checksum.

## Create the Upload DataVolume

Use explicit storage settings:

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: DataVolume
metadata:
  name: appliance-root
  namespace: vm-images
spec:
  source:
    upload: {}
  contentType: kubevirt
  storage:
    storageClassName: fast-rwo
    accessModes:
      - ReadWriteOnce
    volumeMode: Filesystem
    resources:
      requests:
        storage: 40Gi
```

Apply and inspect it:

```bash
kubectl apply -f appliance-root.yaml
kubectl get datavolume,pvc -n vm-images
kubectl describe datavolume appliance-root -n vm-images
```

If a DataVolume with that name already exists, verify its source before proceeding:

```bash
kubectl get datavolume appliance-root -n vm-images \
  -o jsonpath='{.spec.source}{" phase="}{.status.phase}{"\n"}'
```

An output beginning with `map[upload:map[]]` confirms the upload source. Stop if the object points to HTTP, registry, PVC clone, or another source.

## Confirm the Upload Proxy URL

The CDI upload proxy must be reachable from the machine running `virtctl`. Check CDI's configured URL:

```bash
kubectl get cdiconfig config \
  -o jsonpath='{.status.uploadProxyURL}{"\n"}'
```

If your platform has not published it, use an administrator-provided Ingress, Route, or LoadBalancer endpoint. Port forwarding is useful for a controlled local test but is not a resilient production transfer path:

```bash
kubectl port-forward -n cdi service/cdi-uploadproxy 8443:443
```

The certificate must be trusted and valid for the hostname passed to `virtctl`.

## Upload Without Creating Another Object

Run:

```bash
virtctl image-upload dv appliance-root \
  --namespace=vm-images \
  --no-create \
  --image-path=./appliance.qcow2 \
  --uploadproxy-url=https://cdi-uploadproxy.example.com
```

Do not pass `--size`, `--storage-class`, `--access-mode`, or `--volume-mode` when the existing DataVolume already defines them. Those flags are for object creation and can make operator intent unclear even when `--no-create` ignores creation.

`virtctl` creates an `UploadTokenRequest`, sends the authenticated upload to the proxy, and waits while CDI processes the image. The token is short-lived and scoped to the target claim.

For a DataVolume using a `WaitForFirstConsumer` StorageClass, upload may wait because the PVC is intentionally unbound. With `--no-create`, current `virtctl` does not add the immediate-binding annotation to an existing object, so `--force-bind` alone is not sufficient. If immediate placement is safe, such as for a topology-independent golden image, annotate the existing PVC and use `--force-bind` to let the client wait while CDI binds it:

```bash
kubectl annotate pvc appliance-root -n vm-images \
  cdi.kubevirt.io/storage.bind.immediate.requested=true

virtctl image-upload dv appliance-root \
  --namespace=vm-images \
  --no-create \
  --force-bind \
  --image-path=./appliance.qcow2 \
  --uploadproxy-url=https://cdi-uploadproxy.example.com
```

Do not force a VM-specific local or zonal disk onto an arbitrary node.

## Monitor Server-Side Processing

Keep another terminal open:

```bash
kubectl get datavolume,pvc,pod -n vm-images -w
```

Inspect status if the client exits or a proxy times out:

```bash
kubectl describe datavolume appliance-root -n vm-images
kubectl get datavolume appliance-root -n vm-images \
  -o jsonpath='{.status.phase}{"\n"}'
kubectl get pods -n vm-images \
  -l cdi.kubevirt.io=cdi-upload-server
```

An asynchronous server-side conversion may continue after bytes finish crossing the network. Do not repeat the upload merely because the client connection ended. Check the DataVolume phase and upload-server logs first.

## Fix Common Failures

- target PVC or DataVolume not found: verify the namespace and context, and wait for CDI to create the DataVolume's PVC; `--no-create` correctly refuses to invent the target.
- target is not an upload DataVolume: create a separate `source.upload` DataVolume.
- unknown authority: install the upload endpoint's CA chain in the client trust store.
- certificate SAN mismatch: use the endpoint's valid DNS name or issue the correct certificate.
- `403` creating an upload token: grant the user permission to create `uploadtokenrequests` in the target namespace.
- no space during conversion: size the `spec.storage` request for the qcow2 virtual size; CDI accounts for configured filesystem overhead when rendering the underlying Filesystem PVC. Separately, ensure CDI can provision its temporary Filesystem/RWO scratch PVC.
- upload Pod Pending: inspect PVC binding, quota, scheduling, and scratch StorageClass.

Use `--insecure` only to isolate a TLS diagnosis in an approved environment. It disables server verification and is not the production fix.

## Attach Only After Success

Wait for:

```text
Succeeded
```

Then reference the DataVolume from a VM:

```yaml
volumes:
  - name: root
    dataVolume:
      name: appliance-root
```

KubeVirt normally keeps a VM that references a DataVolume from starting until population succeeds; waiting for `Succeeded` also gives you a clear operational gate before attachment.

## Official Documentation

- [KubeVirt virtctl image-upload guide](https://kubevirt.io/user-guide/storage/containerized_data_importer/#virtctl-image-upload)
- [CDI upload workflow](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/upload.md)
- [CDI upload RBAC](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/RBAC.md#upload-token)
- [CDI DataVolume upload source](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
