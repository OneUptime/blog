# Fix Large Confidential Image Timeouts and Guest Storage Exhaustion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confidential Containers, Kata Containers, Storage, Kubernetes, Troubleshooting

Description: Diagnose CoCo image-pull timeouts, guest memory pressure, and protected ephemeral storage limits without confusing host and guest caches.

---

A container image that pulls quickly with a conventional runtime can fail inside a confidential pod. The compressed registry size is only one input. The guest also needs room to download, decrypt, unpack, build its root filesystem, and start the application before an outer timeout expires.

First locate the exhausted resource or deadline. Increasing every timeout can turn a quick failure into a slow failure while leaving a full filesystem untouched.

## Measure Each Stage Separately

Capture the pod events and selected runtime before changing configuration:

```bash
NS=coco-test
POD=large-image
kubectl describe pod "$POD" -n "$NS"
kubectl get pod "$POD" -n "$NS" -o json | jq '{
  runtime: .spec.runtimeClassName,
  node: .spec.nodeName,
  phase: .status.phase,
  containers: .status.containerStatuses
}'
```

Build a timeline for guest boot, registry authentication, attestation, key retrieval, layer download, unpack, and container creation. Use the earliest concrete error, not the final generic RPC deadline. A KBS denial followed by retries is not a slow registry. A guest OOM kill can look like a stalled image pull after its useful logs disappear.

For each attempt, record image digest, compressed layer bytes, measured unpacked size, guest memory, storage mode, and concurrency. Reusing a tag while comparing runs makes these observations unreliable.

## Understand the Default Memory Cost

Kata's guest-pull path stores image content under `/run/kata-containers/image`. In the default confidential guest this is memory-backed, so unpacked layers consume guest memory. The [guest image management guide](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/docs/how-to/how-to-pull-images-in-guest-with-kata.md) describes this behavior.

Do not size from a registry's compressed number alone. A useful capacity estimate is:

```text
required guest memory =
  guest OS and services
  + resident image and writable filesystem data
  + application peak working set
  + transient download/decryption/unpack buffers
  + operational headroom
```

The terms overlap in implementation-specific ways, so use observed peaks to refine the estimate rather than blindly adding every artifact size twice. Large model archives and package caches are common sources of transient expansion.

In an approved diagnostic guest, inspect filesystem and memory separately:

```bash
findmnt -T /run/kata-containers/image
df -h /run/kata-containers/image
df -i /run/kata-containers/image
free -h
```

These are guest commands. Running them on the Kubernetes node measures a different filesystem. If the agent policy prevents a shell, use a preapproved canary collector or a separate synthetic workload instead of weakening the production policy.

A tmpfs can hit its own capacity while other memory remains available. An unpack can also run out of inodes. Check both before assuming the VM simply needs more RAM.

## Consider Protected Block Storage

CoCo documents an experimental option for storing guest image layers on a host-provided block device protected inside the guest. Its [confidential image-storage guide](https://confidentialcontainers.org/docs/features/protected-storage/confidential-image-storage/) specifies a raw block PVC attached at `/dev/trusted_store`.

For a dedicated blank device and a compatible CSI driver, the relevant pod fragment is:

```yaml
spec:
  volumes:
    - name: image-store
      persistentVolumeClaim:
        claimName: dedicated-image-store
  containers:
    - name: app
      volumeDevices:
        - name: image-store
          devicePath: /dev/trusted_store
```

The claim must have `volumeMode: Block`. This is not a filesystem PVC mounted as a regular application directory. Device preparation can initialize storage, so use a dedicated claim with no data to preserve.

Check the installed guest's encryption and integrity configuration. The current feature documentation describes dm-crypt with dm-integrity; Kata also exposes an `agent.secure_image_storage_integrity` setting. Do not infer integrity solely from an encrypted device being present. Verify the effective configuration for your release.

Protected image storage is ephemeral from the workload's perspective and does not provide replay protection. It is not a persistent cache shared by later pods, even though its underlying PV has an independent reclaim policy. Include OverlayFS writable-layer growth when sizing it.

## Distinguish Scratch Exhaustion from Image Exhaustion

An application writing temporary files to `emptyDir` may fill a separate device after its image pulled successfully. Current CoCo confidential emptyDir uses a protected sparse block backing file, whereas `medium: Memory` uses guest memory.

Kata's [storage limitations](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/docs/Limitations.md) explain that block-backed emptyDir sizing does not simply set the guest device capacity to `sizeLimit`. Host filesystem capacity affects the logical device size, and initial filesystem metadata consumes physical space. A small limit on a very large host filesystem can cause an unexpectedly early eviction.

Also, removing guest files need not reduce host allocation when integrity-protected storage cannot discard blocks. Track guest free space and host physical allocation independently. Repeated fill/delete cycles can leave the guest with space while the node approaches its storage limit.

## Change the Deadline That Actually Fired

There can be deadlines in kubelet, the runtime, Kata agent RPCs, CDH, registry clients, and proxies. Kata currently documents `agent.image_pull_timeout` separately from `agent.cdh_api_timeout` and device hotplug timeouts in its [agent options](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/src/agent/README.md).

Change one applicable setting after showing that the pull is making progress and has sufficient capacity. For NVIDIA's reference architecture, also check its kubelet timeout guidance for the specific supported release. A longer inner timeout cannot help if kubelet cancels the outer request sooner.

Kernel-command-line changes can alter attestation measurements. Deploy a reviewed canary configuration and its corresponding reference values rather than changing measured settings invisibly.

## Conclusion

Large confidential images need a budget for expanded layers, transient work, and application memory. Locate the failing stage, measure the guest filesystem, distinguish image storage from scratch storage, and then adjust capacity or the correct deadline. Treat cache behavior and protected block storage as release-specific features with explicit lifecycle limits.

## Official Documentation

- [Kata guest image management](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/docs/how-to/how-to-pull-images-in-guest-with-kata.md)
- [CoCo protected image storage](https://confidentialcontainers.org/docs/features/protected-storage/confidential-image-storage/)
- [CoCo confidential emptyDir](https://confidentialcontainers.org/docs/features/protected-storage/confidential-emptydir/)
- [Kata storage limitations](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/docs/Limitations.md)
- [Kata agent timeout and integrity settings](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/src/agent/README.md)
