# Validation Summary: Debug FailedCreatePodSandBox in Confidential Containers

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Confidential Containers (CoCo)
- Kubernetes and RuntimeClass
- containerd CRI configuration
- Kata Containers and the Kata shim
- QEMU/KVM confidential virtual machines
- Guest image pulling, attestation, and Key Broker Service access

## Sources Consulted
- [Kubernetes Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes RuntimeClass](https://kubernetes.io/docs/concepts/containers/runtime-class/)
- [Kubernetes field selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [containerd CRI plugin configuration](https://github.com/containerd/containerd/blob/main/docs/cri/config.md)
- [Kata Containers with containerd and Kubernetes](https://github.com/kata-containers/kata-containers/blob/main/docs/how-to/containerd-kata.md)
- [Kata Containers QEMU configuration template](https://github.com/kata-containers/kata-containers/blob/main/src/runtime/config/configuration-qemu.toml.in)
- [Confidential Containers troubleshooting](https://confidentialcontainers.org/docs/troubleshooting/)
- [Confidential Containers architecture](https://github.com/confidential-containers/confidential-containers/blob/main/architecture.md)

## Issues Found
- The event query selected events by pod name, which can include events from earlier pods recreated with the same name. It now captures the pod UID and filters on `involvedObject.uid` to isolate one attempt.
- The `rg` expression only matched Kata configuration keys at the start of a line. Kata TOML examples indent keys, so the expression now permits leading whitespace.
- The controlled confidential image tests did not require `imagePullPolicy: Always`. Current CoCo troubleshooting guidance warns that a host-side cached image can bypass delegation to the guest and cause a root filesystem mount failure. The post now explicitly sets this policy for confidential test pods.

## Review Notes
The post correctly distinguishes local Kata/QEMU deployments from the `kata-remote` peer-pods path, accounts for the containerd 1.x and 2.x configuration schema difference, and treats VM startup, guest boot, guest-agent connectivity, and confidential image handling as separate diagnostic boundaries. Exact service names and Kata artifact paths remain distribution- and release-specific, as the post notes.
