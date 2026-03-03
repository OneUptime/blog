# How to Maintain Istio Configuration Documentation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Documentation, Maintenance, GitOps, DevOps

Description: Establish processes and automation to keep your Istio configuration documentation accurate and up-to-date as your mesh evolves over time.

---

Writing documentation is the easy part. Keeping it accurate over months and years is where most teams fail. Istio configurations change constantly as services are added, traffic patterns shift, security policies are updated, and the mesh is upgraded. If your documentation doesn't keep pace, it becomes worse than no documentation because people make decisions based on outdated information.

## The Documentation Drift Problem

Documentation drifts from reality for predictable reasons:

- Someone updates a VirtualService but forgets to update the docs
- A new service is deployed without adding it to the architecture diagram
- Security policies are changed during an incident and never documented
- The mesh is upgraded and some configuration behavior changes

You can't solve this with discipline alone. You need automation and process.

## Strategy 1: Documentation as Code

Store all Istio documentation in the same git repository as the configuration:

```text
infrastructure/
  istio/
    production/
      gateway.yaml
      gateway-vs.yaml
      payment-vs.yaml
      payment-dr.yaml
      docs/
        architecture.md
        routing-rules.md
        security-policies.md
        runbooks/
          gateway-issues.md
          mtls-troubleshooting.md
    staging/
      ...
```

When someone submits a PR that changes an Istio resource, require a documentation update in the same PR. Enforce this with a CI check:

```bash
#!/bin/bash
# ci-check-docs.sh

# Get changed Istio configuration files
CHANGED_CONFIG=$(git diff --name-only origin/main | grep -E '\.(yaml|yml)$' | grep istio/)

if [ -n "$CHANGED_CONFIG" ]; then
  # Check if any documentation was also changed
  CHANGED_DOCS=$(git diff --name-only origin/main | grep -E '\.md$' | grep istio/)

  if [ -z "$CHANGED_DOCS" ]; then
    echo "WARNING: Istio configuration changed but no documentation updated."
    echo "Changed config files:"
    echo "$CHANGED_CONFIG"
    echo ""
    echo "Please update the relevant documentation in istio/*/docs/"
    exit 1
  fi
fi

echo "Documentation check passed."
```

## Strategy 2: Auto-Generated Documentation

Generate documentation automatically from the live configuration. This guarantees accuracy for factual information (what exists, what routes are configured, what policies apply):

```bash
#!/bin/bash
# auto-generate-docs.sh

OUTPUT_DIR="docs/generated"
mkdir -p $OUTPUT_DIR

# Generate route documentation
echo "# Istio Routes - Auto-Generated" > $OUTPUT_DIR/routes.md
echo "" >> $OUTPUT_DIR/routes.md
echo "Last updated: $(date -u +%FT%TZ)" >> $OUTPUT_DIR/routes.md
echo "" >> $OUTPUT_DIR/routes.md

kubectl get virtualservices -A -o json | jq -r '
  .items[] |
  "## " + .metadata.name + " (" + .metadata.namespace + ")\n" +
  "Hosts: " + (.spec.hosts | join(", ")) + "\n\n" +
  (
    .spec.http[]? |
    "| Path | Destination | Timeout | Retries |\n" +
    "|------|-------------|---------|--------|\n" +
    "| " + ((.match[0].uri.prefix // .match[0].uri.exact // "/*") // "/*") +
    " | " + .route[0].destination.host +
    " | " + (.timeout // "15s") +
    " | " + ((.retries.attempts // 0) | tostring) + " |\n"
  ) + "\n"
' >> $OUTPUT_DIR/routes.md

# Generate security policy documentation
echo "# Istio Security Policies - Auto-Generated" > $OUTPUT_DIR/security.md
echo "" >> $OUTPUT_DIR/security.md
echo "Last updated: $(date -u +%FT%TZ)" >> $OUTPUT_DIR/security.md
echo "" >> $OUTPUT_DIR/security.md

kubectl get authorizationpolicies -A -o json | jq -r '
  .items[] |
  "## " + .metadata.name + " (" + .metadata.namespace + ")\n" +
  "Action: " + (.spec.action // "ALLOW") + "\n" +
  "Target: " + (.spec.selector.matchLabels | to_entries | map(.key + "=" + .value) | join(", ")) + "\n\n" +
  "| Source | Methods | Paths |\n|--------|---------|-------|\n" +
  (
    .spec.rules[]? |
    "| " + ((.from[0].source.principals // ["any"]) | join(", ")) +
    " | " + ((.to[0].operation.methods // ["*"]) | join(", ")) +
    " | " + ((.to[0].operation.paths // ["/*"]) | join(", ")) + " |\n"
  ) + "\n"
' >> $OUTPUT_DIR/security.md

echo "Documentation generated in $OUTPUT_DIR"
```

