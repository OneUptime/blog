# How to Use Podman with Clair for Image Scanning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Clair, Image Scanning, Security, Vulnerability Analysis

Description: Learn how to use Clair with Podman to perform static vulnerability analysis of container images, integrating automated scanning into your container registry workflow.

---

> Clair integrated with your Podman workflow provides continuous, registry-level vulnerability scanning for images that have been pushed to a registry accessible to Clair.

Clair is an open-source vulnerability scanner designed specifically for container images. Unlike client-side scanners that inspect local images directly, Clair operates as a service that indexes image manifests submitted by a client or registry integration. Clair then fetches the referenced layers, stores an index report, and matches that indexed content against its vulnerability data. With a registry integration such as Project Quay or a webhook-driven workflow, pushed images can be indexed automatically and re-checked as vulnerability data changes.

---

## Deploying Clair with Podman

Clair can run in `indexer`, `matcher`, `notifier`, or `combo` mode. For a single-node Podman deployment, `combo` mode is the simplest way to run all three services together:

```bash
mkdir -p ~/clair/config
```

Create the Clair configuration:

```yaml
# ~/clair/config/clair-config.yml

http_listen_addr: "0.0.0.0:6060"
introspection_addr: "0.0.0.0:8089"
log_level: info

indexer:
  connstring: host=clair-db port=5432 dbname=clair user=clair password=clairpass sslmode=disable
  scanlock_retry: 10
  layer_scan_concurrency: 5
  migrations: true

matcher:
  connstring: host=clair-db port=5432 dbname=clair user=clair password=clairpass sslmode=disable
  max_conn_pool: 100
  migrations: true

notifier:
  connstring: host=clair-db port=5432 dbname=clair user=clair password=clairpass sslmode=disable
  migrations: true
  poll_interval: 5m
  delivery_interval: 1m
```

Deploy using Compose:

```yaml
# clair-stack.yml
version: "3"
services:
  clair:
    image: quay.io/projectquay/clair:v4.8.0
    restart: always
    environment:
      CLAIR_MODE: combo
      CLAIR_CONF: /etc/clair/config.yml
    ports:
      - "6060:6060"
      - "8089:8089"
    volumes:
      - ./clair/config/clair-config.yml:/etc/clair/config.yml:ro
    depends_on:
      clair-db:
        condition: service_healthy

  clair-db:
    image: postgres:16
    restart: always
    environment:
      POSTGRES_USER: clair
      POSTGRES_PASSWORD: clairpass
      POSTGRES_DB: clair
    volumes:
      - clair-db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U clair"]
      interval: 10s
      timeout: 5s
      retries: 5

  registry:
    image: registry:2
    restart: always
    ports:
      - "5000:5000"
    volumes:
      - registry-data:/var/lib/registry

volumes:
  clair-db-data:
  registry-data:
```

```bash
podman compose -f clair-stack.yml up -d
```

## Using clairctl for Image Analysis

Use the `clairctl` tool to submit images that have already been pushed to a registry accessible to Clair:

```bash
# Install clairctl
go install github.com/quay/clair/v4/cmd/clairctl@v4.8.0

# Push the image to a registry that Clair can reach
podman tag myapp:latest registry.example.com/myapp:latest
podman push registry.example.com/myapp:latest

# Submit an image for indexing and vulnerability matching
clairctl report --host http://localhost:6060 registry.example.com/myapp:latest

# Submit using the Clair API directly
clairctl manifest registry.example.com/myapp:latest > manifest.json

curl -X POST http://localhost:6060/indexer/api/v1/index_report \
  -H "Content-Type: application/vnd.clair.manifest.v1+json" \
  -H "Accept: application/vnd.clair.index_report.v1+json" \
  --data @manifest.json
```

## Scanning Images with the Clair API

Create a script to scan images through Clair after they have been pushed to a registry:

```bash
#!/bin/bash
# clair-scan.sh

set -euo pipefail

IMAGE_REF="$1"
CLAIR_URL="${CLAIR_URL:-http://localhost:6060}"

echo "Scanning $IMAGE_REF with Clair..."

# Generate a Clair manifest from the registry image reference
MANIFEST_JSON=$(clairctl manifest "$IMAGE_REF")
MANIFEST_DIGEST=$(echo "$MANIFEST_JSON" | jq -r '.hash')

# Submit the manifest to Clair
INDEX_RESPONSE=$(curl -fsS -X POST "${CLAIR_URL}/indexer/api/v1/index_report" \
  -H "Content-Type: application/vnd.clair.manifest.v1+json" \
  -H "Accept: application/vnd.clair.index_report.v1+json" \
  --data "$MANIFEST_JSON")

echo "Index response: $INDEX_RESPONSE"

# Get the vulnerability report
VULN_REPORT=$(curl -fsS \
  -H "Accept: application/vnd.clair.vulnerability_report.v1+json" \
  "${CLAIR_URL}/matcher/api/v1/vulnerability_report/${MANIFEST_DIGEST}")

echo "$VULN_REPORT" | jq .
```

