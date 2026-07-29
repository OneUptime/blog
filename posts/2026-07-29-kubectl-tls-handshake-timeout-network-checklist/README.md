# Why Does `kubectl` Fail with `TLS handshake timeout`? A Network-Path Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, TLS Handshake, Network Troubleshooting, kubeconfig, API Server

Description: Trace kubectl TLS handshake timeouts across context, DNS, VPN, proxy, firewall, load balancer, MTU, and API server health without disabling verification.

---

`kubectl` communicates with the Kubernetes API server over HTTPS. A `TLS handshake timeout` means it did not complete the TLS negotiation within the transport's allowed handshake time.

This usually places the failure after endpoint selection and during the path to a usable secure connection, before normal Kubernetes API authentication, authorization, or resource handling completes.

It does not by itself prove that a certificate is invalid. Expired, untrusted, or hostname-mismatched certificates normally produce explicit `x509` verification errors after the peer presents a certificate. A handshake timeout more often points to a stalled path, proxy, load balancer, TLS endpoint, or overloaded control plane.

## 1. Confirm the Context and API Endpoint

Start by proving which cluster `kubectl` selected:

```bash
kubectl config current-context
kubectl config get-contexts
kubectl config view --minify \
  -o jsonpath='{.clusters[0].cluster.server}{"\n"}'
```

If scripts set `KUBECONFIG` or pass `--kubeconfig`, the effective configuration may differ from the default file. Kubernetes documents that multiple files in `KUBECONFIG` are merged, while `--kubeconfig` selects one explicit file.

Check the environment and the selected cluster's TLS and proxy settings locally:

```bash
printf 'KUBECONFIG=%s\n' "${KUBECONFIG:-<default>}"
kubectl config view --minify \
  -o jsonpath='{.clusters[0].cluster.tls-server-name}{"\n"}'
kubectl config view --minify \
  -o jsonpath='{.clusters[0].cluster.proxy-url}{"\n"}'
```

Proxy environment variables and `proxy-url` can themselves contain credentials. Redact user information before sharing their values.

Do not paste the output of `kubectl config view --raw` into tickets. Kubeconfig files can contain bearer tokens, client keys, and other credentials.

An old context may point to a decommissioned load balancer, a private endpoint, an address reachable only on a VPN, or the wrong port.

## 2. Separate DNS, TCP, and TLS

Extract the hostname and port from the displayed server URL, then test each layer with platform-appropriate tools. If kubeconfig sets `tls-server-name`, use that name for SNI and certificate validation; otherwise, use the server URL's hostname.

DNS:

```bash
dig +short api.cluster.example.com
```

TCP:

```bash
nc -vz api.cluster.example.com 6443
```

TLS with Server Name Indication:

```bash
openssl s_client \
  -connect api.cluster.example.com:6443 \
  -servername api.cluster.example.com \
  -brief
```

This is a handshake-response probe, not proof that kubectl's certificate verification will succeed. `-servername` sends SNI, but it does not make OpenSSL use the kubeconfig CA or enable hostname verification. Also, `s_client` normally continues after certificate verification errors unless `-verify_return_error` is used.

Interpret the first failing boundary:

- no DNS answer: resolver, split-horizon DNS, stale kubeconfig, or VPN DNS;
- DNS works but TCP does not: route, firewall, security group, VPN, endpoint, or listener;
- TCP connects but TLS stalls: proxy, load balancer, packet loss, MTU, TLS termination, or server overload;
- TLS responds but OpenSSL reports a certificate verification error: validate with the kubeconfig CA and expected server name, because OpenSSL's trust store may differ;
- TLS succeeds but Kubernetes rejects the call: authentication or authorization is now in scope.

`ping` is not decisive. An endpoint can drop ICMP while serving TCP, or answer ICMP while the API port is blocked.

## 3. Check VPN and Private-Endpoint Reachability

The official Kubernetes troubleshooting guide specifically calls out VPN connectivity. For a private API endpoint, verify:

- the VPN or private link is active;
- the selected route covers the endpoint subnet;
- split DNS resolves to the expected private address;
- local and corporate routes do not overlap;
- the client network permits the API port;
- return traffic follows a valid path.

Compare from:

- the failing workstation;
- another workstation on the same network;
- a host inside the cluster network;
- a different network, if policy permits.

If only one path fails, focus on local VPN, proxy, DNS, endpoint security, and network policy outside Kubernetes. If every path fails, inspect the API endpoint and control plane.

## 4. Audit Proxies

Go's default HTTP transport uses `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY`, and kubeconfig can also specify a per-cluster `proxy-url`.

Inspect the environment:

```bash
env | grep -iE '^(http|https|no)_proxy='
```

Common failures include:

- the API hostname or literal IP missing from `NO_PROXY`;
- a corporate proxy that cannot reach a private address;
- an intercepting proxy waiting on policy inspection;
- a kubeconfig `proxy-url` left from another environment;
- different proxy environments in a terminal, IDE, and CI runner.

Test both the intended proxied path and a policy-approved direct path. Do not globally disable the corporate proxy to make one command work; correct the narrow routing rule.

## 5. Inspect Firewalls and Load Balancers

Confirm each hop permits bidirectional traffic:

```text
workstation
  -> local firewall
  -> VPN or office egress
  -> cloud firewall or security group
  -> API load balancer
  -> kube-apiserver backend
```

A successful TCP handshake only proves that something accepted a connection. A firewall, proxy, or unhealthy load-balancer backend can accept TCP and then fail to relay enough TLS data.

For a self-managed control plane, check:

- listener port and protocol mode;
- healthy backend count;
- backend TLS pass-through versus TLS termination;
- idle, connect, and handshake timers;
- connection and file-descriptor limits;
- packet drops and resets;
- whether every advertised control-plane address is healthy.

