# How to Generate Network Topology Documentation from Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Network Topology, Documentation, Observability, Kubernetes

Description: Automatically generate network topology diagrams and documentation from Istio mesh telemetry, configuration, and runtime state.

---

Network topology documentation tends to become outdated the moment someone draws it. Services get added, removed, or reconfigured, and the diagram on the wiki stops reflecting reality. With Istio, you can generate topology documentation automatically from the mesh's actual state. The mesh knows exactly which services exist, how they communicate, what gateways they use, and what external dependencies they have.

## What Network Topology Includes

A complete network topology document should cover:

- Service-to-service communication paths
- Ingress points (Gateways)
- Egress points (ServiceEntries to external services)
- Load balancing configurations
- Network boundaries (namespaces, clusters)
- TLS/mTLS status of each connection
- Traffic flow volumes

## Extracting the Topology from Istio

Start by gathering all the relevant Istio resources:

```bash
#!/bin/bash
# extract-topology.sh

echo "# Network Topology"
echo "Generated: $(date -u +%FT%TZ)"
echo ""

echo "## Ingress Points"
echo ""

kubectl get gateways -A -o json | jq -r '
  .items[] |
  "### Gateway: " + .metadata.name + " (ns: " + .metadata.namespace + ")\n" +
  (
    .spec.servers[] |
    "- Port " + (.port.number | tostring) + "/" + .port.protocol +
    " -> Hosts: " + (.hosts | join(", ")) +
    (if .tls then " [TLS: " + .tls.mode + "]" else " [No TLS]" end)
  ) + "\n"
'

echo "## Internal Services"
echo ""

kubectl get virtualservices -A -o json | jq -r '
  .items[] |
  "### " + .metadata.name + " (ns: " + .metadata.namespace + ")\n" +
  "Hosts: " + (.spec.hosts | join(", ")) + "\n" +
  (if .spec.gateways then "Gateways: " + (.spec.gateways | join(", ")) + "\n" else "" end) +
  "Routes:\n" +
  (
    .spec.http[]? |
    "- " + ((.match[0].uri.prefix // .match[0].uri.exact // "/*") // "/*") +
    " -> " + .route[0].destination.host + ":" + (.route[0].destination.port.number // 80 | tostring)
  ) + "\n"
'

echo "## External Dependencies"
echo ""

kubectl get serviceentries -A -o json | jq -r '
  .items[] |
  "### " + .metadata.name + " (ns: " + .metadata.namespace + ")\n" +
  "Hosts: " + (.spec.hosts | join(", ")) + "\n" +
  "Location: " + .spec.location + "\n" +
  "Ports:\n" +
  (.spec.ports[] | "- " + (.number | tostring) + "/" + .protocol + " (" + .name + ")") + "\n"
'
```

## Generating a Visual Topology Diagram

Create a comprehensive DOT file that includes all topology elements:

