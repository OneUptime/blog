# kube-apiserver Cannot Create the Storage Backend: Trace etcd DNS, Certificates, and Port 2379

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes API Server, etcd, DNS, Certificate, TLS, Networking, Troubleshooting

Description: Diagnose kube-apiserver storage initialization failures from its network namespace through etcd client routing, TLS identity, health, file mounts, and quorum.

---

When kube-apiserver reports that it cannot create or initialize its storage backend, it has failed before it can reliably serve Kubernetes objects. The supported storage backend is etcd3. kube-apiserver must resolve and reach at least one configured etcd client endpoint, verify the etcd serving certificate, present its own valid client certificate and key, and communicate with a healthy quorum.

Port 2379 is normally the etcd **client** API used by kube-apiserver. Port 2380 is for etcd peer traffic. Pointing kube-apiserver at a peer listener, mixing HTTP and HTTPS, or testing from a different network namespace produces misleading failures.

## Preserve the First Storage Error

On a kubeadm-style control plane, kube-apiserver runs as a static Pod. Inspect it through the local runtime because the Kubernetes API may not be available:

```bash
sudo crictl ps -a --name kube-apiserver
sudo crictl logs --tail=300 <container-id>
sudo journalctl -u kubelet --since '-30 min' --no-pager
```

Record the first error after process start, not only later readiness failures. Common classes are:

- `no such host`: resolver, search-domain, or hostname error;
- `connection refused`: wrong address/port, no listener, or a stopped member;
- `i/o timeout` or deadline exceeded: route, firewall, packet loss, overloaded/unhealthy etcd, or wrong network namespace;
- `certificate signed by unknown authority`: wrong `--etcd-cafile` or incomplete server chain;
- x509 hostname/IP mismatch: endpoint identity is absent from the etcd serving certificate SANs;
- `bad certificate` or TLS alert from etcd: invalid kube-apiserver client certificate/key or untrusted client CA; and
- file-not-found or permission errors: wrong path, missing static-Pod mount, or unreadable key.

Do not extend `--storage-initialization-timeout` until connectivity and etcd health are proven. A longer wait hides a deterministic DNS or certificate error.

## Inspect the Effective kube-apiserver Configuration

On every control-plane node, read the managed manifest and its mounted paths:

```bash
sudo grep -n -E \
  -- '--etcd-(servers|cafile|certfile|keyfile)|--storage-(backend|initialization-timeout)' \
  /etc/kubernetes/manifests/kube-apiserver.yaml
sudo grep -n -A6 -B2 '/etc/kubernetes/pki' \
  /etc/kubernetes/manifests/kube-apiserver.yaml
```

Expected structure is similar to:

```text
--storage-backend=etcd3
--etcd-servers=https://etcd-1.example.net:2379,https://etcd-2.example.net:2379,https://etcd-3.example.net:2379
--etcd-cafile=/etc/kubernetes/pki/etcd/ca.crt
--etcd-certfile=/etc/kubernetes/pki/apiserver-etcd-client.crt
--etcd-keyfile=/etc/kubernetes/pki/apiserver-etcd-client.key
```

The exact paths and endpoints are deployment-specific. Confirm the paths exist **inside** the container through its configured mounts, the key is readable only by the intended account, and every API-server replica has the same endpoint set and trust material.

In stacked kubeadm, etcd often listens locally and the API server uses `https://127.0.0.1:2379`. In external-etcd designs, use stable endpoint identities that resolve before Kubernetes DNS exists. Making kube-apiserver depend on an in-cluster DNS service that itself depends on kube-apiserver creates a bootstrap cycle.

## Test DNS in the API Server's Network Context

Run resolver checks on the control-plane host or in the kube-apiserver network namespace:

```bash
getent ahosts etcd-1.example.net
getent ahosts etcd-2.example.net
getent ahosts etcd-3.example.net
```

Compare answers, address families, TTLs, `/etc/hosts`, `/etc/resolv.conf`, and routing on every replica. A Pod DNS lookup does not prove a host-networked static Pod uses the same resolver.

