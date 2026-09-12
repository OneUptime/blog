# Debug FailedCreatePodSandBox in Confidential Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confidential Containers, Kubernetes, Kata Containers, Troubleshooting, Security

Description: Find the failing CoCo sandbox stage by tracing RuntimeClass selection, containerd, the Kata shim, hypervisor startup, and guest image handling.

---

`FailedCreatePodSandBox` identifies an operation that failed, not its underlying cause. In Confidential Containers, that operation crosses Kubernetes, the container runtime, the Kata shim, a virtual machine, and guest services. Repeatedly deleting the pod loses useful timestamps without telling you which boundary broke.

Build a timeline for one attempt, then stop at the earliest component that failed. This procedure focuses on a bare-metal Kata deployment. A `kata-remote` peer-pod runtime adds a cloud provisioning path, so local QEMU checks do not apply to it.

## Capture the Pod, Node, and Attempt

Use a disposable reproduction with no production secrets. Capture the namespace, pod UID, assigned node, and RuntimeClass:

```bash
NS=default
POD=coco-repro
kubectl get pod "$POD" -n "$NS" -o json | jq '{
  name: .metadata.name,
  uid: .metadata.uid,
  node: .spec.nodeName,
  runtimeClass: .spec.runtimeClassName,
  phase: .status.phase
}'
kubectl describe pod "$POD" -n "$NS"
POD_UID=$(kubectl get pod "$POD" -n "$NS" -o jsonpath='{.metadata.uid}')
kubectl get events -n "$NS" \
  --field-selector "involvedObject.uid=$POD_UID" \
  --sort-by=.metadata.creationTimestamp
```

Record the complete nested error. The last phrase may contain the actionable failure: an unknown runtime handler, an executable that cannot be opened, an unsuccessful hypervisor launch, or a guest communication timeout. Keep the timestamp with that error so you can align node logs.

A pod that was never assigned a node has a scheduling problem. An application that has already started and then exited has passed sandbox creation. These cases require different investigations. [Kubernetes pod lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)

## Prove the Runtime Mapping

Read the actual RuntimeClass referenced by the pod:

```bash
RC=$(kubectl get pod "$POD" -n "$NS" -o jsonpath='{.spec.runtimeClassName}')
kubectl get runtimeclass "$RC" -o yaml
```

Its `handler` must match a runtime configured in the selected node's CRI implementation. The resource name and handler often match, but this is a convention rather than a requirement. Review its scheduling constraints too; a handler configured on one worker does not make it usable on every worker. [RuntimeClass documentation](https://kubernetes.io/docs/concepts/containers/runtime-class/)

On that node, inspect the container runtime service configuration and recent logs:

```bash
sudo systemctl cat containerd
sudo journalctl -u containerd --since '15 minutes ago' \
  --no-pager -o short-iso
sudo journalctl -u kubelet --since '15 minutes ago' \
  --no-pager -o short-iso
```

Replace service names when your Kubernetes distribution embeds containerd or kubelet. Follow the active containerd configuration to the handler's runtime type and `ConfigPath`. Do not copy a containerd 1.x plugin table into a 2.x configuration without checking the version's schema.

## Determine Whether the VM Started

The CoCo troubleshooting guide separates failures before VM startup from failures inside a running VM. This is a useful diagnostic boundary because registry credentials cannot fix a hypervisor that never launched. [CoCo troubleshooting](https://confidentialcontainers.org/docs/troubleshooting/)

For an executable or configuration error, verify the precise paths referenced by the installed handler:

```bash
# Replace these with paths from the active runtime configuration.
KATA_CONFIG=/opt/kata/share/defaults/kata-containers/configuration-qemu-snp.toml
sudo test -r "$KATA_CONFIG"
sudo rg '^\s*(path|kernel|image|initrd|firmware|firmware_volume)\s*=' "$KATA_CONFIG"
```

Check that the specified hypervisor, kernel, firmware, and guest image exist, have appropriate permissions, and belong to a coherent release bundle. A file being present is insufficient if it is an incompatible build or wrong architecture. Compare installed file hashes with your deployment artifacts when one node differs from otherwise working peers.

For an early QEMU failure, inspect its own error output and host kernel messages. Typical categories include unavailable KVM capabilities, confidential memory initialization failures, insufficient memory, or inaccessible devices. Check the platform prerequisites before tuning guest timeouts.

For a guest-agent timeout, look for evidence of guest boot and an established communication channel. A timeout after the VM begins running can reflect a guest kernel problem, missing agent, incorrect service startup, or vsock communication. Increasing the timeout is justified only when logs show successful but slow progress.

## Separate Guest Boot from Image Pulling

CoCo's guest components handle confidential image operations. A working host `ctr pull` does not exercise guest DNS, guest registry trust, guest credentials, or KBS access. Similarly, empty application logs are unsurprising when the container was never created. [CoCo architecture](https://github.com/confidential-containers/confidential-containers/blob/main/architecture.md)

Run a controlled progression on the same worker and runtime:

1. An ordinary disposable Kubernetes workload checks baseline cluster scheduling and networking.
2. A confidential pod using a public, unencrypted image checks the VM and guest pull path.
3. The same workload in the private registry checks guest authentication and registry trust.
4. An encrypted variant adds attestation, resource authorization, and decryption.

Pin image digests during these tests. Otherwise a changing tag can invalidate the comparison. If the public image succeeds and the encrypted image fails, return to the guest's first registry or attestation error rather than reinstalling the operator.

Set `imagePullPolicy: Always` on the confidential test pods so containerd delegates image handling to the guest instead of reusing an image from the kubelet's host-side cache.

## Collect Debug Data Carefully

Use debug configuration on an isolated worker with disposable workloads. Kata configuration changes affect newly started sandboxes; containerd configuration changes require the runtime service to reload or restart as documented for the distribution. Record which configuration changed and create a fresh attempt.

Debug consoles and verbose guest logs can expose workload information and can alter attestation evidence. Keep them out of the production acceptance test. A successful debug pod is an intermediate finding, not proof that the measured production configuration will pass the same policy.

## Conclusion

Resolve `FailedCreatePodSandBox` by following one attempt from RuntimeClass to handler, shim, VM, and guest services. The earliest failing boundary determines the fix. After correcting it, rerun the same digest with the intended confidential runtime and normal security configuration.

## Official Documentation

- [Kubernetes pod lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes RuntimeClass](https://kubernetes.io/docs/concepts/containers/runtime-class/)
- [CoCo troubleshooting](https://confidentialcontainers.org/docs/troubleshooting/)
- [CoCo architecture](https://github.com/confidential-containers/confidential-containers/blob/main/architecture.md)
