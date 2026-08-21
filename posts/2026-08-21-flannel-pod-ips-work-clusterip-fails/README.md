# When Flannel Pod IPs Work but ClusterIP Services Fail

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, Kube-proxy, ClusterIP, Hairpin Mode, Service

Description: Diagnose working Flannel Pod IP connectivity with broken ClusterIP Services by checking EndpointSlices, kube-proxy mode and rules, traffic policies, and bridge hairpin behavior.

---

## Introduction

If a pod can reach a remote Pod IP, Flannel's basic pod data plane is working. A ClusterIP is a virtual address implemented by `kube-proxy` on each node, unless the cluster uses another Service proxy. Flannel does not allocate the Service CIDR or program Service destination NAT.

That boundary is the fastest way to narrow this failure. Validate the Service object and endpoints, test an endpoint directly, inspect the proxy on the client node, and investigate bridge hairpin mode only if the failure is specific to a pod reaching a Service that selects that same pod.

## Build a Three-Step Connectivity Test

Set the Service, namespace, and a client pod:

```bash
NS=default
SERVICE=web
CLIENT=debug-client

kubectl -n "$NS" get service "$SERVICE" -o wide
kubectl -n "$NS" describe service "$SERVICE"
kubectl -n "$NS" get endpointslice \
  -l "kubernetes.io/service-name=${SERVICE}" -o wide
kubectl -n "$NS" get pods -o wide --show-labels
```

Extract one ready endpoint and the Service IP:

```bash
CLUSTER_IP=$(kubectl -n "$NS" get service "$SERVICE" \
  -o jsonpath='{.spec.clusterIP}')
SERVICE_PORT=$(kubectl -n "$NS" get service "$SERVICE" \
  -o jsonpath='{.spec.ports[0].port}')

kubectl -n "$NS" get endpointslice \
  -l "kubernetes.io/service-name=${SERVICE}" -o yaml
```

Then compare:

1. The client reaches a ready endpoint Pod IP and target port.
2. The client reaches the ClusterIP and Service port.
3. The client resolves the Service DNS name.

For an HTTP workload:

```bash
kubectl -n "$NS" exec "$CLIENT" -- \
  wget -S -O- "http://<ready-endpoint-ip>:<target-port>/"

kubectl -n "$NS" exec "$CLIENT" -- \
  wget -S -O- "http://${CLUSTER_IP}:${SERVICE_PORT}/"

kubectl -n "$NS" exec "$CLIENT" -- \
  nslookup "${SERVICE}.${NS}.svc.cluster.local"
```

If the direct endpoint fails, return to CNI routing, NetworkPolicy, application listening address, or port selection. If the endpoint works and only the ClusterIP fails, continue with the Service proxy.

## Validate the Service and EndpointSlices

An empty EndpointSlice is not a networking failure. Check:

- The Service selector exactly matches pod labels.
- Endpoint ports match `targetPort`, including named ports.
- Endpoint conditions show `ready: true`, unless the Service explicitly publishes not-ready addresses.
- Pods pass readiness probes.
- The IP family of the client, Service, and endpoints is supported by the cluster.

Inspect traffic policy too:

```bash
kubectl -n "$NS" get service "$SERVICE" \
  -o jsonpath='{.spec.internalTrafficPolicy}{"\t"}{.spec.externalTrafficPolicy}{"\n"}'
```

With `internalTrafficPolicy: Local`, kube-proxy only uses node-local endpoints for internal traffic. A client on a node without a local endpoint can observe a deliberate drop even though remote Pod IP connectivity works. Change that policy only if the required semantics are actually `Cluster`.

Do not add a host route to the ClusterIP. Service virtual IPs are normally captured by proxy rules and are not assigned to a real interface.

## Check the Service Proxy on the Client Node

Find the client node:

```bash
CLIENT_NODE=$(kubectl -n "$NS" get pod "$CLIENT" \
  -o jsonpath='{.spec.nodeName}')
echo "$CLIENT_NODE"

kubectl -n kube-system get daemonset kube-proxy
kubectl -n kube-system get pods -l k8s-app=kube-proxy -o wide
```

Some distributions replace kube-proxy with another component. If there is no kube-proxy DaemonSet, identify and use the Service implementation's diagnostics rather than installing a second proxy.

For kube-proxy, inspect the pod and logs on the client node:

```bash
PROXY_POD=$(kubectl -n kube-system get pods -l k8s-app=kube-proxy \
  --field-selector "spec.nodeName=${CLIENT_NODE}" \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n kube-system describe pod "$PROXY_POD"
kubectl -n kube-system logs "$PROXY_POD" --tail=300
kubectl -n kube-system get configmap kube-proxy \
  -o jsonpath='{.data.config\.conf}'
echo
```

