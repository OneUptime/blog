# How to Exclude Specific IP Ranges from Istio Sidecar

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Kubernetes, Networking, Traffic Management

Description: Configure Istio to bypass sidecar proxy interception for specific IP ranges using annotations and global mesh configuration.

---

Sometimes you need traffic to bypass the Istio sidecar proxy entirely for certain IP destinations. Maybe your pods need to reach a metadata service at a link-local address, or you have legacy infrastructure that doesn't play well with Envoy, or you're connecting to an external database through a private IP range. Whatever the reason, Istio gives you the ability to exclude IP ranges from sidecar interception.

This guide covers the different ways to exclude IP ranges, from pod-level annotations to mesh-wide settings, with practical examples for common scenarios.

## How IP-Based Traffic Capture Works

The `istio-init` init container sets up iptables rules in the PREROUTING and OUTPUT chains of the NAT table. By default, these rules redirect all outbound traffic through Envoy's outbound port (15001). When you exclude an IP range, the init container adds iptables rules that skip the redirect for packets destined to those IPs.

This happens at pod startup time, so changes require a pod restart to take effect.

## Excluding Outbound IP Ranges per Pod

The most common approach is using the `traffic.sidecar.istio.io/excludeOutboundIPRanges` annotation on your pod template:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.0.0.0/8,169.254.169.254/32"
    spec:
      containers:
        - name: my-app
          image: my-app:latest
```

This tells the init container to add iptables RETURN rules for the specified CIDR ranges. Traffic to `10.0.0.0/8` and `169.254.169.254/32` will go directly from the application to the destination without passing through Envoy.

Multiple ranges are comma-separated, and each must be in CIDR notation.

## Common IP Exclusion Scenarios

### Cloud Provider Metadata Services

On AWS, GCP, and Azure, the instance metadata service lives at `169.254.169.254`. Some applications or SDKs need direct access to this endpoint for fetching credentials, instance identity, or configuration:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "169.254.169.254/32"
```

On AWS EKS with IRSA (IAM Roles for Service Accounts), you might also need to exclude the token endpoint:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "169.254.169.254/32,169.254.170.2/32"
```

### External Database or Service IPs

If you have a managed database on a private IP that shouldn't go through the mesh:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.100.50.0/24"
```

### VPN or Private Network Ranges

For traffic destined to corporate networks through VPN tunnels:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "172.16.0.0/12,192.168.0.0/16"
```

## Including Only Specific IP Ranges

The opposite approach is to use `traffic.sidecar.istio.io/includeOutboundIPRanges` to specify which IP ranges should be captured. Only traffic to these ranges goes through the proxy:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/includeOutboundIPRanges: "10.96.0.0/12"
```

This is often set to the cluster's Service CIDR range, meaning only traffic to Kubernetes Services gets proxied. Everything else (external IPs, node IPs, etc.) bypasses the proxy.

You can find your cluster's Service CIDR with:

```bash
kubectl cluster-info dump | grep -m 1 service-cluster-ip-range
```

## Mesh-Wide IP Range Configuration

To set IP range exclusions for the entire mesh, configure it in the IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata: {}
  values:
    global:
      proxy:
        excludeIPRanges: "169.254.169.254/32"
        includeIPRanges: "10.96.0.0/12"
```

If you're using Helm to install Istio:

```bash
helm install istio-base istio/base -n istio-system
helm install istiod istio/istiod -n istio-system \
  --set global.proxy.excludeIPRanges="169.254.169.254/32" \
  --set global.proxy.includeIPRanges="10.96.0.0/12"
```

Note that pod-level annotations override mesh-wide settings. If a pod has an `includeOutboundIPRanges` annotation, it takes precedence over the global setting.

## Excluding Inbound IP Ranges

While less common, you can also exclude inbound traffic from certain source IPs:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeInboundPorts: ""
    traffic.sidecar.istio.io/includeInboundPorts: "*"
```

For inbound IP-based filtering, the annotations available are:

- `traffic.sidecar.istio.io/excludeOutboundIPRanges` - Skip proxy for outbound to these IPs
- `traffic.sidecar.istio.io/includeOutboundIPRanges` - Only proxy outbound to these IPs

Istio doesn't have a direct annotation for excluding inbound traffic by source IP. For that, you'd use Istio authorization policies instead.

## Verifying IP Range Exclusions

Check that the iptables rules were set up correctly:

```bash
# Look at the istio-init container logs
kubectl logs deploy/my-app -c istio-init -n default
```

The logs show the iptables commands that were run. Look for RETURN rules that match your excluded IP ranges:

```text
-A ISTIO_OUTPUT -d 169.254.169.254/32 -j RETURN
-A ISTIO_OUTPUT -d 10.0.0.0/8 -j RETURN
```

You can also test connectivity from inside the pod:

```bash
# Test direct connectivity to an excluded IP
kubectl exec -it deploy/my-app -c my-app -- curl -v http://169.254.169.254/latest/meta-data/
```

If the exclusion is working, the request goes directly to the destination without showing up in Envoy's access logs.

Check Envoy access logs to confirm traffic is not going through the proxy:

```bash
kubectl logs deploy/my-app -c istio-proxy -n default
```

Traffic to excluded IPs should not appear in these logs.

## Interaction with ServiceEntry

If you have a ServiceEntry that covers an IP range you've excluded, the exclusion takes precedence at the iptables level. The traffic never reaches Envoy, so the ServiceEntry doesn't apply.

```yaml
# This ServiceEntry won't affect traffic if 10.100.50.10 is in an excluded range
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-db
spec:
  hosts:
    - external-db.example.com
  addresses:
    - 10.100.50.10
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: STATIC
```

If you want Istio to manage traffic to external services (for observability and traffic management), don't exclude those IP ranges. Use ServiceEntry instead and let the traffic flow through the proxy.

## Gotchas and Tips

**Restart required**: IP range exclusions are applied by the init container at pod startup. Changing the annotation has no effect on running pods. You must restart:

```bash
kubectl rollout restart deployment/my-app -n default
```

**Include vs exclude conflict**: Don't use both `includeOutboundIPRanges` and `excludeOutboundIPRanges` on the same pod. The behavior is unpredictable. Pick one approach.

**CIDR notation required**: Always use CIDR notation. `10.0.0.1` alone is not valid - use `10.0.0.1/32` for a single IP.

**Loss of mesh features**: Just like port exclusions, IP range exclusions mean you lose mTLS, observability, retries, and traffic management for those connections. Make sure that trade-off is acceptable.

IP range exclusion is a straightforward mechanism. It works at the iptables level, it's reliable, and it handles the cases where the proxy simply shouldn't be in the path. Use it when you need it, but prefer keeping traffic in the mesh when possible.
