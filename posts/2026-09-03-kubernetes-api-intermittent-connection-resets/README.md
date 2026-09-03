# Kubernetes API Connections Reset Intermittently: Find Socket Saturation, Restarts, and Broken Load-Balancer Health Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes API Server, Connection Reset, Socket, Networking, Load Balancer, Kubernetes Monitoring, Troubleshooting

Description: Localize intermittent Kubernetes API connection resets across clients, load balancers, host sockets, and kube-apiserver replicas using correlated evidence.

---

“Connection reset” describes a transport event, not a Kubernetes API reason. A TCP reset can come from the client host, firewall, NAT gateway, load balancer, control-plane kernel, or kube-apiserver process disappearing. API overload more commonly produces latency, HTTP `429`, or `5xx`; it causes resets indirectly when resource exhaustion crashes a process or overwhelms a network layer.

The fastest diagnosis is to timestamp failures, split the path into hops, and identify whether resets correlate with one replica, restarts, socket pressure, or load-balancer policy.

## Preserve the Exact Failure Shape

For each occurrence, record:

- UTC timestamp and client source network;
- shared API hostname and resolved addresses;
- operation, verb, resource, and whether it was a long-running watch;
- whether failure occurred during DNS, TCP connect, TLS handshake, or an established request;
- the exact message: reset, EOF, timeout, TLS alert, HTTP status, or watch closure; and
- request/audit identifiers available in client, proxy, or API server logs.

Use bounded client verbosity on a non-secret read:

```bash
date -u
kubectl --v=8 get --raw='/version'
kubectl --request-timeout=10s get namespace default
```

Sanitize output before sharing it. Do not print raw kubeconfig credentials. A watch ending and reconnecting occasionally is normal; Kubernetes clients are expected to resume from the last observed `resourceVersion` or relist when necessary. A synchronized spike across clients or repeated failures before useful responses is an incident.

## Split Shared Endpoint from Individual Replicas

Probe the load-balancer address, then every API server directly with the same CA and identity. Preserve hostname verification by using a DNS name in each serving certificate or a tool's address-resolution override:

```bash
curl --fail --silent --show-error \
  --resolve api-1.example.net:6443:10.0.0.11 \
  --cacert /secure/cluster-ca.crt \
  --cert /secure/diagnostic.crt \
  --key /secure/diagnostic.key \
  https://api-1.example.net:6443/readyz
```

Use a narrowly authorized diagnostic credential, not a copied cluster-admin identity. Repeat enough fresh connections to sample every backend and compare timestamps:

- one direct backend fails: inspect that host and kube-apiserver instance;
- all direct backends pass while the shared address fails: focus on load balancer, firewall, NAT, and DNS paths;
- all backends fail together: investigate shared dependencies, load, or a coordinated rollout; and
- only long watches fail at a consistent age: inspect idle/session timeouts and graceful connection handling.

## Correlate Resets with Process Restarts

On kubeadm control-plane nodes, query the CRI rather than relying only on mirror Pod status:

```bash
CRI_ENDPOINT=unix:///run/containerd/containerd.sock
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" ps -a \
  --name kube-apiserver
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" inspect \
  <container-id>
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" logs \
  --tail=300 <container-id>
sudo journalctl -u kubelet --since '-30 min' --no-pager
sudo journalctl -k --since '-30 min' --no-pager
```

Use the node's actual CRI endpoint. Look for matching container start times, exit codes, OOM kills, probe-driven restarts, manifest changes, runtime restarts, and host reboots. If the process vanished at the same instant as client resets, diagnose why it restarted before tuning the network.

Kube-apiserver `/readyz` should fail before an orderly shutdown when graceful shutdown is configured, allowing a readiness-aware load balancer to withdraw the backend. A hard crash cannot provide that warning, so adequate replica count and fast health detection still matter.

## Measure Socket and Host Pressure

Take read-only snapshots on the load balancer and each affected control-plane node during the event:

```bash
ss -s
sudo ss -lntp 'sport = :6443'
sudo ss -ant state established 'sport = :6443' | wc -l
sudo ss -ant state time-wait | wc -l
nstat -az | grep -E \
  'ListenOverflows|ListenDrops|TCPAbort|TCPBacklogDrop|RetransSegs'
```

