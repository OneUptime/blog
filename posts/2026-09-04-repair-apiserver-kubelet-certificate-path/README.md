# Repair API Server-to-Kubelet Certificates When `logs` and `exec` Fail

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Kubelet, Certificate, TLS, API Server, Networking, Troubleshooting

Description: Trace logs and exec from kube-apiserver to kubelet port 10250, then repair address selection, server trust, client identity, authorization, and streaming behavior.

---

`kubectl get pods` reads objects from kube-apiserver. `kubectl logs`, `exec`, `attach`, and `port-forward` add another hop: kube-apiserver selects an address from the Node object and connects to the kubelet's HTTPS endpoint, normally TCP 10250. The kubelet presents a serving certificate; kube-apiserver verifies it only when `--kubelet-certificate-authority` is configured. That flag is unset by default, which leaves this hop without authenticated server identity. kube-apiserver authenticates itself with a separate kubelet-client certificate.

That is why ordinary reads can work while every node subresource fails. Diagnose the two hops separately and do not disable TLS verification as a permanent fix.

## Preserve the Exact Failure Layer

Test authorization first:

```bash
kubectl auth can-i get pods --subresource=log -n payments
kubectl auth can-i create pods --subresource=exec -n payments
```

Then capture a request with a per-request timeout using a Pod whose logs contain no secrets. `--tail=10` limits lines, not sensitive content, and verbose output can expose request and response details:

```bash
kubectl --request-timeout=15s --v=8 \
  -n payments logs checkout-0 --tail=10
kubectl --request-timeout=15s --v=8 \
  -n payments exec checkout-0 -- true
```

Classify the error:

- a Kubernetes `Forbidden` mentioning `pods/log` or `pods/exec` is usually the user's RBAC at kube-apiserver;
- `dial tcp`, timeout, or connection refused points to address, route, firewall, or kubelet listener;
- `x509: certificate signed by unknown authority` points to the kubelet serving CA;
- an x509 hostname or IP mismatch means kube-apiserver selected an address absent from the serving certificate SANs;
- `401` or `403` returned by kubelet points to kube-apiserver's client identity or kubelet authorization; and
- upgrade, WebSocket, or stream errors after the backend connects can indicate protocol handling, proxying, or version compatibility.

Record the Pod's node. If only some nodes fail, focus on those kubelets and certificates rather than changing the whole API server.

## Trace the Node Address kube-apiserver Chooses

Inspect Node addresses and the effective kube-apiserver preference order:

```bash
node_name="$(kubectl -n payments get pod checkout-0 \
  -o jsonpath='{.spec.nodeName}')"
kubectl get node "$node_name" -o json |
  jq '.status.addresses'
```

On every kubeadm-style control-plane replica, inspect the static Pod manifest and confirm it matches the running arguments. For other deployments, inspect their kube-apiserver process or workload configuration:

```bash
sudo grep -n -- '--kubelet-' \
  /etc/kubernetes/manifests/kube-apiserver.yaml
```

Relevant flags are:

```text
--kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
--kubelet-certificate-authority=/etc/kubernetes/pki/kubelet-ca.crt
--kubelet-client-certificate=/etc/kubernetes/pki/apiserver-kubelet-client.crt
--kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client.key
```

The ordering is deployment-specific; use the actual running arguments. The first address matching the preference order must resolve or route from every kube-apiserver, and that DNS name or IP must match a SAN in that node's kubelet serving certificate. Address selection does not test reachability or fall back after a connection failure. Kubeadm commonly chooses an InternalIP-first order to avoid unresolvable hostnames.

Fix incorrect Node address registration or preference rather than adding arbitrary SANs. An ExternalIP-first setting can unnecessarily send control-plane traffic over a public path.

## Test TCP and the Serving Certificate From the Control Plane

Kubernetes documents 10250/TCP as the kubelet API port used by the control plane. From the kube-apiserver host or equivalent network namespace:

```bash
nc -vz -w 3 10.20.30.41 10250
openssl s_client -connect 10.20.30.41:10250 \
  -CAfile /etc/kubernetes/pki/kubelet-ca.crt \
  -verify_ip 10.20.30.41 -verify_return_error </dev/null
```

Use the address kube-apiserver actually selected. For DNS selection, use `-servername` and `-verify_hostname` instead. Inspect the leaf certificate:

```bash
openssl s_client -connect 10.20.30.41:10250 \
  -servername worker-1.internal </dev/null 2>/dev/null |
  openssl x509 -noout -subject -issuer -dates \
    -ext subjectAltName,extendedKeyUsage
```

These commands expose certificates, not private keys, but still reveal internal names. Protect the output. A successful test from a normal Pod is not equivalent: kube-apiserver may use host networking, different DNS, a Konnectivity tunnel, or an egress selector.

If TCP fails, verify the kubelet listens on the expected address/port, host firewall and cloud rules allow control-plane sources, routes are symmetric, and any Konnectivity agents and server are healthy. Do not expose 10250 publicly to solve an internal path problem.

## Repair Kubelet Serving Certificates