```python
#!/usr/bin/env python3
# topology-diagram.py

import json
import subprocess

def kubectl_get_json(resource):
    result = subprocess.run(
        ["kubectl", "get", resource, "-A", "-o", "json"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        return {"items": []}
    return json.loads(result.stdout)

def generate_dot():
    lines = []
    lines.append("digraph topology {")
    lines.append("  rankdir=LR;")
    lines.append("  compound=true;")
    lines.append("  node [fontname=Helvetica, fontsize=10];")
    lines.append("  edge [fontname=Helvetica, fontsize=8];")
    lines.append("")

    # External clients
    lines.append('  internet [shape=cloud, label="Internet"];')
    lines.append("")

    # Gateways
    gateways = kubectl_get_json("gateways")
    for gw in gateways.get("items", []):
        name = gw["metadata"]["name"]
        ns = gw["metadata"]["namespace"]
        gw_id = f"gw_{name}_{ns}".replace("-", "_")
        hosts = [s.get("hosts", []) for s in gw["spec"].get("servers", [])]
        flat_hosts = [h for sublist in hosts for h in sublist]
        lines.append(f'  {gw_id} [shape=trapezium, style=filled, fillcolor=orange, label="GW: {name}\\n{", ".join(flat_hosts[:3])}"];')
        lines.append(f'  internet -> {gw_id};')

    lines.append("")

    # Group services by namespace
    namespaces = {}
    vs_list = kubectl_get_json("virtualservices")
    for vs in vs_list.get("items", []):
        ns = vs["metadata"]["namespace"]
        if ns not in namespaces:
            namespaces[ns] = []
        namespaces[ns].append(vs)

    for ns, services in namespaces.items():
        ns_id = ns.replace("-", "_")
        lines.append(f"  subgraph cluster_{ns_id} {{")
        lines.append(f'    label="{ns}";')
        lines.append("    style=filled;")
        lines.append("    color=lightgrey;")

        for vs in services:
            name = vs["metadata"]["name"]
            svc_id = f"svc_{name}_{ns}".replace("-", "_")
            lines.append(f'    {svc_id} [shape=box, style=filled, fillcolor=lightblue, label="{name}"];')

            # Connect gateways to services
            for gw_name in vs["spec"].get("gateways", []):
                if gw_name != "mesh":
                    gw_id = f"gw_{gw_name}_{ns}".replace("-", "_")
                    lines.append(f'    {gw_id} -> {svc_id};')

            # Connect services to destinations
            for http_route in vs["spec"].get("http", []):
                for route in http_route.get("route", []):
                    dest = route["destination"]["host"]
                    dest_short = dest.split(".")[0]
                    dest_id = f"svc_{dest_short}_{ns}".replace("-", "_")
                    if dest_id != svc_id:
                        lines.append(f'    {svc_id} -> {dest_id};')

        lines.append("  }")
        lines.append("")

    # External services
    se_list = kubectl_get_json("serviceentries")
    if se_list.get("items"):
        lines.append("  subgraph cluster_external {")
        lines.append('    label="External Services";')
        lines.append("    style=dashed;")
        lines.append("    color=red;")

        for se in se_list.get("items", []):
            name = se["metadata"]["name"]
            se_id = f"ext_{name}".replace("-", "_")
            hosts = se["spec"].get("hosts", [])
            lines.append(f'    {se_id} [shape=box, style=filled, fillcolor=lightyellow, label="{hosts[0] if hosts else name}"];')

        lines.append("  }")

    lines.append("}")
    return "\n".join(lines)

if __name__ == "__main__":
    print(generate_dot())
```

Render the diagram:

```bash
python3 topology-diagram.py > topology.dot
dot -Tsvg topology.dot -o topology.svg
dot -Tpng topology.dot -o topology.png
```

## Documenting TLS Topology

Map the TLS configuration across your mesh:

```bash
#!/bin/bash
# tls-topology.sh

echo "# TLS Topology"
echo ""
echo "## mTLS Between Services"
echo ""
echo "| Source Namespace | Destination Namespace | mTLS Mode |"
echo "|-----------------|---------------------|-----------|"

# Get PeerAuthentication policies
kubectl get peerauthentications -A -o json | jq -r '
  .items[] |
  "| * | " + .metadata.namespace + " | " + (.spec.mtls.mode // "UNSET") + " |"
'

echo ""
echo "## Gateway TLS"
echo ""
echo "| Gateway | Port | TLS Mode | Credential |"
echo "|---------|------|----------|------------|"

kubectl get gateways -A -o json | jq -r '
  .items[] |
  .metadata.name as $gw |
  .spec.servers[] |
  "| " + $gw + " | " + (.port.number | tostring) + " | " + (.tls.mode // "NONE") + " | " + (.tls.credentialName // "N/A") + " |"
'
```

## Namespace Boundary Documentation

Document the network boundaries between namespaces:

```yaml
# namespace-boundaries.md content

## Namespace Boundaries

### production
- **mTLS:** STRICT
- **Default policy:** DENY all, explicit ALLOW rules
- **Allowed ingress from:** api-gateway (production)
- **Allowed egress to:** databases (storage), external APIs (via ServiceEntry)

### staging
- **mTLS:** PERMISSIVE
- **Default policy:** ALLOW all within namespace
- **Allowed ingress from:** Internal testers only
- **Allowed egress to:** staging databases, mock external services
```

Generate this automatically:

```bash
#!/bin/bash
# namespace-boundaries.sh

echo "# Namespace Network Boundaries"
echo ""

for NS in $(kubectl get ns -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  echo "## $NS"
  echo ""

  # mTLS mode
  MTLS=$(kubectl get peerauthentication -n $NS -o json 2>/dev/null | \
    jq -r '.items[0].spec.mtls.mode // "UNSET"')
  echo "- **mTLS:** $MTLS"

  # Authorization policies
  AP_COUNT=$(kubectl get authorizationpolicies -n $NS -o name 2>/dev/null | wc -l | tr -d ' ')
  echo "- **Authorization policies:** $AP_COUNT"

  # Service count
  SVC_COUNT=$(kubectl get svc -n $NS -o name 2>/dev/null | wc -l | tr -d ' ')
  echo "- **Services:** $SVC_COUNT"

  # Sidecar config
  SIDECAR=$(kubectl get sidecar -n $NS -o name 2>/dev/null | wc -l | tr -d ' ')
  echo "- **Sidecar configurations:** $SIDECAR"

  echo ""
done
```

## Automating Topology Updates

Set up a CI job that regenerates topology docs on every Istio config change:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: topology-docs
  namespace: istio-system
spec:
  schedule: "0 */4 * * *"
  jobTemplate:
    spec:
      template:
        metadata:
          annotations:
            sidecar.istio.io/inject: "false"
        spec:
          serviceAccountName: topology-generator
          containers:
          - name: generator
            image: python:3.11-slim
            command:
            - /bin/bash
            - -c
            - |
              pip install kubernetes
              python3 /scripts/topology-diagram.py > /tmp/topology.dot
              apt-get update && apt-get install -y graphviz
              dot -Tsvg /tmp/topology.dot -o /tmp/topology.svg
              # Push to documentation system
              kubectl create configmap network-topology \
                --from-file=topology.svg=/tmp/topology.svg \
                --from-file=topology.dot=/tmp/topology.dot \
                -n documentation \
                --dry-run=client -o yaml | kubectl apply -f -
          restartPolicy: OnFailure
```

## Comparing Topology Over Time

Store topology snapshots to track changes:

```bash
#!/bin/bash
# snapshot-topology.sh

DATE=$(date +%Y%m%d)
SNAPSHOT_DIR="topology-snapshots"
mkdir -p $SNAPSHOT_DIR

# Save current state
kubectl get virtualservices -A -o yaml > $SNAPSHOT_DIR/vs-$DATE.yaml
kubectl get destinationrules -A -o yaml > $SNAPSHOT_DIR/dr-$DATE.yaml
kubectl get gateways -A -o yaml > $SNAPSHOT_DIR/gw-$DATE.yaml
kubectl get serviceentries -A -o yaml > $SNAPSHOT_DIR/se-$DATE.yaml

# Generate and save diagram
python3 topology-diagram.py > $SNAPSHOT_DIR/topology-$DATE.dot

# Compare with previous snapshot
PREV=$(ls $SNAPSHOT_DIR/vs-*.yaml | sort | tail -2 | head -1)
if [ -n "$PREV" ]; then
  echo "Changes since last snapshot:"
  diff $PREV $SNAPSHOT_DIR/vs-$DATE.yaml || echo "VirtualService changes detected"
fi
```

Network topology documentation that's generated from live configuration is always accurate. The diagrams might not be as pretty as hand-drawn ones, but they're trustworthy, which matters a lot more for operations and compliance.