Repeat the TLS probe several times. Intermittent success can indicate one bad load-balancer backend, one unreachable address returned by DNS, or packet loss rather than a universal certificate problem.

## 6. Consider MTU and Packet Loss

TCP setup uses small packets. A TLS handshake carries certificates and can use larger packets. A path-MTU or fragmentation problem can therefore allow `nc` to connect while TLS stalls.

Clues include:

- failure only through a VPN or tunnel;
- small HTTPS exchanges work but certificate-heavy handshakes fail;
- packet captures show retransmissions;
- reducing the tunnel interface MTU in a controlled test changes the result;
- one network succeeds while another consistently times out.

Use packet capture and network-team evidence before changing MTU. The correct value depends on tunnel overhead and the complete path.

Packet loss or severe latency can produce the same symptom. Check retransmissions on both sides and network-device counters.

## 7. Check API Server and Control-Plane Health

Once TLS and authentication work from any trusted location, Kubernetes exposes:

- `/livez` for liveness;
- `/readyz` for readiness to accept traffic.

From a working authenticated `kubectl` path:

```bash
kubectl get --raw='/livez?verbose'
kubectl get --raw='/readyz?verbose'
```

Kubernetes deprecates the older `/healthz` endpoint in favor of these specific endpoints. Machines should rely on their HTTP status codes; verbose output is intended for human diagnosis.

If no external path completes TLS, check locally on a self-managed control-plane node using the cluster's approved certificates and tools. Inspect:

- kube-apiserver CPU, memory, goroutines, and file descriptors;
- current and rejected connections;
- audit or authentication webhook latency;
- etcd health and request latency;
- load-balancer health checks;
- recent certificate rotation or control-plane deployment;
- logs at the time the first timeout appeared.

An overloaded API server or TLS terminator can accept connections too slowly to finish negotiation.

For managed Kubernetes, use the provider's control-plane status, endpoint health, and support diagnostics rather than assuming node access implies control-plane health.

## 8. Validate Certificates After the TLS Endpoint Responds

The Kubernetes troubleshooting guide shows how to inspect certificate dates embedded in kubeconfig:

```bash
kubectl config view --minify --flatten \
  -o jsonpath='{.clusters[0].cluster.certificate-authority-data}' \
  | base64 -d \
  | openssl x509 -noout -subject -issuer -dates

kubectl config view --minify --flatten \
  -o jsonpath='{.users[0].user.client-certificate-data}' \
  | base64 -d \
  | openssl x509 -noout -subject -issuer -dates
```

Some kubeconfigs use external files, tokens, or exec credential plugins instead of embedded client certificates. The absence of `client-certificate-data` is not automatically an error.

Do not solve certificate problems with `--insecure-skip-tls-verify`. That disables server identity verification and introduces a man-in-the-middle risk. Correct the CA, hostname, certificate rotation, or kubeconfig reference.

## 9. Use kubectl Verbosity Carefully

Client detail can show which URL, proxy, and phase is failing:

```bash
kubectl -v=8 --request-timeout=15s get --raw='/version'
```

Treat verbose logs as sensitive operational data. Review them before sharing because URLs, resource names, and environment details may be present.

`--request-timeout` limits how long `kubectl` waits for a single server request. Kubernetes documents zero as no request timeout. Raising it can make a slow request wait longer, but it does not repair a blocked TLS path and should not be the first response to a handshake timeout.

The error text comes from Go's HTTP transport. Go's current `DefaultTransport` configures a TLS handshake timeout, but Kubernetes client construction and versions can influence transport behavior. Do not infer an exact universal `kubectl` threshold from the message alone.

## A Fast Isolation Matrix

| Test result | Focus next |
| --- | --- |
| Wrong server URL | kubeconfig source and current context |
| DNS differs by network | VPN, split DNS, stale records |
| TCP port closed | route, firewall, listener, security group |
| TCP works, TLS stalls everywhere | load balancer, TLS endpoint, API server load |
| TCP works, TLS stalls only on VPN | proxy, MTU, packet loss, tunnel routing |
| TLS succeeds with OpenSSL, kubectl fails | proxy environment, kubeconfig CA, credential helper, client version |
| Certificate verification fails | CA, SAN, expiry, rotation |
| TLS and auth work, `/readyz` fails | API server dependency or etcd readiness |
| One attempt in several fails | DNS address set or unhealthy load-balancer backend |

## Incident Checklist

1. Record the current context and server URL.
2. Confirm the expected kubeconfig source.
3. Resolve every endpoint address.
4. Test TCP and TLS separately with correct SNI.
5. Compare VPN, office, CI, and in-network paths.
6. Audit environment and kubeconfig proxy settings.
7. Check firewalls, load balancer, and every backend.
8. Investigate MTU and packet loss when TCP works but TLS stalls.
9. Check `/livez` and `/readyz` from a working path.
10. Validate certificates without disabling verification.
11. Preserve a timestamped verbose trace and network evidence.

The most useful question is not why kubectl is slow. It is which hop accepted the connection but failed to complete a secure path to the Kubernetes API server.

## Official Documentation

- [Kubernetes troubleshooting kubectl](https://kubernetes.io/docs/tasks/debug/debug-cluster/troubleshoot-kubectl/)
- [Kubernetes kubeconfig organization and proxy-url](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/)
- [Kubernetes API health endpoints](https://kubernetes.io/docs/reference/using-api/health-checks/)
- [kubectl request-timeout flag](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_options/)
- [Go HTTP transport TLSHandshakeTimeout](https://pkg.go.dev/net/http#Transport)
