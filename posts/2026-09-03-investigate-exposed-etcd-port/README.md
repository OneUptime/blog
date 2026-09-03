# How to Investigate an Exposed etcd Port Reported by kube-hunter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes Security, etcd, Network Security

Description: Investigate a reachable etcd client endpoint without reading or writing cluster data, then fix listener, firewall, TLS, and client-certificate boundaries.

---

etcd holds Kubernetes' backing state. Kubernetes security guidance notes that information accessible through the API is generally present in etcd and that etcd access can provide significant visibility. Treat an exposed `2379` finding as high priority, but distinguish network reachability from authenticated database access.

Current kube-hunter discovery labels an open port `2379` as etcd. Its passive hunter then tries version and legacy v2 key endpoints over HTTPS, falling back to HTTP when it receives an insecure version response. Its active hunter can attempt a key write. Do not enable active mode during a production investigation.

## Preserve and Scope the Finding

Record the report's service location, VID, evidence, scanner network, resolved target, time, and kube-hunter commit or image digest. Confirm the address belongs to a control-plane node, load balancer, proxy, or other owned system. Port numbers alone do not identify a process conclusively.

Kubernetes' port reference lists TCP `2379-2380` on control-plane nodes for etcd client and peer traffic. etcd normally separates client URLs from peer URLs. Determine which listener the scanner reached and which sources are supposed to use it.

## Start with Network and TLS Evidence

From the original observation point, perform only a bounded TLS handshake:

~~~bash
ETCD_HOST=192.0.2.50
timeout 5 openssl s_client \
  -connect "${ETCD_HOST}:2379" \
  -servername "$ETCD_HOST" \
  -showcerts </dev/null \
  > tls.txt 2>&1
~~~

A completed handshake does not prove read access. A server can present its certificate before requiring a client certificate. Inspect issuer, subject alternative names, validity, and protocol; do not disable verification in a routine client test.

If plain HTTP was reported, capture only the status and small version response from an isolated authorized host. Do not request `/v2/keys`, `/v3/kv/range`, secrets, registry keys, or a write. Production data access is not needed to establish insecure transport.

## Inspect the Server-Side Configuration

Use the control-plane host or deployment configuration, not remote probing, to verify:

- `listen-client-urls` binds only intended interfaces;
- `advertise-client-urls` publishes the correct client addresses;
- `listen-peer-urls` is not confused with client access;
- client URLs use `https`;
- `client-cert-auth` is enabled;
- `trusted-ca-file`, `cert-file`, and `key-file` point to current protected material;
- peer TLS and peer client-certificate authentication are also configured;
- firewall rules restrict both client and peer paths.

The etcd transport security guide documents these TLS controls. Listener configuration and certificate authentication solve different problems: binding to all interfaces with mutual TLS may still create unnecessary attack surface, while binding privately without client authentication leaves every process on that network trusted.

For kubeadm-managed control planes, inspect the static Pod manifests and kubeadm configuration through the supported workflow. For managed Kubernetes, customers usually cannot access provider etcd; an apparent public etcd endpoint is unexpected and should be escalated with the cloud provider after ownership is confirmed.

## Review Network Paths

Check every layer that could expose the listener:

- node host firewall and routing;
- cloud security groups, network security groups, or VPC firewall rules;
- load balancers and target groups;
- NAT and port-forward rules;
- VPN, peering, transit, and on-premises routes;
- Kubernetes `hostNetwork` Pods or Services unintentionally forwarding the port.

Search for `0.0.0.0/0`, `::/0`, broad corporate CIDRs, and rules shared with worker nodes. Restrict client traffic to API-server/control-plane identities and approved backup or maintenance systems. Restrict peer traffic to etcd members only.

Kubernetes NetworkPolicy does not protect a host-networked static etcd process in the general case. Apply the control at the host and infrastructure network layers.

## Look for Evidence of Use or Abuse

Review etcd, API-server, firewall flow, and identity logs for connections from unexpected sources. Establish the exposure interval from configuration history. If unauthenticated reads or writes may have been possible, involve incident response: etcd can contain Secrets and credentials, and simply closing the port does not invalidate material already obtained.

Rotate affected credentials according to their trust relationships, not indiscriminately. Preserve logs and snapshots as evidence. Do not take an ad hoc snapshot over the exposed endpoint or copy the data directory while etcd is running; use documented backup and incident procedures.

## Remediate and Validate

Fix the infrastructure source of truth and roll control-plane changes according to quorum-safe etcd procedures. Avoid restarting all members together. Validate cluster health and API behavior after each member or managed update.

Then rerun the original passive scan from the same source. The preferred external result is a timeout or refusal because the network path is closed. From an approved client network, verify TLS trust and that a client without an approved certificate cannot perform an etcd operation. Use a dedicated least-privileged health workflow rather than production key reads.

Document before/after firewall rules, listener configuration, certificate-authentication state, and scan output. Add continuous checks so a new load balancer or broad rule cannot silently re-expose `2379` or `2380`.

## Conclusion

Investigate an etcd finding in stages: confirm ownership and reachability, inspect TLS without reading data, verify server configuration, trace every network layer, and search logs for unexpected use. Close unneeded paths and require mutual TLS for legitimate clients. Never use kube-hunter's active etcd write as a casual production confirmation.

## Official References

- [kube-hunter etcd discovery](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/etcd.py)
- [kube-hunter etcd hunters](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/hunting/etcd.py)
- [etcd transport security](https://etcd.io/docs/v3.6/op-guide/security/)
- [etcd configuration options](https://etcd.io/docs/v3.6/op-guide/configuration/)
- [Kubernetes ports and protocols](https://kubernetes.io/docs/reference/networking/ports-and-protocols/)
- [Kubernetes security checklist](https://kubernetes.io/docs/concepts/security/security-checklist/)