Avoid round-robin DNS that can silently include nonmembers or addresses absent from certificate SANs. A comma-separated set of named endpoints makes failures observable and avoids one DNS record hiding individual member health.

If the name was corrected, restart or roll the affected kube-apiserver through the supported management process so it establishes new connections. Still fix the stable source of truth; repeatedly editing `/etc/hosts` is not a resilient control-plane design.

## Verify Port 2379, Not Only ICMP

From the same context, test every configured client endpoint:

```bash
nc -vz -w 3 etcd-1.example.net 2379
nc -vz -w 3 etcd-2.example.net 2379
nc -vz -w 3 etcd-3.example.net 2379
```

A successful TCP connection proves only that something accepted the socket. A timeout still needs route and firewall analysis. Check:

- etcd `--listen-client-urls` includes the destination address and HTTPS scheme;
- control-plane security groups and host firewalls allow kube-apiserver to 2379;
- return routing is symmetric and MTU works for TLS records;
- a load balancer, if intentionally used, forwards gRPC/HTTP2 correctly and checks real etcd readiness; and
- 2380 remains reserved for authenticated member-to-member traffic.

Do not expose etcd to workload or public networks. Restrict 2379 to authorized control-plane clients and operational hosts.

## Validate the etcd Server Certificate

Use the same CA and endpoint name configured for kube-apiserver:

```bash
sudo openssl s_client \
  -connect etcd-1.example.net:2379 \
  -servername etcd-1.example.net \
  -CAfile /etc/kubernetes/pki/etcd/ca.crt \
  -cert /etc/kubernetes/pki/apiserver-etcd-client.crt \
  -key /etc/kubernetes/pki/apiserver-etcd-client.key \
  -verify_hostname etcd-1.example.net \
  -verify_return_error </dev/null
```

Inspect the served leaf and chain:

```bash
sudo openssl s_client \
  -connect etcd-1.example.net:2379 \
  -servername etcd-1.example.net \
  -CAfile /etc/kubernetes/pki/etcd/ca.crt \
  -cert /etc/kubernetes/pki/apiserver-etcd-client.crt \
  -key /etc/kubernetes/pki/apiserver-etcd-client.key \
  -verify_hostname etcd-1.example.net \
  -verify_return_error </dev/null 2>/dev/null |
  openssl x509 -noout -subject -issuer -dates \
    -ext subjectAltName,extendedKeyUsage
```

Verify the endpoint's DNS name or IP is in the SAN extension, the certificate is within its validity period, the chain terminates at `--etcd-cafile`, and the certificate is valid for server authentication. Modern TLS verification does not treat a legacy Common Name as a replacement for SANs.

If connecting by IP, verify that IP specifically; SNI does not make an IP match a DNS-only SAN. Prefer correcting endpoint identity or reissuing a properly scoped certificate over skipping verification.

## Validate kube-apiserver's Client Certificate and Key

Inspect public certificate properties without printing the private key:

```bash
sudo openssl x509 \
  -in /etc/kubernetes/pki/apiserver-etcd-client.crt \
  -noout -subject -issuer -dates -fingerprint -sha256 \
  -ext extendedKeyUsage
```

The certificate must have client authentication usage, be signed by an authority etcd trusts through `--trusted-ca-file`, be time-valid, and match the configured private key. Compare derived public-key digests through an approved local procedure; never paste a private key or its raw output into tickets.

Kubernetes documents a distinct `kube-apiserver-etcd-client` certificate under the etcd CA. Do not replace it with the public kube-apiserver serving certificate or a front-proxy certificate. Different PKI roles have different trust and compromise boundaries.

Check file ownership, permissions, SELinux/AppArmor denials, static-Pod `hostPath` mounts, and whether a certificate renewal updated all replicas. Renew through the cluster bootstrap tool's version-matched procedure and roll one kube-apiserver at a time.

## Use etcdctl With the Exact Client Identity

