# How to Capture a Data-Plane Packet Trace in a Distroless Envoy Pod with Ephemeral Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Envoy, Ephemeral Container, Pod Debugging, Packet Capture, tcpdump, Network Diagnostics, Security

Description: Capture a bounded Envoy data-plane trace from a distroless Pod using a vetted ephemeral container without changing the running workload image.

---

A distroless Envoy image intentionally has no shell, package manager, or packet-capture utility. Replacing it with a debug image can restart the proxy and destroy the connection state you need to inspect. Kubernetes ephemeral containers provide a better incident tool: add a temporary diagnostics container to the existing Pod and capture from the Pod's shared network namespace.

This technique is powerful enough to expose request contents, credentials, customer identifiers, and internal topology. Treat it as privileged production access. Define the question first, capture the smallest useful slice, and follow your organization's approval, storage, and deletion rules. A broad, unbounded `tcpdump -i any -w capture.pcap` is not a safe default.

## Know what the ephemeral container changes

Ephemeral containers are stable in Kubernetes from version 1.25. They are added through the Pod's `ephemeralcontainers` subresource, not by editing the ordinary container list. They have no resource guarantees, are never restarted automatically, and cannot declare resources, ports, or probes. After one is added, its specification cannot be changed or removed from that Pod; ending its process stops it, but the entry remains until the Pod is replaced normally.

All containers in a Pod share its network namespace. That is what lets a debug container see the application's and Envoy's interfaces. `kubectl debug --target=istio-proxy` additionally asks the container runtime to target the proxy's process namespace. Process targeting helps with commands such as `ps`, but it is not what creates network visibility, and some runtimes do not support it fully.

The debug container also consumes the Pod's real CPU, memory, and ephemeral storage without adding schedulable resource requests. A packet capture can therefore worsen a resource-pressure incident. Bound it by packet count or time, use a narrow filter, and stream the output off the Pod.

## Define the packet-level question

Start from Envoy evidence. Record the timestamp, request ID if available, caller Pod, selected upstream cluster, endpoint IP and port, and response flag. Useful commands that do not require a shell in the proxy are:

```bash
NS=payments
POD=checkout-7c9db5f9b8-k2m4x

kubectl logs -n "$NS" "$POD" -c istio-proxy \
  --since=5m --tail=300

istioctl proxy-config endpoints "$POD" -n "$NS" \
  --cluster 'outbound|8080||ledger.payments.svc.cluster.local'
```

Then phrase a question that packets can answer:

- Did the caller send a SYN to `10.42.7.19:8080`, and did it receive a SYN-ACK or RST?
- Which peer initiated the reset reported as `UF` or `UR`?
- Are retransmissions consistent with a silent network drop?
- Does the TLS peer respond after ClientHello, or does the connection close first?

A packet trace cannot explain why an encrypted HTTP request received a particular application response, prove an Istio policy match, or show Kubernetes NetworkPolicy decisions directly. Use Envoy configuration, logs, CNI telemetry, and application logs for those layers.

## Perform authorization and safety preflight

Verify access without asking for broad cluster-admin privileges:

```bash
kubectl auth can-i get pods -n "$NS"
kubectl auth can-i patch pods/ephemeralcontainers -n "$NS"
kubectl auth can-i create pods/exec -n "$NS"
```

Current `kubectl debug` uses a strategic merge patch on the `pods/ephemeralcontainers` subresource; another API client can use an update instead. Check the verb used by the approved client, and treat a real request as the final check. Do not weaken RBAC, Pod Security admission, seccomp, AppArmor, or an image policy merely to make the capture work. Escalate through the approved incident-access path.

Choose a diagnostics image from an internal registry, pin it by digest, and verify its provenance. It needs `tcpdump` and a long-running command; it does not need cloud credentials or a Kubernetes client. Avoid an unreviewed public “network toolbox” image in a production Pod because it executes inside the workload's security and network boundary.