Run this as a CronJob and commit the output:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: doc-generator
  namespace: istio-system
spec:
  schedule: "0 0 * * *"
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
            command: ["/bin/bash", "/scripts/auto-generate-docs.sh"]
            volumeMounts:
            - name: scripts
              mountPath: /scripts
          volumes:
          - name: scripts
            configMap:
              name: doc-generator-scripts
          restartPolicy: OnFailure
```

## Strategy 3: Documentation Validation

Validate that documentation references match actual resources. If the docs mention a service that doesn't exist anymore, flag it:

```python
#!/usr/bin/env python3
# validate-docs.py

import json
import re
import subprocess
import sys

def get_istio_resources():
    resources = set()

    for kind in ["virtualservices", "destinationrules", "gateways",
                 "serviceentries", "authorizationpolicies"]:
        result = subprocess.run(
            ["kubectl", "get", kind, "-A", "-o", "json"],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            for item in data.get("items", []):
                name = item["metadata"]["name"]
                ns = item["metadata"]["namespace"]
                resources.add(f"{kind}/{ns}/{name}")
                resources.add(name)

    return resources

def check_documentation(doc_path, resources):
    with open(doc_path) as f:
        content = f.read()

    issues = []

    # Find references to Istio resource names
    # Look for common patterns like "virtualservice <name>" or "<name>-vs"
    referenced_names = re.findall(r'(?:VirtualService|DestinationRule|Gateway|ServiceEntry|AuthorizationPolicy)[:\s]+(\S+)', content, re.IGNORECASE)

    for name in referenced_names:
        name = name.strip('`"\'')
        if name not in resources:
            issues.append(f"Referenced resource '{name}' not found in cluster")

    return issues

if __name__ == "__main__":
    resources = get_istio_resources()

    doc_files = sys.argv[1:] or ["docs/architecture.md", "docs/routing.md"]

    all_issues = []
    for doc_file in doc_files:
        try:
            issues = check_documentation(doc_file, resources)
            if issues:
                all_issues.extend([(doc_file, issue) for issue in issues])
        except FileNotFoundError:
            all_issues.append((doc_file, "File not found"))

    if all_issues:
        print("Documentation validation issues found:")
        for file, issue in all_issues:
            print(f"  {file}: {issue}")
        sys.exit(1)
    else:
        print("Documentation validation passed.")
```

## Strategy 4: Review Schedule

Set up regular review cycles for different types of documentation:

```markdown
# Documentation Review Schedule

## Weekly
- [ ] Check auto-generated docs for unexpected changes
- [ ] Review any new Istio resources that were added

## Monthly
- [ ] Review all routing documentation
- [ ] Verify architecture diagrams match reality
- [ ] Check runbook accuracy by running diagnostic commands

## Quarterly
- [ ] Full security policy review
- [ ] Multi-cluster architecture review
- [ ] Update compliance documentation
- [ ] Review and update runbooks
```

Automate the reminder:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: doc-review-reminder
  namespace: istio-system
spec:
  schedule: "0 9 1 * *"
  jobTemplate:
    spec:
      template:
        metadata:
          annotations:
            sidecar.istio.io/inject: "false"
        spec:
          containers:
          - name: reminder
            image: curlimages/curl
            command:
            - curl
            - -X
            - POST
            - -H
            - "Content-Type: application/json"
            - -d
            - '{"text":"Monthly reminder: Review Istio documentation. Check docs/generated/ for drift."}'
            - $(SLACK_WEBHOOK_URL)
          restartPolicy: OnFailure
```

## Strategy 5: Change Detection

Detect when Istio configuration changes and flag documentation that might need updating:

```bash
#!/bin/bash
# change-detector.sh

SNAPSHOT_DIR="/tmp/istio-snapshots"
mkdir -p $SNAPSHOT_DIR

# Current state
kubectl get virtualservices -A -o yaml > $SNAPSHOT_DIR/vs-current.yaml
kubectl get destinationrules -A -o yaml > $SNAPSHOT_DIR/dr-current.yaml
kubectl get gateways -A -o yaml > $SNAPSHOT_DIR/gw-current.yaml
kubectl get authorizationpolicies -A -o yaml > $SNAPSHOT_DIR/ap-current.yaml

# Compare with previous snapshot
CHANGES=""
for RESOURCE in vs dr gw ap; do
  PREV="$SNAPSHOT_DIR/${RESOURCE}-previous.yaml"
  CURR="$SNAPSHOT_DIR/${RESOURCE}-current.yaml"

  if [ -f "$PREV" ]; then
    DIFF=$(diff $PREV $CURR)
    if [ -n "$DIFF" ]; then
      CHANGES="$CHANGES\n$RESOURCE changed:\n$DIFF\n"
    fi
  fi

  # Save current as previous for next run
  cp $CURR $PREV
done

if [ -n "$CHANGES" ]; then
  echo "Istio configuration changes detected:"
  echo -e "$CHANGES"
  echo ""
  echo "Please review and update the corresponding documentation."
fi
```

## Strategy 6: Annotation Freshness Checks

Use annotations with dates and flag stale documentation:

```bash
#!/bin/bash
# freshness-check.sh

TODAY=$(date +%Y-%m-%d)
STALE_DAYS=90
CUTOFF=$(date -v-${STALE_DAYS}d +%Y-%m-%d 2>/dev/null || date -d "$STALE_DAYS days ago" +%Y-%m-%d)

echo "# Documentation Freshness Report"
echo "Stale threshold: $STALE_DAYS days (before $CUTOFF)"
echo ""

STALE_COUNT=0

for RESOURCE in virtualservices destinationrules gateways authorizationpolicies; do
  kubectl get $RESOURCE -A -o json | jq -r --arg cutoff "$CUTOFF" '
    .items[] |
    select(
      .metadata.annotations["docs/last-updated"] == null or
      .metadata.annotations["docs/last-updated"] < $cutoff
    ) |
    "- " + .metadata.namespace + "/" + .metadata.name +
    " (last updated: " + (.metadata.annotations["docs/last-updated"] // "NEVER") + ")"
  '
done

echo ""
echo "Update stale resources with:"
echo '  kubectl annotate <resource> <name> docs/last-updated=$(date +%Y-%m-%d) --overwrite'
```

## Putting It All Together

The most effective approach combines multiple strategies:

1. **Auto-generate** factual documentation (what exists, what's configured)
2. **Manually maintain** contextual documentation (why decisions were made, architecture rationale)
3. **Validate** that manual docs reference real resources
4. **Review** on a regular schedule
5. **Enforce** documentation updates in PR reviews

No single strategy is sufficient. Auto-generation handles the "what" but not the "why." Manual documentation handles the "why" but drifts from reality. Validation catches drift. Reviews ensure quality. PR enforcement prevents new drift from being introduced.

Treat your Istio documentation like you treat your Istio configuration: version-controlled, reviewed, tested, and continuously maintained.