Inspect the running kube-apiserver process's `/proc/<pid>/limits` and open file-descriptor count, plus system-wide file usage and limits. Where conntrack is enabled, compare current entries with its configured maximum. Also check CPU, memory, disk latency, NIC errors, packet drops, and runtime pressure.

A high connection count alone is not proof of exhaustion: watches intentionally remain open. Evidence is a limit being approached together with listen drops, allocation failures, latency, rejected connections, OOM, or matching reset timestamps. Do not raise file-descriptor, backlog, conntrack, or connection limits blindly; a leak or list-watch storm can simply consume the larger limit later.

## Use API Metrics to Explain Load

Kubernetes documents stable kube-apiserver metrics including:

- `apiserver_current_inflight_requests` for recent use of inflight request capacity;
- `apiserver_longrunning_requests` for active long-running requests such as watches;
- `apiserver_request_total` by verb, resource, and response code; and
- `apiserver_request_duration_seconds` and `apiserver_response_sizes`.

Graph them per replica alongside container CPU/memory, restart timestamps, ready backend count, load-balancer connections, and kernel counters. API Priority and Fairness can queue or reject excess work with HTTP 429. A rise in 429 responses demonstrates overload control; it does not itself demonstrate TCP resets. Look for the downstream resource event that connects the two.

Reduce avoidable demand at its source: use shared informers, narrow selectors, pagination where appropriate, bounded client concurrency, backoff with jitter, and sane watch reconnection. Preserve priority for control-plane-critical flows rather than disabling API Priority and Fairness.

## Audit Load-Balancer Behavior

Check the product's logs and backend-state history for the same timestamps. Validate that:

- probes contact each backend directly and require exact HTTP `200` from `/readyz`;
- backend TLS is verified and SNI selects the intended certificate;
- a TCP-open or `/livez` response is not treated as application readiness;
- failure and recovery thresholds do not flap backends;
- client/server, tunnel, and idle timeouts accommodate Kubernetes watches;
- maximum connections and queues are sized and observable; and
- maintenance removal drains established connections according to documented behavior instead of resetting them.

HAProxy's official guidance distinguishes active health checks, connection limits/queues, retries, and long-lived tunnel timeouts. Translate the principles to the exact load-balancer version in use. Retrying a failed connection can mask a brief fault for idempotent reads, but a proxy must not replay arbitrary mutating requests whose outcome is unknown.

## Locate the Device That Sent the Reset

If logs remain ambiguous, capture packets simultaneously at an authorized client, load balancer, and backend with narrow host/port filters. TLS protects application content, but captures still contain sensitive topology and traffic metadata; handle them as incident data. Compare TCP sequence and reset timing to identify the first hop that emitted or synthesized the RST.

Also test MTU, asymmetric routing, firewall session capacity, NAT port allocation, and NIC errors when evidence points between hosts. Avoid changing several timeouts and kernel tunables at once—you lose the causal signal.

After the repair, repeat short requests and watches through both direct and shared paths, verify stable `/readyz`, and confirm restart, reset, listen-drop, and 429 rates remain normal through a representative load period.

## Conclusion

Intermittent API resets require transport evidence. Separate each replica from the shared endpoint, correlate failures with process lifetime and socket limits, then audit readiness checks, draining, and long-lived connection policy. Use API metrics to explain load without mistaking HTTP overload responses for TCP resets, and change only the layer the evidence identifies.

## Official References

- [Kubernetes: API Health Endpoints](https://kubernetes.io/docs/reference/using-api/health-checks/)
- [Kubernetes: Metrics Reference](https://kubernetes.io/docs/reference/instrumentation/metrics/)
- [Kubernetes: API Priority and Fairness](https://kubernetes.io/docs/concepts/cluster-administration/flow-control/)
- [Kubernetes: API Concepts and Watches](https://kubernetes.io/docs/reference/using-api/api-concepts/)
- [Kubernetes: Debugging Nodes with crictl](https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/)
- [HAProxy: Health Checks](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/)
- [HAProxy: Overload Protection](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/performance/overload-protection/)