Packet capture normally needs `CAP_NET_RAW`; promiscuous interface changes may also require `CAP_NET_ADMIN`. The least-privilege approach is to capture without promiscuous mode using `tcpdump -p` and request only `NET_RAW`. Kubernetes custom debug profiles are stable from version 1.32. On a compatible `kubectl`, create this local partial container specification:

```yaml
securityContext:
  allowPrivilegeEscalation: false
  runAsNonRoot: true
  seccompProfile:
    type: RuntimeDefault
  capabilities:
    drop:
      - ALL
    add:
      - NET_RAW
```

Save it as `pcap-profile.yaml` in a protected incident directory. If your version does not support `--custom`, use a preapproved static profile only after reviewing it. The built-in `netadmin` profile intentionally grants network-administrator privileges and is broader than a capture that needs only `NET_RAW`; `sysadmin` is not an appropriate shortcut.

## Add the debug container deliberately

Use an explicit, digest-pinned image and a unique container name:

```bash
DEBUG_IMAGE='registry.example.com/operations/net-debug@sha256:REPLACE_WITH_APPROVED_DIGEST'

kubectl debug -n "$NS" "$POD" \
  --container=net-debug \
  --image="$DEBUG_IMAGE" \
  --profile=baseline \
  --custom=pcap-profile.yaml \
  -- sleep 900
```

Replace the placeholder with the approved digest before running it. `baseline` avoids the `SYS_PTRACE` capability that the `general` ephemeral-container profile can add; the custom profile then grants only `NET_RAW`. Packet capture needs the shared network namespace, not `--target=istio-proxy`, so the command does not request process-namespace targeting. Do not add `-t`: a pseudo-terminal is unnecessary and can corrupt binary data if you later stream a pcap over standard output. Admission may reject the added capability or image. That is a security control working as configured, not a reason to retry with a privileged profile.

Inspect what Kubernetes actually admitted:

```bash
kubectl get pod -n "$NS" "$POD" \
  -o jsonpath='{range .spec.ephemeralContainers[*]}{.name}{"\t"}{.image}{"\t"}{.securityContext}{"\n"}{end}'

kubectl get pod -n "$NS" "$POD" \
  -o jsonpath='{range .status.ephemeralContainerStatuses[*]}{.name}{"\t"}{.state}{"\n"}{end}'
```

Use an image whose declared non-root user can run `tcpdump` with the admitted capability; otherwise `runAsNonRoot` will correctly prevent it from starting. Do not change the whole Pod to root. Also verify the intended interface view before capturing:

```bash
kubectl exec -n "$NS" "$POD" -c net-debug -- ip -brief address
kubectl exec -n "$NS" "$POD" -c net-debug -- ip route
```

The interface names can differ by runtime and CNI. `any` is useful when traffic may traverse both loopback and the Pod interface, although captures from Linux's `any` device use a cooked link-layer format and can show the same logical exchange at more than one observation point.

## Stream a bounded trace to the workstation

For a suspected connection from this Envoy to endpoint `10.42.7.19:8080`, a defensible first capture is:

```bash
CAPTURE=checkout-to-ledger-20260905T1420Z.pcap
umask 077

kubectl exec -n "$NS" "$POD" -c net-debug -- \
  tcpdump -i any -p -nn -U -s 192 -c 2000 \
  'host 10.42.7.19 and tcp port 8080' -w - > "$CAPTURE"
```

This command:

- avoids DNS and service-name lookups with `-nn`;
- disables promiscuous mode with `-p`;
- flushes packets promptly with `-U`;
- limits each captured packet to 192 bytes with `-s 192`;
- stops after 2,000 packets with `-c 2000`; and
- writes through `kubectl exec` to a permission-restricted local file instead of filling the Pod filesystem.

Use a smaller packet count when possible. Increase the snapshot length only if headers are truncated and the data-handling approval permits payload capture. `-s 0` captures entire packets and can collect secrets; it should be an explicit exception, not the default.

Generate only the minimum known-safe test traffic while the command runs. If waiting for an intermittent event, wrap the local command with your platform's bounded timeout and keep the packet-count limit. Do not leave an unattended capture attached to a production Pod.