On the client node, the local health endpoint can reveal the active mode when enabled:

```bash
curl -fsS http://127.0.0.1:10249/proxyMode
curl -fsS http://127.0.0.1:10256/healthz
```

Linux kube-proxy can use `iptables`, `nftables`, or `ipvs`, depending on Kubernetes version and configuration. IPVS mode is deprecated as of Kubernetes 1.35; nftables mode is stable from 1.33 but has kernel and compatibility requirements. Diagnose the mode the installed version actually runs.

## Inspect the Correct Kernel Rules

For iptables mode:

```bash
sudo iptables-save -t nat | grep -F "$CLUSTER_IP"
sudo iptables-save -t filter | grep -E 'KUBE-(FORWARD|SERVICES|FIREWALL)'
```

For nftables mode:

```bash
sudo nft list ruleset | grep -C 4 -F "$CLUSTER_IP"
```

For IPVS mode:

```bash
sudo ipvsadm -Ln | grep -A 5 -F "$CLUSTER_IP"
```

A missing Service rule while EndpointSlices are correct points to kube-proxy API access, configuration, version compatibility, or reconciliation errors. A present rule with an obsolete endpoint points to delayed or failed synchronization.

Do not flush iptables or nftables as a diagnostic shortcut. Flannel, kube-proxy, the container runtime, firewalld, and other agents can share netfilter. Broad flushing causes an outage and destroys the evidence.

## Check Forwarding and Firewall Interaction

```bash
sysctl net.ipv4.ip_forward
sysctl net.bridge.bridge-nf-call-iptables
lsmod | grep -w br_netfilter

sudo iptables -L FORWARD -n -v --line-numbers
sudo nft list ruleset
```

Flannel can install default forward-accept rules when its `--iptables-forward-rules` option is enabled, but host firewall policy can still interfere. firewalld with an nftables backend and kube-proxy using iptables are distinct rule managers; inspect the full active ruleset and service logs before altering either.

If restarting firewalld makes the issue appear, verify its runtime and permanent policies. A reload may replace runtime state, and current firewalld defaults to its nftables backend. Repair ownership and persistence rather than scheduling periodic rule flushes.

## Isolate a Hairpin-Only Failure

Hairpin mode matters when a frame would need to leave and return through the same bridge port-for example, a pod calls a Service and kube-proxy chooses that same pod as the endpoint. It is not the leading cause when every client fails to reach every ClusterIP.

Compare four cases:

1. A client pod calls a Service backed by a pod on another node.
2. A client pod calls a Service backed by a different pod on the same node.
3. A backend pod calls its own Service.
4. The backend pod calls its own Pod IP directly.

If only case 3 fails, inspect the CNI delegate. The current upstream Flannel manifest includes `hairpinMode: true`:

```bash
sudo sed -n '1,220p' /etc/cni/net.d/10-flannel.conflist
bridge link show master cni0
```

Bridge hairpin is a per-port property applied when the interface is created. If you correct `hairpinMode` in the managed Flannel CNI configuration, restart the Flannel pod so its init container installs the config, and then recreate the affected workload pods through their controller. Merely editing the conflist does not retrofit existing veth ports.

Kube-proxy may also apply masquerading for hairpin flows depending on mode and topology. Check its logs and mode-specific rules; do not attribute every same-node Service failure to Flannel.

## Recover and Verify

After fixing configuration, API access, firewall ownership, or kernel support, restart only the affected component:

```bash
kubectl -n kube-system delete pod "$PROXY_POD"
kubectl -n kube-system rollout status daemonset/kube-proxy --timeout=5m
```

For a replacement Service proxy, use that project's supported reconciliation procedure. Retest endpoint IP, ClusterIP, then DNS. Test from clients on several nodes so a single broken proxy instance does not appear as a cluster-wide issue.

## Official Documentation

- [Kubernetes: Virtual IPs and Service Proxies](https://kubernetes.io/docs/reference/networking/virtual-ips/)
- [Kubernetes Service concepts](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes EndpointSlice concepts](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes: Using Source IP](https://kubernetes.io/docs/tutorials/services/source-ip/)
- [Flannel's current CNI configuration](https://github.com/flannel-io/flannel/blob/master/Documentation/kube-flannel.yml)
- [CNI bridge plugin and hairpin mode](https://www.cni.dev/plugins/current/main/bridge/)

## Conclusion

Working Pod IPs establish that Flannel can carry the underlying endpoint traffic. For a broken ClusterIP, validate selectors and ready EndpointSlices, test a ready endpoint directly, then inspect the Service proxy on the client node in its actual mode. Reserve hairpin diagnosis for self-Service failures, and never add static Service routes or flush shared netfilter state as a shortcut.
