# How to Generate API Documentation from Istio Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Documentation, Automation, Kubernetes, DevOps

Description: Extract and generate API documentation automatically from Istio VirtualService, Gateway, and DestinationRule configurations in your cluster.

---

Your Istio configuration already describes a lot about your APIs: what routes exist, what timeouts apply, which services handle which paths, and how traffic flows between services. Instead of maintaining separate API documentation that inevitably drifts from reality, you can generate documentation directly from your Istio resources. This keeps your docs accurate because they come from the same configuration that controls your actual traffic.

## What Information Istio Configuration Contains

Istio resources contain a surprising amount of documentable information:

- **VirtualServices**: Route definitions, path matching rules, timeout settings, retry policies, fault injection rules
- **Gateways**: External endpoints, TLS configuration, supported protocols
- **DestinationRules**: Traffic policies, connection pool limits, load balancing algorithms, circuit breaker settings
- **AuthorizationPolicies**: Access control rules, allowed sources, permitted operations
- **ServiceEntries**: External service dependencies

All of this is useful for API consumers, operations teams, and compliance auditors.

## Extracting VirtualService Routes

Start by pulling out all the route information from your VirtualServices:

```bash
#!/bin/bash
# extract-routes.sh

echo "# API Routes"
echo ""
echo "Generated: $(date -u +%FT%TZ)"
echo ""

for vs in $(kubectl get virtualservices -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}'); do
  NS=$(echo $vs | cut -d/ -f1)
  NAME=$(echo $vs | cut -d/ -f2)

  echo "## $NAME (namespace: $NS)"
  echo ""

  kubectl get virtualservice $NAME -n $NS -o json | \
    jq -r '
      .spec.hosts[] as $host |
      .spec.http[]? |
      . as $route |
      (.match // [{}])[] |
      "| \($host) | \(.uri.prefix // .uri.exact // "*") | \($route.timeout // "default") | \($route.route[0].destination.host) |"
    ' 2>/dev/null

  echo ""
done
```

This produces a basic table of all routes in your mesh. But we can do better.

## Structured Documentation Generator

Here's a more comprehensive script that generates Markdown documentation:

```bash
#!/bin/bash
# generate-api-docs.sh

OUTPUT_DIR="./api-docs"
mkdir -p $OUTPUT_DIR

# Generate index
cat > $OUTPUT_DIR/index.md << 'HEADER'
# API Documentation

Auto-generated from Istio configuration.

## Services

HEADER

# Process each VirtualService
kubectl get virtualservices -A -o json | jq -c '.items[]' | while read -r VS; do
  NAME=$(echo $VS | jq -r '.metadata.name')
  NS=$(echo $VS | jq -r '.metadata.namespace')
  HOSTS=$(echo $VS | jq -r '.spec.hosts | join(", ")')

  echo "- [$NAME](./${NAME}.md) - $HOSTS" >> $OUTPUT_DIR/index.md

  # Generate per-service doc
  cat > $OUTPUT_DIR/${NAME}.md << EOF
# ${NAME}

**Namespace:** ${NS}
**Hosts:** ${HOSTS}

## Routes

EOF

  echo $VS | jq -r '
    .spec.http[]? |
    "### " + (.match[0].uri.prefix // .match[0].uri.exact // "/*") + "\n" +
    "- **Timeout:** " + (.timeout // "default (15s)") + "\n" +
    "- **Retries:** " + ((.retries.attempts // 0) | tostring) + " attempts\n" +
    "- **Destination:** " + .route[0].destination.host + ":" + (.route[0].destination.port.number // 80 | tostring) + "\n"
  ' >> $OUTPUT_DIR/${NAME}.md

  # Add traffic policy info from DestinationRule
  DR=$(kubectl get destinationrule -n $NS -o json 2>/dev/null | \
    jq -c --arg host "$(echo $VS | jq -r '.spec.hosts[0]')" \
    '.items[] | select(.spec.host | contains($host))')

  if [ -n "$DR" ]; then
    cat >> $OUTPUT_DIR/${NAME}.md << EOF

## Traffic Policy

EOF
    echo $DR | jq -r '
      "- **Max Connections:** " + (.spec.trafficPolicy.connectionPool.tcp.maxConnections // "unlimited" | tostring) + "\n" +
      "- **Connect Timeout:** " + (.spec.trafficPolicy.connectionPool.tcp.connectTimeout // "default") + "\n" +
      "- **Load Balancer:** " + (.spec.trafficPolicy.loadBalancer.simple // "ROUND_ROBIN")
    ' >> $OUTPUT_DIR/${NAME}.md 2>/dev/null
  fi

done

echo ""
echo "Documentation generated in $OUTPUT_DIR"
```

## Using Python for Richer Documentation

For more structured output, use Python with the Kubernetes client:

