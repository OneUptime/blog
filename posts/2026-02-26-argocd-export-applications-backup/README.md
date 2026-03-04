# How to Export ArgoCD Applications for Backup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Backups, Application

Description: Learn how to export ArgoCD applications in various formats for backup, migration, and version control with practical scripts and best practices.

---

Exporting ArgoCD applications is a focused backup task that captures just the application definitions - the specs that tell ArgoCD what to deploy, where, and how. Unlike a full ArgoCD backup, application export is lightweight and can be run frequently. It is especially useful for migrating applications between ArgoCD instances, creating snapshots before major changes, and maintaining application definitions in version control.

## Quick Export with kubectl

The fastest way to export all applications:

```bash
# Export all applications as YAML
kubectl get applications.argoproj.io -n argocd -o yaml > applications-export.yaml

# Export as individual files (one per application)
mkdir -p argocd-apps-export
for app in $(kubectl get applications.argoproj.io -n argocd -o name); do
  NAME=$(basename "$app")
  kubectl get applications.argoproj.io "$NAME" -n argocd -o yaml \
    > "argocd-apps-export/${NAME}.yaml"
  echo "Exported: $NAME"
done
```

## Export with argocd admin

The ArgoCD admin tool provides a cleaner export:

```bash
# Export all resources (applications, projects, repos, clusters)
argocd admin export -n argocd > full-export.yaml

# The export format is clean YAML with one document per resource
```

## Cleaning Exported Applications

Raw kubectl exports include runtime metadata that should be stripped for clean backups:

```bash
#!/bin/bash
# clean-export.sh - Export applications with cleaned metadata

NAMESPACE="${1:-argocd}"
OUTPUT_DIR="${2:-./argocd-export}"

mkdir -p "$OUTPUT_DIR"

# Get all application names
APPS=$(kubectl get applications.argoproj.io -n "$NAMESPACE" \
  -o jsonpath='{.items[*].metadata.name}')

for APP_NAME in $APPS; do
  echo "Exporting: $APP_NAME"

  # Get the application and clean it
  kubectl get applications.argoproj.io "$APP_NAME" -n "$NAMESPACE" -o json | \
    jq '{
      apiVersion: .apiVersion,
      kind: .kind,
      metadata: {
        name: .metadata.name,
        namespace: .metadata.namespace,
        labels: .metadata.labels,
        annotations: (
          .metadata.annotations | to_entries |
          map(select(.key | startswith("kubectl") | not)) |
          from_entries
        ),
        finalizers: .metadata.finalizers
      },
      spec: .spec
    }' | python3 -c "
import sys, json, yaml
data = json.load(sys.stdin)
# Remove null values
def clean(d):
    if isinstance(d, dict):
        return {k: clean(v) for k, v in d.items() if v is not None}
    elif isinstance(d, list):
        return [clean(i) for i in d]
    return d
print(yaml.dump(clean(data), default_flow_style=False))
" > "$OUTPUT_DIR/${APP_NAME}.yaml"

done

echo ""
echo "Exported $(echo $APPS | wc -w | tr -d ' ') applications to $OUTPUT_DIR"
```

## Export by Project

Export applications grouped by project:

```bash
#!/bin/bash
# export-by-project.sh - Export apps organized by project

OUTPUT_DIR="./argocd-export-$(date +%Y%m%d)"

# Get all projects
PROJECTS=$(kubectl get appprojects.argoproj.io -n argocd \
  -o jsonpath='{.items[*].metadata.name}')

for PROJECT in $PROJECTS; do
  echo "Project: $PROJECT"
  PROJECT_DIR="$OUTPUT_DIR/$PROJECT"
  mkdir -p "$PROJECT_DIR"

  # Export the project itself
  kubectl get appprojects.argoproj.io "$PROJECT" -n argocd -o yaml \
    > "$PROJECT_DIR/_project.yaml"

  # Export applications in this project
  APPS=$(kubectl get applications.argoproj.io -n argocd \
    -o json | jq -r ".items[] | select(.spec.project == \"$PROJECT\") | .metadata.name")

  for APP in $APPS; do
    kubectl get applications.argoproj.io "$APP" -n argocd -o yaml \
      > "$PROJECT_DIR/${APP}.yaml"
    echo "  - $APP"
  done

  APP_COUNT=$(echo "$APPS" | grep -c . || true)
  echo "  Total: $APP_COUNT applications"
  echo ""
done
```

## Export via the API

Use the REST API for programmatic exports:

```bash
# Export all applications via API
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://argocd.example.com/api/v1/applications" | \
  jq '.items[] | {
    apiVersion: "argoproj.io/v1alpha1",
    kind: "Application",
    metadata: {
      name: .metadata.name,
      namespace: .metadata.namespace,
      labels: .metadata.labels,
      annotations: (.metadata.annotations // {} | to_entries |
        map(select(.key | startswith("kubectl") | not)) | from_entries),
      finalizers: .metadata.finalizers
    },
    spec: .spec
  }' > applications-api-export.json
```

### Python Export Script