For inbound sidecar traffic, filter on the original application port and known caller address. For outbound traffic, filtering on the selected endpoint IP and service port usually isolates Envoy's wire-side connection better than capturing only Istio's redirect port. Ports such as `15001` and `15006` describe common sidecar interception listeners, but traffic capture details can change with Istio mode, annotations, CNI, and version. Read the actual listener and interception configuration first.

If the failure could occur on either side of the network, take short, time-synchronized captures in the caller and destination Pods. A SYN visible at the caller but absent at the destination narrows the missing segment; a RST visible leaving the destination identifies a different class of fault. Avoid assuming the side that logged a reset also generated the packet.

## Validate and inspect without exposing payloads

First verify that the local file is a readable capture and record a checksum:

```bash
file "$CAPTURE"
sha256sum "$CAPTURE"
tcpdump -nn -tttt -r "$CAPTURE" -c 30
```

On macOS, use `shasum -a 256` if `sha256sum` is unavailable. Inspect packet metadata in an approved environment. Focus initially on sequence and timing:

- Repeated SYNs without SYN-ACK point toward reachability, policy, routing, or a silent listener problem.
- An immediate RST means a peer or intermediate device actively refused or reset the connection; compare both captures before attributing it.
- A completed three-way handshake followed by a TLS alert shifts the investigation toward protocol, SNI, certificates, or trust.
- Long gaps and retransmissions can indicate loss or an MTU problem, but a capture at one endpoint cannot locate the dropping device.
- A clean FIN exchange is an orderly close, not automatically an error.

mTLS keeps application content encrypted on the wire. Do not attempt to extract proxy private keys or disable mTLS to make the pcap readable. Envoy access logs and metrics should provide the Layer 7 evidence while the trace answers Layer 3 through Layer 5 questions.

## Stop, retain, and clean up responsibly

The capture process stops at the packet limit, and the debug container's bounded `sleep` exits after 15 minutes. Choose a shorter duration before creating it if the incident window permits. Do not assume PID 1 belongs to the debug container: a Pod with shared process namespace, or a deliberately targeted debug session, can expose another namespace's PID 1. If an approved operations tool must stop the container sooner, identify its exact runtime process through that tool instead of guessing a PID.

Confirm the debug container has terminated. An ephemeral container cannot be removed or restarted, so do not try to patch it away. Allow the workload controller to replace the Pod during its normal lifecycle, or coordinate a rollout only if the service owner decides the persistent debug-container entry is unacceptable. Deleting a healthy production Pod solely for cosmetic cleanup can cause a needless outage.

Store the pcap as sensitive incident evidence, with restricted access, a checksum, an owner, and an expiry. Delete local profile and capture files according to that expiry. Document the Pod UID, image digest, filter, time range, snapshot length, packet limit, and who authorized the operation so another engineer can interpret the trace correctly.

If admission will not allow the required capability, alternatives have different scopes. A copied debug Pod does not preserve the live connection. A node-level capture sees more tenants and usually needs greater privilege. CNI flow logs, eBPF observability, or Envoy connection metrics may answer the question with less data. Choose the least invasive source that can test the hypothesis.

## Conclusion

An ephemeral container makes a distroless Envoy Pod observable without restarting it, but it is not a harmless shell attachment. Use least-privilege capture capability, a vetted digest-pinned image, a precise five-tuple filter, and hard size and duration bounds. Stream the trace to protected storage, correlate packets with Envoy's logs and configuration, and stop once the packet-level question is answered.

## Official Documentation

- [Kubernetes: Ephemeral containers](https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/)
- [Kubernetes: Debugging a running Pod](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Kubernetes: kubectl debug reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/)
- [Kubernetes: Using RBAC authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes: Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Kubernetes: Linux kernel security constraints for Pods and containers](https://kubernetes.io/docs/concepts/security/linux-kernel-security-constraints/)
- [Istio: Harden Docker container images](https://istio.io/latest/docs/ops/configuration/security/harden-docker-images/)
- [Istio: Debugging Envoy and Istiod](https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/)
- [Envoy: Access logging](https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage)