```python
#!/usr/bin/env python3
# generate_api_docs.py

import json
import subprocess
import sys
from datetime import datetime

def kubectl_get(resource, namespace="--all-namespaces"):
    cmd = f"kubectl get {resource} {namespace} -o json"
    result = subprocess.run(cmd.split(), capture_output=True, text=True)
    if result.returncode != 0:
        return {"items": []}
    return json.loads(result.stdout)

def generate_docs():
    docs = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "services": []
    }

    virtual_services = kubectl_get("virtualservices")

    for vs in virtual_services.get("items", []):
        service_doc = {
            "name": vs["metadata"]["name"],
            "namespace": vs["metadata"]["namespace"],
            "hosts": vs["spec"].get("hosts", []),
            "gateways": vs["spec"].get("gateways", []),
            "routes": []
        }

        for http_route in vs["spec"].get("http", []):
            route = {
                "match": [],
                "timeout": http_route.get("timeout", "15s (default)"),
                "retries": http_route.get("retries", {}),
                "destinations": []
            }

            for match in http_route.get("match", [{}]):
                uri = match.get("uri", {})
                route["match"].append({
                    "uri_prefix": uri.get("prefix"),
                    "uri_exact": uri.get("exact"),
                    "headers": match.get("headers", {})
                })

            for dest in http_route.get("route", []):
                route["destinations"].append({
                    "host": dest["destination"]["host"],
                    "port": dest["destination"].get("port", {}).get("number"),
                    "weight": dest.get("weight", 100)
                })

            service_doc["routes"].append(route)

        docs["services"].append(service_doc)

    return docs

def render_markdown(docs):
    lines = []
    lines.append(f"# API Documentation")
    lines.append(f"")
    lines.append(f"Generated: {docs['generated_at']}")
    lines.append(f"")

    for svc in docs["services"]:
        lines.append(f"## {svc['name']}")
        lines.append(f"")
        lines.append(f"- **Namespace:** {svc['namespace']}")
        lines.append(f"- **Hosts:** {', '.join(svc['hosts'])}")
        if svc['gateways']:
            lines.append(f"- **Gateways:** {', '.join(svc['gateways'])}")
        lines.append(f"")

        for i, route in enumerate(svc["routes"]):
            match_str = "/*"
            if route["match"]:
                m = route["match"][0]
                match_str = m.get("uri_prefix") or m.get("uri_exact") or "/*"

            lines.append(f"### Route: {match_str}")
            lines.append(f"")
            lines.append(f"| Property | Value |")
            lines.append(f"|----------|-------|")
            lines.append(f"| Timeout | {route['timeout']} |")
            if route["retries"]:
                lines.append(f"| Retry Attempts | {route['retries'].get('attempts', 0)} |")
                lines.append(f"| Per-Try Timeout | {route['retries'].get('perTryTimeout', 'N/A')} |")

            for dest in route["destinations"]:
                port = f":{dest['port']}" if dest['port'] else ""
                lines.append(f"| Destination | {dest['host']}{port} (weight: {dest['weight']}%) |")

            lines.append(f"")

    return "\n".join(lines)

if __name__ == "__main__":
    docs = generate_docs()

    if "--json" in sys.argv:
        print(json.dumps(docs, indent=2))
    else:
        print(render_markdown(docs))
```

Run it with:

```bash
python3 generate_api_docs.py > api-documentation.md
python3 generate_api_docs.py --json > api-documentation.json
```

## Automating Documentation Generation

Run the doc generator as a CronJob in your cluster:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: api-doc-generator
  namespace: istio-system
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        metadata:
          annotations:
            sidecar.istio.io/inject: "false"
        spec:
          serviceAccountName: doc-generator
          containers:
          - name: generator
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              # Generate docs and upload to a shared location
              /scripts/generate-api-docs.sh > /tmp/api-docs.md
              # Upload to S3, git repo, or wiki
              kubectl create configmap api-docs \
                --from-file=docs.md=/tmp/api-docs.md \
                -n documentation \
                --dry-run=client -o yaml | kubectl apply -f -
          restartPolicy: OnFailure
```

The RBAC needed for the doc generator:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: doc-generator
rules:
- apiGroups: ["networking.istio.io"]
  resources: ["virtualservices", "destinationrules", "gateways", "serviceentries"]
  verbs: ["get", "list"]
- apiGroups: ["security.istio.io"]
  resources: ["authorizationpolicies", "peerauthentications"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: doc-generator
subjects:
- kind: ServiceAccount
  name: doc-generator
  namespace: istio-system
roleRef:
  kind: ClusterRole
  name: doc-generator
  apiGroup: rbac.authorization.k8s.io
```

## Including Security Policy Documentation

AuthorizationPolicies contain valuable information about who can access what:

```bash
# Extract authorization policies
kubectl get authorizationpolicies -A -o json | jq -r '
  .items[] |
  "### " + .metadata.name + " (ns: " + .metadata.namespace + ")\n" +
  "**Action:** " + (.spec.action // "ALLOW") + "\n" +
  (
    .spec.rules[]? |
    "- From: " + (.from[].source.principals // ["any"] | join(", ")) + "\n" +
    "  To: " + (.to[].operation.methods // ["*"] | join(", ")) + " " + (.to[].operation.paths // ["/*"] | join(", "))
  ) + "\n"
'
```

## Keeping Documentation in Git

The best approach is to commit generated docs to a git repository. Add a CI pipeline step that regenerates docs and creates a pull request if they've changed:

```bash
#!/bin/bash
# ci-update-docs.sh

# Generate fresh docs
python3 generate_api_docs.py > docs/api-documentation.md

# Check if anything changed
if git diff --quiet docs/api-documentation.md; then
  echo "No documentation changes detected"
  exit 0
fi

# Create a branch and PR
git checkout -b docs/api-update-$(date +%Y%m%d)
git add docs/api-documentation.md
git commit -m "Update API documentation from Istio config"
git push origin HEAD
gh pr create --title "Update API documentation" --body "Auto-generated from current Istio configuration"
```

This way, documentation changes go through the same review process as code changes, and you have a history of how your API surface has evolved over time.

Generating API documentation from Istio configuration ensures your docs reflect what's actually running in production. The configuration is the source of truth, and the documentation is just a different view of that same truth.
