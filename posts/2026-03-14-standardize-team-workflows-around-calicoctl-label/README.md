# Standardizing Team Workflows Around calicoctl label

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Labels, Team Workflows, Best Practices, Kubernetes

Description: Establish consistent labeling conventions and team workflows for calicoctl label to ensure reliable network policy enforcement across your organization.

---

## Introduction

When multiple team members manage Calico labels independently, inconsistencies inevitably arise. One engineer might use `env=prod` while another uses `environment=production`. These inconsistencies cause network policies to miss resources, creating security gaps that are difficult to detect.

Standardizing label workflows across your team requires clear naming conventions, shared tooling, review processes, and automated enforcement. The goal is to make it easy to do the right thing and hard to introduce label inconsistencies.

This guide provides a framework for team-wide label standardization, covering conventions, governance, shared scripts, and automated compliance checking.

## Prerequisites

- A team managing Calico across one or more clusters
- Agreement on the need for labeling standards
- A shared documentation or wiki system
- Git-based workflow for infrastructure changes

## Defining a Label Taxonomy

Start by defining a standard set of label keys and allowed values:

```yaml
# label-taxonomy.yaml
# Standard label definitions for all Calico resources
labels:
  required:
    - key: env
      description: "Deployment environment"
      allowed_values: ["production", "staging", "development", "testing"]
      
    - key: team
      description: "Owning team"
      allowed_values: ["platform", "security", "application", "data"]
      
    - key: tier
      description: "Application tier"
      allowed_values: ["frontend", "backend", "database", "cache", "monitoring"]

  optional:
    - key: compliance
      description: "Compliance requirement"
      allowed_values: ["pci", "hipaa", "sox", "none"]
      
    - key: cost-center
      description: "Cost allocation center"
      pattern: "^[A-Z]{2}-[0-9]{4}$"
```

## Label Compliance Checker

Enforce the taxonomy with an automated checker:

```bash
#!/bin/bash
# check-label-compliance.sh
# Validates that all Calico node labels comply with team standards

TAXONOMY_FILE="${1:-label-taxonomy.yaml}"

calicoctl get nodes -o json | python3 -c "
import json, sys, re

# Define the taxonomy inline (or parse from YAML)
REQUIRED_LABELS = {
    'env': ['production', 'staging', 'development', 'testing'],
    'team': ['platform', 'security', 'application', 'data'],
}

OPTIONAL_LABELS = {
    'tier': ['frontend', 'backend', 'database', 'cache', 'monitoring'],
    'compliance': ['pci', 'hipaa', 'sox', 'none'],
}

# System labels to ignore
SYSTEM_PREFIXES = ['projectcalico.org/', 'kubernetes.io/', 'beta.kubernetes.io/']

data = json.load(sys.stdin)
items = data.get('items', [data]) if 'items' in data else [data]

errors = 0
warnings = 0

for node in items:
    name = node['metadata']['name']
    labels = node['metadata'].get('labels', {})
    
    print(f'Node: {name}')
    
    # Check required labels exist
    for key, allowed in REQUIRED_LABELS.items():
        value = labels.get(key)
        if value is None:
            print(f'  ERROR: Missing required label \"{key}\"')
            errors += 1
        elif value not in allowed:
            print(f'  ERROR: Invalid value for \"{key}\": \"{value}\" (allowed: {allowed})')
            errors += 1
        else:
            print(f'  OK: {key}={value}')
    
    # Check optional labels have valid values if present
    for key, allowed in OPTIONAL_LABELS.items():
        value = labels.get(key)
        if value is not None and value not in allowed:
            print(f'  WARN: Non-standard value for \"{key}\": \"{value}\"')
            warnings += 1
    
    # Check for unknown labels
    for key in labels:
        is_system = any(key.startswith(p) for p in SYSTEM_PREFIXES)
        is_known = key in REQUIRED_LABELS or key in OPTIONAL_LABELS
        if not is_system and not is_known:
            print(f'  WARN: Unknown label \"{key}\" - consider adding to taxonomy')
            warnings += 1
    print()

print(f'Summary: {errors} errors, {warnings} warnings')
sys.exit(1 if errors > 0 else 0)
"
```

## Git-Based Label Change Workflow

Require all label changes to go through pull requests:

```text
calico-labels/
  ├── label-taxonomy.yaml       # Label standards
  ├── production/
  │   ├── node-worker-1.yaml    # Per-node label definitions
  │   ├── node-worker-2.yaml
  │   └── node-worker-3.yaml
  ├── staging/
  │   └── ...
  └── scripts/
      ├── apply-labels.sh
      ├── check-compliance.sh
      └── diff-labels.sh
```

Each node file contains the desired labels:

```yaml
# production/node-worker-1.yaml
apiVersion: projectcalico.org/v3
kind: Node
metadata:
  name: worker-1
  labels:
    env: production
    team: platform
    tier: compute
    compliance: pci
```

## Pull Request Review Checklist

Include a PR template for label changes:

```markdown
## Label Change Request

### Affected Resources
- [ ] List nodes/endpoints being modified

### Changes
- [ ] Labels added: ...
- [ ] Labels modified: ...
- [ ] Labels removed: ...

### Impact Assessment
- [ ] Identified all network policies using affected labels
- [ ] Verified no policy selectors will break
- [ ] Tested in staging first

### Rollback Plan
- [ ] Label snapshot taken before change
- [ ] Rollback script prepared
```

## Shared Team Scripts

Provide a standard set of scripts for the team:

```bash
#!/bin/bash
# team-label-apply.sh
# Standard script for applying label changes from the git repo

ENV="${1:-staging}"
LABEL_DIR="calico-labels/${ENV}"

if [ ! -d "$LABEL_DIR" ]; then
  echo "Environment directory not found: $LABEL_DIR"
  exit 1
fi

# Run compliance check first
echo "Running compliance check..."
./scripts/check-compliance.sh
if [ $? -ne 0 ]; then
  echo "Compliance check failed. Fix errors before applying."
  exit 1
fi

# Take snapshot
SNAPSHOT="label-snapshots/${ENV}-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$SNAPSHOT"
calicoctl get nodes -o json > "$SNAPSHOT/nodes.json"
echo "Snapshot saved to $SNAPSHOT"

# Apply labels
echo "Applying labels for $ENV..."
for f in "$LABEL_DIR"/*.yaml; do
  echo "  Applying $f..."
  calicoctl apply -f "$f"
done

echo "Labels applied. Run verification:"
echo "  calicoctl get nodes -o yaml | grep -A10 labels:"
```

## Verification

Verify your team standards are working:

```bash
# Run the compliance checker
./check-label-compliance.sh

# Verify all nodes have required labels
calicoctl get nodes -l env
calicoctl get nodes -l team

# Check that no unlabeled nodes exist
TOTAL=$(calicoctl get nodes -o json | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('items',[])))")
LABELED=$(calicoctl get nodes -l env -o json | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('items',[])))")
echo "Total: $TOTAL, Labeled: $LABELED"
```

## Troubleshooting

- **Team members bypassing the workflow**: Add CI checks that detect label changes not committed through the git repository. Compare live state against git-defined state.
- **Taxonomy too restrictive**: Allow teams to propose new labels through PRs to the taxonomy file. Include an "experimental" label category for temporary use.
- **Compliance check is slow on large clusters**: Cache the node list and run checks locally. Only query the cluster for the final verification step.

## Conclusion

Standardized label workflows transform ad-hoc label management into a governed, auditable process. By defining a taxonomy, enforcing compliance automatically, and routing all changes through code review, your team ensures that Calico network policies work reliably across every environment and every engineer.