## Python Client for Clair

Build a more sophisticated scanning client:

```python
# clair_scanner.py
import requests
import json
import subprocess
import sys

class ClairScanner:
    def __init__(self, clair_url="http://localhost:6060"):
        self.clair_url = clair_url

    def get_image_manifest(self, image):
        """Get a Clair manifest for an image stored in a registry."""
        result = subprocess.run(
            ["clairctl", "manifest", image],
            capture_output=True, text=True, check=True
        )
        return json.loads(result.stdout)

    def submit_for_indexing(self, manifest):
        """Submit an image manifest to Clair for indexing."""
        response = requests.post(
            f"{self.clair_url}/indexer/api/v1/index_report",
            json=manifest,
            headers={
                "Content-Type": "application/vnd.clair.manifest.v1+json",
                "Accept": "application/vnd.clair.index_report.v1+json",
            }
        )
        response.raise_for_status()
        return response.json()

    def get_vulnerability_report(self, manifest_hash):
        """Get the vulnerability report for an indexed image."""
        response = requests.get(
            f"{self.clair_url}/matcher/api/v1/vulnerability_report/{manifest_hash}",
            headers={"Accept": "application/vnd.clair.vulnerability_report.v1+json"}
        )
        response.raise_for_status()
        return response.json()

    def scan(self, image):
        """Full scan: index and get vulnerabilities."""
        print(f"Scanning {image}...")

        try:
            manifest = self.get_image_manifest(image)
        except subprocess.CalledProcessError as err:
            print(f"Error: Could not generate a Clair manifest for {image}")
            print(err.stderr.strip())
            return None

        if not manifest:
            print(f"Error: Could not generate a Clair manifest for {image}")
            return None

        digest = manifest.get("hash", "")
        index_result = self.submit_for_indexing(manifest)

        if not index_result.get("success", True):
            return index_result

        report = self.get_vulnerability_report(digest)
        return self.summarize_report(report)

    def summarize_report(self, report):
        """Summarize vulnerability findings."""
        vulnerabilities = report.get("vulnerabilities", {})
        packages = report.get("packages", {})
        package_vulnerabilities = report.get("package_vulnerabilities", {})

        summary = {
            "total": len(vulnerabilities),
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "details": []
        }

        for vuln_id, vuln in vulnerabilities.items():
            severity = vuln.get("normalized_severity", "Unknown").lower()
            if severity in summary:
                summary[severity] += 1

        for package_id, vuln_ids in package_vulnerabilities.items():
            package = packages.get(package_id, {})

            for vuln_id in vuln_ids:
                vuln = vulnerabilities.get(vuln_id, {})
                severity = vuln.get("normalized_severity", "Unknown").lower()

                if severity not in ["critical", "high"]:
                    continue

                summary["details"].append({
                    "id": vuln.get("name", vuln_id),
                    "severity": severity,
                    "package": package.get("name", "unknown"),
                    "fixed_in": vuln.get("fixed_in_version", "N/A"),
                    "description": vuln.get("description", "")[:200],
                })

        return summary

if __name__ == "__main__":
    scanner = ClairScanner()
    image = sys.argv[1] if len(sys.argv) > 1 else "registry.example.com/myapp:latest"
    result = scanner.scan(image)

    if result:
        print(f"\nVulnerability Summary for {image}:")
        print(f"  Critical: {result['critical']}")
        print(f"  High: {result['high']}")
        print(f"  Medium: {result['medium']}")
        print(f"  Low: {result['low']}")
        print(f"  Total: {result['total']}")

        if result["details"]:
            print("\nHigh/Critical vulnerabilities:")
            for vuln in result["details"]:
                print(f"  {vuln['id']} ({vuln['severity']}) in {vuln['package']} - Fix: {vuln['fixed_in']}")
```

## Integrating Clair with a Container Registry

Configure Clair to automatically scan images pushed to your registry:

```yaml
# Project Quay configuration
# quay-config.yml
FEATURE_SECURITY_SCANNER: true
SECURITY_SCANNER_V4_ENDPOINT: http://clair:6060
SECURITY_SCANNER_V4_NAMESPACE_WHITELIST:
  - "myorg"
```