```python
import requests
import yaml
import json
import os
from datetime import datetime

class ApplicationExporter:
    def __init__(self, server, token):
        self.server = server.rstrip('/')
        self.headers = {"Authorization": f"Bearer {token}"}
        self.verify = False

    def export_all(self, output_dir=None):
        """Export all applications."""
        if output_dir is None:
            output_dir = f"argocd-export-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

        os.makedirs(output_dir, exist_ok=True)

        # Fetch all applications
        resp = requests.get(
            f"{self.server}/api/v1/applications",
            headers=self.headers,
            verify=self.verify
        )
        resp.raise_for_status()
        apps = resp.json().get("items", [])

        exported = []
        for app in apps:
            clean_app = self._clean_app(app)
            name = clean_app["metadata"]["name"]
            filepath = os.path.join(output_dir, f"{name}.yaml")

            with open(filepath, "w") as f:
                yaml.dump(clean_app, f, default_flow_style=False)

            exported.append(name)

        # Create manifest file
        manifest = {
            "export_date": datetime.utcnow().isoformat(),
            "total_applications": len(exported),
            "applications": exported
        }
        with open(os.path.join(output_dir, "manifest.json"), "w") as f:
            json.dump(manifest, f, indent=2)

        return exported

    def _clean_app(self, app):
        """Remove runtime fields from an application."""
        return {
            "apiVersion": "argoproj.io/v1alpha1",
            "kind": "Application",
            "metadata": {
                "name": app["metadata"]["name"],
                "namespace": app["metadata"].get("namespace", "argocd"),
                "labels": app["metadata"].get("labels", {}),
                "annotations": {
                    k: v for k, v in app["metadata"].get("annotations", {}).items()
                    if not k.startswith("kubectl.kubernetes.io")
                },
                "finalizers": app["metadata"].get("finalizers", [])
            },
            "spec": app["spec"]
        }

    def export_diff(self, previous_export_dir, output_dir=None):
        """Export only applications that changed since last export."""
        if output_dir is None:
            output_dir = f"argocd-diff-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

        os.makedirs(output_dir, exist_ok=True)

        # Get current applications
        resp = requests.get(
            f"{self.server}/api/v1/applications",
            headers=self.headers,
            verify=self.verify
        )
        current_apps = {
            app["metadata"]["name"]: self._clean_app(app)
            for app in resp.json().get("items", [])
        }

        # Load previous export
        previous_apps = {}
        for f in os.listdir(previous_export_dir):
            if f.endswith(".yaml"):
                with open(os.path.join(previous_export_dir, f)) as fh:
                    app = yaml.safe_load(fh)
                    if app and app.get("kind") == "Application":
                        previous_apps[app["metadata"]["name"]] = app

        # Find changes
        added = set(current_apps) - set(previous_apps)
        removed = set(previous_apps) - set(current_apps)
        modified = {
            name for name in set(current_apps) & set(previous_apps)
            if current_apps[name]["spec"] != previous_apps[name]["spec"]
        }

        # Export changes
        for name in added | modified:
            filepath = os.path.join(output_dir, f"{name}.yaml")
            with open(filepath, "w") as f:
                yaml.dump(current_apps[name], f, default_flow_style=False)

        print(f"Added: {len(added)}, Modified: {len(modified)}, Removed: {len(removed)}")
        return {"added": list(added), "modified": list(modified), "removed": list(removed)}

# Usage
exporter = ApplicationExporter("https://argocd.example.com", token)
apps = exporter.export_all("./my-export")
print(f"Exported {len(apps)} applications")
```

## Storing Exports in Git

A strong pattern is to store application exports in a Git repository:

```bash
#!/bin/bash
# export-to-git.sh - Export applications and commit to Git

EXPORT_REPO="/path/to/argocd-exports-repo"
NAMESPACE="argocd"

cd "$EXPORT_REPO"
git pull origin main

# Clean previous export
rm -rf applications/

# Export all applications
mkdir -p applications
for APP in $(kubectl get applications.argoproj.io -n "$NAMESPACE" -o name); do
  NAME=$(basename "$APP")
  kubectl get applications.argoproj.io "$NAME" -n "$NAMESPACE" -o json | \
    jq '{
      apiVersion: .apiVersion,
      kind: .kind,
      metadata: {name: .metadata.name, namespace: .metadata.namespace,
                 labels: .metadata.labels, finalizers: .metadata.finalizers},
      spec: .spec
    }' | python3 -c "import sys,json,yaml; print(yaml.dump(json.load(sys.stdin)))" \
    > "applications/${NAME}.yaml"
done

# Commit and push
git add -A
if git diff --staged --quiet; then
  echo "No changes to commit"
else
  git commit -m "ArgoCD application export $(date +%Y-%m-%d)"
  git push origin main
  echo "Export committed and pushed"
fi
```

## Export Format Comparison

| Format | Pros | Cons |
|--------|------|------|
| Single YAML file | Simple, one file to manage | Hard to diff individual apps |
| Per-app YAML files | Easy to diff, Git-friendly | Many files to manage |
| JSON | Easy for programmatic use | Less human-readable |
| argocd admin export | Complete, includes all types | Includes non-application data |

Choose the format that best fits your workflow. For Git-based backups, per-app YAML files work best because Git can track individual file changes.

Exporting ArgoCD applications regularly gives you a safety net for disaster recovery and a clear record of how your deployment configuration evolves over time. Automate it, store exports in version control, and test your restore process periodically.