If kubelets use self-signed serving certificates, kube-apiserver cannot securely verify a common CA. Enable the version-supported kubelet serving-certificate bootstrap flow through KubeletConfiguration:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
serverTLSBootstrap: true
rotateCertificates: true
```

`serverTLSBootstrap` makes the kubelet request a signed serving certificate and requires the `RotateKubeletServerCertificate` feature to be enabled. For an existing kubeadm cluster, update both the `kubelet-config` ConfigMap and each node's `/var/lib/kubelet/config.yaml`, then restart the kubelet. A configured serving-certificate signer must issue approved requests. `rotateCertificates` controls rotation of the kubelet's client identity and is a separate setting; retain it according to the cluster's client bootstrap design rather than treating it as the server-trust fix.

After the kubelet submits a request, inspect every CSR before approval:

```bash
kubectl get csr
kubectl get csr <csr-name> -o yaml
kubectl get csr <csr-name> \
  -o jsonpath='{.spec.request}' |
  base64 --decode |
  openssl req -noout -subject -text
```

For the `kubernetes.io/kubelet-serving` signer, verify the requestor is the expected `system:node:<node-name>`, the node exists, and requested DNS/IP SANs belong to that node. The default controller does not automatically approve kubelet serving CSRs. Approve only after out-of-band node identity verification:

```bash
kubectl certificate approve <verified-csr-name>
```

Never bulk-approve pending serving CSRs by name pattern alone. A compromised kubelet client identity could otherwise request a certificate for another node's address. Automatic approvers must validate ownership of every requested SAN using a trusted inventory.

Confirm the kubelet installed the issued certificate, restarted or reloaded it as supported, and now serves the chain trusted by `--kubelet-certificate-authority`. Rotation must be monitored because future serving CSRs may also require approval.

## Verify kube-apiserver's Kubelet Client Identity

The opposite side of mutual authentication is the certificate kube-apiserver presents to kubelet. On each control-plane replica:

```bash
sudo openssl x509 \
  -in /etc/kubernetes/pki/apiserver-kubelet-client.crt \
  -noout -subject -issuer -dates -fingerprint -sha256 \
  -ext extendedKeyUsage
```

It must be within its validity window, include client authentication usage, match the configured private key, and chain to a CA trusted by the kubelet's X.509 authentication configuration. Check key matching without exposing key material by comparing public-key digests through an approved procedure.

For kubeadm-managed PKI, `kubeadm certs check-expiration` can inventory managed certificates. Renew with the kubeadm binary and configuration appropriate to the installed cluster version, then restart kube-apiserver replicas one at a time so they load the new files. Copying a certificate without its matching key or failing to restart can leave replicas inconsistent.

## Check Kubelet Authentication and Authorization

The recommended kubelet posture disables anonymous authentication, trusts a client CA, enables token webhook if required, and uses webhook authorization. Inspect the KubeletConfiguration file on an affected kubeadm node, including nested values. Check the kubelet's running arguments and any configuration drop-ins for overrides:

```bash
sudo cat /var/lib/kubelet/config.yaml
```

The user encoded in kube-apiserver's client certificate must be authorized for the relevant node subresources. Current Kubernetes documents `nodes/proxy`, `nodes/log`, `nodes/stats`, `nodes/metrics`, and related fine-grained attributes. Be cautious: `nodes/proxy` is powerful and can authorize command execution through kubelet; do not grant it broadly to end users.

Inspect kubelet logs while reproducing:

```bash
sudo journalctl -u kubelet --since '-10 min' --no-pager
```

TLS errors before an HTTP request will appear differently from webhook authorization denials. Also verify that the kubelet can reach kube-apiserver for TokenReview and SubjectAccessReview when those modes are enabled.

## Handle Stream-Specific Failures

If `logs --tail=10` succeeds but `logs -f`, `exec`, or `port-forward` fails, the basic kubelet certificate path may be healthy. Inspect long-lived stream behavior:

- API load-balancer support for WebSocket or the negotiated streaming protocol;
- idle, tunnel, and request timeouts;
- Konnectivity stream stability;
- version skew between kubectl, kube-apiserver, and kubelet; and
- streaming timeout settings in the container runtime; kubelet `streamingConnectionIdleTimeout` is deprecated and no longer has any effect.

The client connects to kube-apiserver, not directly to the node. Opening worker-node 10250 to user networks does not repair a protocol upgrade and weakens security.

## Verify Across the Matrix

After repair, test a non-sensitive Pod on every node pool through every API-server replica or the normal load-balanced endpoint:

```bash
kubectl -n diagnostics logs tls-path-test --tail=1
kubectl -n diagnostics exec tls-path-test -- true
kubectl -n diagnostics port-forward tls-path-test 18080:8080
```

Confirm certificate expiry monitoring, pending serving CSR alerts, kubelet authentication failures, port-10250 reachability, and streaming error rates. Re-run tests after node replacement and certificate rotation, not only after the immediate fix.

## Conclusion

When GET works but logs and exec fail, follow the extra hop. Verify user RBAC, Node address selection, control-plane routing to 10250, kubelet server identity, kube-apiserver client identity, and kubelet authorization in that order. Signed, correctly scoped serving certificates are the lasting repair; insecure verification and public kubelet exposure are not.

## Official Documentation

- [Kubernetes Control Plane to Node Communication](https://kubernetes.io/docs/concepts/architecture/control-plane-node-communication/)
- [Kubernetes Kubelet Authentication and Authorization](https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/)
- [Kubernetes PKI Certificates and Requirements](https://kubernetes.io/docs/setup/best-practices/certificates/)
- [Kubernetes Certificate Management with kubeadm](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/)
- [Kubernetes Ports and Protocols](https://kubernetes.io/docs/reference/networking/ports-and-protocols/)
- [Kubernetes kube-apiserver Options](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/)