For a standalone registry, use webhook-based scanning:

```yaml
# registry-config.yml
version: 0.1
log:
  fields:
    service: registry
storage:
  filesystem:
    rootdirectory: /var/lib/registry
http:
  addr: :5000
notifications:
  endpoints:
    - name: clair-webhook
      url: http://registry-webhook:8080/webhook/push
      timeout: 500ms
      threshold: 5
      backoff: 1s
```

```python
# registry_webhook.py
from flask import Flask, request
import requests

app = Flask(__name__)

CLAIR_URL = "http://localhost:6060"
MANIFEST_MEDIA_TYPES = {
    "application/vnd.docker.distribution.manifest.v2+json",
    "application/vnd.oci.image.manifest.v1+json",
}

@app.route('/webhook/push', methods=['POST'])
def handle_push():
    """Handle registry manifest push events and trigger Clair scanning."""
    event = request.get_json(silent=True) or {}

    for ev in event.get("events", []):
        if ev.get("action") != "push":
            continue

        target = ev.get("target", {})
        if target.get("mediaType") not in MANIFEST_MEDIA_TYPES:
            continue

        repository = target.get("repository", "")
        digest = target.get("digest", "")
        manifest_url = target.get("url", "")
        if not digest or not manifest_url:
            continue

        print(f"New push: {repository}@{digest}")

        manifest_response = requests.get(
            manifest_url,
            headers={
                "Accept": ", ".join(MANIFEST_MEDIA_TYPES),
            },
            timeout=30,
        )
        manifest_response.raise_for_status()
        image_manifest = manifest_response.json()

        base_url = manifest_url.rsplit("/manifests/", 1)[0]
        clair_manifest = {
            "hash": digest,
            "layers": [
                {
                    "hash": layer["digest"],
                    "uri": f"{base_url}/blobs/{layer['digest']}",
                    "media_type": layer.get("mediaType"),
                    "headers": {},
                }
                for layer in image_manifest.get("layers", [])
            ],
        }

        requests.post(
            f"{CLAIR_URL}/indexer/api/v1/index_report",
            json=clair_manifest,
            headers={
                "Content-Type": "application/vnd.clair.manifest.v1+json",
                "Accept": "application/vnd.clair.index_report.v1+json",
            },
            timeout=30,
        ).raise_for_status()

    return "", 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Notification Configuration

Configure Clair to notify you of new vulnerabilities:

```yaml
# Add to clair-config.yml
notifier:
  connstring: host=clair-db port=5432 dbname=clair user=clair password=clairpass sslmode=disable
  migrations: true
  poll_interval: 5m
  delivery_interval: 1m
  webhook:
    target: "http://alert-handler:8080/clair-alerts"
    callback: "http://clair:6060/notifier/api/v1/notification"
```

Handle notifications:

```python
# alert_handler.py
from flask import Flask, request

app = Flask(__name__)

@app.route('/clair-alerts', methods=['POST'])
def handle_alert():
    notification = request.get_json(silent=True) or {}
    vuln_id = notification.get("notification_id", "unknown")
    print(f"New vulnerability notification: {vuln_id}")
    # Send to Slack, email, or other alerting system
    return "", 200
```

## CI/CD Integration

Add Clair scanning to your pipeline:

```yaml
# .github/workflows/clair-scan.yml
name: Clair Security Scan
on: [push]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: "1.22"

      - name: Install Podman
        run: |
          sudo apt-get update
          sudo apt-get install -y podman

      - name: Log in to registry
        run: |
          echo "${{ secrets.REGISTRY_PASSWORD }}" | podman login registry.example.com \
            --username "${{ secrets.REGISTRY_USERNAME }}" \
            --password-stdin

      - name: Build image
        run: podman build -t registry.example.com/myapp:${{ github.sha }} .

      - name: Push image
        run: podman push registry.example.com/myapp:${{ github.sha }}

      - name: Install clairctl
        run: go install github.com/quay/clair/v4/cmd/clairctl@v4.8.0

      - name: Scan with Clair
        env:
          CLAIR_API: ${{ secrets.CLAIR_API }}
        run: |
          $HOME/go/bin/clairctl report --host "$CLAIR_API" registry.example.com/myapp:${{ github.sha }}
```

## Conclusion

Clair provides continuous, registry-integrated vulnerability scanning for Podman-built container images once those images are available in a registry that Clair can access. Unlike local-only, on-demand scanners, Clair persists indexed manifests and matches them against updated vulnerability data over time. Combined with registry automation and notifications, that makes Clair a strong choice for organizations that need continuous security monitoring of their container image inventory.