Once DNS, TCP, and the server chain pass, test authenticated etcd operations with the same CA, client certificate, key, and endpoints:

```bash
etcd_endpoints='https://etcd-1.example.net:2379,https://etcd-2.example.net:2379,https://etcd-3.example.net:2379'

etcdctl --endpoints="$etcd_endpoints" \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/apiserver-etcd-client.crt \
  --key=/etc/kubernetes/pki/apiserver-etcd-client.key \
  endpoint health --cluster

etcdctl --endpoints="$etcd_endpoints" \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/apiserver-etcd-client.crt \
  --key=/etc/kubernetes/pki/apiserver-etcd-client.key \
  endpoint status --cluster --write-out=table
```

Run this only on an authorized host and avoid shell tracing, which can expose paths or credentials. `endpoint health` commits a proposal, so it validates more than a TCP or TLS handshake. Compare member IDs, leader, Raft term/index, database size, errors, and version.

If one client endpoint fails but quorum is healthy, distinguish a temporary kube-apiserver client configuration change from an etcd membership change. Any approved change to `--etcd-servers` must be applied consistently across API-server replicas while preserving redundant healthy endpoints. Remove or replace an etcd member only through a quorum-safe repair procedure; membership changes can destroy quorum if the cluster is already degraded.

## Check etcd Itself

Inspect member logs and metrics for leader elections, lost peers, slow `wal_fsync`, slow backend commits, quota alarms, corruption alarms, clock problems, and listener errors. etcd consensus write latency is bounded by peer network round-trip and durable disk latency. A reachable but overloaded member can make storage initialization exceed its deadline.

Verify client and peer URLs are not confused:

```text
--listen-client-urls=https://10.0.0.11:2379
--advertise-client-urls=https://etcd-1.example.net:2379
--listen-peer-urls=https://10.0.0.11:2380
--initial-advertise-peer-urls=https://etcd-1.example.net:2380
```

The advertise-client URL must be reachable and certificate-valid for clients that discover or use it. Peer certificates and client-serving certificates may be separate; repair the correct one.

Do not switch a live cluster from plaintext to TLS, rotate all member certificates, or change all advertised URLs simultaneously during an API outage. Follow the etcd version's rolling security procedure with a snapshot and verified quorum.

## Restore and Verify Kubernetes

Once etcd health and credentials pass, roll the failing kube-apiserver replica and inspect:

```bash
kubectl get --raw='/livez?verbose'
kubectl get --raw='/readyz?verbose'
```

`/livez` only proves the process should remain running; `/readyz` includes readiness checks and should report the storage path healthy. Then perform an authorized read and one reversible write in a diagnostic namespace, verify the object is visible through every API-server replica, and remove it through the API.

Monitor kube-apiserver storage request latency and errors, etcd proposal and disk latency, endpoint health, leader changes, and certificate expiry. The repair is complete only when all replicas can initialize independently, including after a controlled restart.

## Conclusion

Storage-backend initialization is a strict chain: effective flags and mounts, DNS, TCP 2379, server identity, client identity, and healthy etcd consensus. Test each link from kube-apiserver's actual network and filesystem context. Preserve mutual TLS and quorum safety; insecure endpoints and ad hoc membership changes turn a startup fault into a security or data-loss incident.

## Official Documentation

- [Kubernetes kube-apiserver Options](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/)
- [Kubernetes PKI Certificates and Requirements](https://kubernetes.io/docs/setup/best-practices/certificates/)
- [Kubernetes Ports and Protocols](https://kubernetes.io/docs/reference/networking/ports-and-protocols/)
- [etcd Transport Security](https://etcd.io/docs/v3.6/op-guide/security/)
- [etcd Configuration Options](https://etcd.io/docs/v3.6/op-guide/configuration/)
- [etcd Monitoring](https://etcd.io/docs/v3.6/op-guide/monitoring/)
- [etcd Performance](https://etcd.io/docs/v3.6/op-guide/performance/)
