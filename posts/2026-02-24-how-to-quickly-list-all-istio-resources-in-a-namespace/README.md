# How to Quickly List All Istio Resources in a Namespace

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Service Mesh, Kubectl, DevOps

Description: Quick methods to list and inspect all Istio custom resources in a Kubernetes namespace for debugging and auditing.

---

When you are debugging an Istio issue or auditing the configuration of a particular namespace, you often need to see every Istio resource that is in play. Kubernetes does not have a single command to list "all Istio things," so you need to know which resource types to look for and how to query them efficiently.

Here is how to get a complete picture of Istio resources in any namespace.

## List All Istio CRDs First

Before you can list resources, it helps to know what Istio CRDs are installed on your cluster:

```bash
kubectl get crd | grep istio.io
```

This typically returns something like:

```text
authorizationpolicies.security.istio.io
destinationrules.networking.istio.io
envoyfilters.networking.istio.io
gateways.networking.istio.io
peerauthentications.security.istio.io
proxyconfigs.networking.istio.io
requestauthentications.security.istio.io
serviceentries.networking.istio.io
sidecars.networking.istio.io
telemetries.telemetry.istio.io
virtualservices.networking.istio.io
wasmplugins.extensions.istio.io
workloadentries.networking.istio.io
workloadgroups.networking.istio.io
```

The exact list depends on your Istio version and installation profile.

## List All Networking Resources

The networking API group contains the most commonly used Istio resources. List them all at once:

```bash
kubectl get virtualservices,destinationrules,gateways,serviceentries,sidecars,envoyfilters -n default
```

This gives you a combined view of all networking resources in the `default` namespace. The output shows each resource type with its name, host, and age.

For a more compact view:

```bash
kubectl get vs,dr,gw,se -n default
```

Istio registers short names for most resources: `vs` for VirtualService, `dr` for DestinationRule, `gw` for Gateway, and `se` for ServiceEntry.

## List All Security Resources

Security resources control authentication and authorization:

```bash
kubectl get peerauthentications,requestauthentications,authorizationpolicies -n default
```

Or using short names:

```bash
kubectl get pa,ra,authorizationpolicies -n default
```

This shows you all the mTLS policies, JWT validation rules, and access control policies in the namespace.

## List All Telemetry Resources

Telemetry resources control metrics, logging, and tracing configuration:

```bash
kubectl get telemetries -n default
```

## List Everything at Once

If you want to see all Istio resources in a namespace with a single command, you can combine them:

```bash
kubectl get \
  virtualservices,destinationrules,gateways,serviceentries,sidecars,envoyfilters,\
  peerauthentications,requestauthentications,authorizationpolicies,\
  telemetries,wasmplugins,workloadentries,workloadgroups,proxyconfigs \
  -n default
```

That is a long command, so you might want to save it as an alias in your shell configuration:

```bash
alias kistio='kubectl get virtualservices,destinationrules,gateways,serviceentries,sidecars,envoyfilters,peerauthentications,requestauthentications,authorizationpolicies,telemetries,wasmplugins,workloadentries,workloadgroups,proxyconfigs'
```

Then just use:

```bash
kistio -n default
```

## List Resources Across All Namespaces

To see Istio resources across the entire cluster:

```bash
kubectl get virtualservices --all-namespaces
kubectl get destinationrules --all-namespaces
kubectl get authorizationpolicies --all-namespaces
```

Or combine them:

```bash
kubectl get vs,dr,gw,se,pa,ra,authorizationpolicies -A
```

The `-A` flag is shorthand for `--all-namespaces`. This is great for getting a cluster-wide picture of your Istio configuration.

## Get Detailed Output

The default table output is compact but sometimes you need more detail. Use `-o wide` for additional columns:

```bash
kubectl get virtualservices -n default -o wide
```

For full details on a specific resource:

```bash
kubectl get virtualservice my-vs -n default -o yaml
```

## Using istioctl for Richer Output

The `istioctl` tool provides additional context that kubectl alone cannot. For example, to see the effective configuration for a specific workload:

```bash
istioctl proxy-config all deploy/my-app -n default
```

This shows the actual Envoy configuration that results from all the Istio resources affecting that workload. It is broken down into:

- **Listeners**: What ports the sidecar is listening on
- **Routes**: How requests are routed
- **Clusters**: Backend service endpoints
- **Endpoints**: Individual pod IPs

You can drill into each:

```bash
istioctl proxy-config listeners deploy/my-app -n default
istioctl proxy-config routes deploy/my-app -n default
istioctl proxy-config clusters deploy/my-app -n default
istioctl proxy-config endpoints deploy/my-app -n default
```

## Finding Resources That Apply to a Specific Service

Sometimes you want to know which Istio resources affect a particular service. There is no built-in command for this, but you can filter by looking at host fields:

```bash
kubectl get virtualservices -n default -o json | \
  python3 -c "import sys,json; data=json.load(sys.stdin); [print(i['metadata']['name']) for i in data['items'] if 'my-service' in str(i.get('spec',{}).get('hosts',[]))]"
```

Or more simply, just look at the YAML and grep:

```bash
kubectl get vs -n default -o yaml | grep -B5 "my-service"
```

For authorization policies that target a specific workload:

```bash
kubectl get authorizationpolicies -n default -o yaml | grep -B10 "app: my-service"
```

## Counting Resources

For a quick count of Istio resources per namespace:

```bash
for type in vs dr gw se pa ra authorizationpolicies envoyfilters; do
  count=$(kubectl get $type -n default --no-headers 2>/dev/null | wc -l)
  echo "$type: $count"
done
```

Output might look like:

```text
vs: 12
dr: 8
gw: 2
se: 5
pa: 3
ra: 1
authorizationpolicies: 7
envoyfilters: 1
```

## Checking Resource Status

Many Istio resources have status conditions that tell you whether they have been accepted by the control plane. Check the status of a VirtualService:

```bash
kubectl get vs my-vs -n default -o jsonpath='{.status}' | python3 -m json.tool
```

If the resource has validation errors, they will show up in the status section. This is especially useful for catching typos in hostnames or mismatched ports.

## Using Labels and Annotations

Istio adds labels and annotations to resources it manages. You can use these to filter:

```bash
# Find all pods with Istio sidecars
kubectl get pods -n default -l security.istio.io/tlsMode=istio

# Find pods with specific sidecar version
kubectl get pods -n default -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.annotations.sidecar\.istio\.io/status}{"\n"}{end}'
```

## A Complete Audit Script

Here is a script that gives you a full audit of Istio resources in a namespace:

```bash
#!/bin/bash
NS=${1:-default}
echo "=== Istio Resources in namespace: $NS ==="
echo ""

for resource in virtualservices destinationrules gateways serviceentries \
  sidecars envoyfilters peerauthentications requestauthentications \
  authorizationpolicies telemetries wasmplugins workloadentries; do

  count=$(kubectl get $resource -n $NS --no-headers 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" -gt "0" ]; then
    echo "--- $resource ($count) ---"
    kubectl get $resource -n $NS
    echo ""
  fi
done
```

Save it and run with:

```bash
./istio-audit.sh default
./istio-audit.sh production
```

This gives you a clean, organized view of every Istio resource in the namespace, skipping resource types that have no instances. It is a handy script to keep around for regular auditing and troubleshooting.
