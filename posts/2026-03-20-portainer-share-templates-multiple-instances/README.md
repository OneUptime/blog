# How to Share Templates Across Multiple Portainer Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Template, Multi-Instance, DevOps

Description: Learn strategies for sharing and synchronizing custom templates across multiple Portainer instances in your infrastructure.

## Introduction

As organizations scale their Docker infrastructure, they often run multiple Portainer instances - for different environments, data centers, or teams. Maintaining consistent templates across all instances manually is error-prone and time-consuming. This guide covers proven strategies for sharing templates across multiple Portainer instances.

## Prerequisites

- Two or more Portainer CE or BE instances (Portainer BE is required for custom templates)
- A centralized location for template storage (Git, web server, or S3)
- Admin access to all Portainer instances

## Strategy 1: Shared Template URL (Recommended)

The simplest approach: configure all Portainer instances to point to the same template JSON URL.

```text
[Portainer Instance 1] ─────┐
[Portainer Instance 2] ──── ├──→ https://templates.company.com/templates.json
[Portainer Instance 3] ─────┘
```

### Implementation

1. Host your `templates.json` on a web server (see the web server hosting guide)
2. Configure each Portainer instance to use the same URL:

**Via Portainer UI (per instance):**
1. Settings → General → App Templates
2. Enter: `https://templates.company.com/templates.json`
3. Save application settings

**Via Portainer CLI flag (at Portainer startup):**

```bash
# Set the template URL when starting Portainer

docker run -d \
  --name portainer \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts \
  --templates https://templates.company.com/templates.json
```

Or in Docker Compose:

```yaml
# docker-compose.yml for Portainer with custom templates
services:
  portainer:
    image: portainer/portainer-ce:sts
    command: --templates https://templates.company.com/templates.json
    ports:
      - "9443:9443"
      - "8000:8000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer-data:/data
    restart: unless-stopped

volumes:
  portainer-data:
```

### Advantages

- Zero per-instance configuration after initial setup
- All instances read from the same template source
- Single source of truth

## Strategy 2: Git Repository with Webhooks

Store templates in Git and publish updates to your shared template URL when the repository changes.

```bash
# Repository structure for centralized templates
portainer-templates/
├── templates.json          # Template definitions
├── stacks/                 # Compose files for stack templates
└── Makefile                # Automation helpers
```

### Makefile for Template Management

```makefile
# Makefile for template distribution
TEMPLATE_SERVER = templates.company.com
PORTAINER_INSTANCES = portainer1.company.com portainer2.company.com portainer3.company.com
PORTAINER_USERNAME ?= admin
PORTAINER_PASSWORD ?= $(error Set PORTAINER_PASSWORD)

.PHONY: validate deploy

validate:
	python3 -m json.tool templates.json > /dev/null && echo "JSON valid"
	@python3 -c 'import json; d=json.load(open("templates.json")); print("Template count:", len(d["templates"]))'

deploy: validate
	# Upload to template server
	rsync -av . $(TEMPLATE_SERVER):/opt/portainer-templates/

	# Verify each Portainer instance can fetch the templates
	@for host in $(PORTAINER_INSTANCES); do \
	    echo "Checking $$host..."; \
	    TOKEN=$$(curl -sk https://$$host:9443/api/auth \
	        -H "Content-Type: application/json" \
	        -d '{"Username":"$(PORTAINER_USERNAME)","Password":"$(PORTAINER_PASSWORD)"}' | \
	        python3 -c 'import json,sys; print(json.load(sys.stdin)["jwt"])' 2>/dev/null); \
	    if [ -n "$$TOKEN" ]; then \
	        curl -sk https://$$host:9443/api/templates \
	            -H "Authorization: Bearer $$TOKEN" | \
	            python3 -c 'import json,sys; d=json.load(sys.stdin); print("  Templates:", len(d["templates"]))' || \
	            echo "  WARNING: Could not verify $$host"; \
	    else \
	        echo "  WARNING: Could not authenticate to $$host"; \
	    fi; \
	done
```

## Strategy 3: Portainer API Automation

Use the Portainer API to programmatically sync Git-backed custom templates in Portainer Business Edition:

```bash
#!/bin/bash
# sync-custom-templates.sh
# Sync Git-backed custom templates to multiple Portainer instances

INSTANCES=(
  "https://portainer1.company.com:9443"
  "https://portainer2.company.com:9443"
  "https://portainer3.company.com:9443"
)

TEMPLATE_FILE="custom-templates-api.json"
PORTAINER_USERNAME="${PORTAINER_USERNAME:-admin}"

# Function to get auth token
get_token() {
    local base_url="$1"
    curl -sk "$base_url/api/auth" \
        -H "Content-Type: application/json" \
        -d '{"Username":"'"$PORTAINER_USERNAME"'","Password":"'"$PORTAINER_ADMIN_PASSWORD"'"}' | \
        python3 -c "import json,sys; print(json.load(sys.stdin)['jwt'])"
}

# Deploy to each instance
for instance in "${INSTANCES[@]}"; do
    echo "Syncing to $instance..."

    TOKEN=$(get_token "$instance")
    if [ -z "$TOKEN" ]; then
        echo "  ERROR: Failed to authenticate with $instance"
        continue
    fi

    # Each object in $TEMPLATE_FILE should match the
    # POST /api/custom_templates/create/repository payload.
    EXISTING_TEMPLATES=$(curl -sk "$instance/api/custom_templates" \
        -H "Authorization: Bearer $TOKEN")

    while IFS= read -r template; do
        TITLE=$(printf '%s' "$template" | \
            python3 -c "import json,sys; print(json.load(sys.stdin)['Title'])")
        EXISTING_ID=$(TITLE="$TITLE" printf '%s' "$EXISTING_TEMPLATES" | \
            python3 -c 'import json,os,sys; title=os.environ["TITLE"]; data=json.load(sys.stdin); print(next((str(t["Id"]) for t in data if t["Title"] == title), ""))')

        if [ -n "$EXISTING_ID" ]; then
            curl -sk -X PUT "$instance/api/custom_templates/$EXISTING_ID" \
                -H "Authorization: Bearer $TOKEN" \
                -H "Content-Type: application/json" \
                -d "$template" > /dev/null
            echo "  Updated: $TITLE"
        else
            curl -sk -X POST "$instance/api/custom_templates/create/repository" \
                -H "Authorization: Bearer $TOKEN" \
                -H "Content-Type: application/json" \
                -d "$template" > /dev/null
            echo "  Created: $TITLE"
        fi
    done < <(python3 -c "
import json
with open('$TEMPLATE_FILE') as f:
    data = json.load(f)
for t in data['templates']:
    print(json.dumps(t))
")

done
```

## Strategy 4: Portainer Business Edition (RBAC + Multi-Cluster)

In Portainer BE, custom templates use Portainer's access controls and RBAC for more granular sharing:

- Administrators can restrict a custom template to specific users or teams
- Custom template access follows the resource control assigned to the template
- Portainer BE still does not natively sync custom templates across separate Portainer instances

For multi-instance sharing, use the shared URL approach for app templates and API automation if you need to duplicate BE custom templates between instances.

## Keeping Templates in Sync

### Automated Template Validation

```bash
#!/bin/bash
# validate-templates.sh - Run as CI/CD step before pushing

python3 << 'EOF'
import json, sys

with open('templates.json') as f:
    data = json.load(f)

errors = 0
for i, t in enumerate(data['templates']):
    name = t.get('title', f'Template #{i}')

    # Check required fields
    if not t.get('type'):
        print(f"ERROR [{name}]: missing type")
        errors += 1
    if not t.get('title'):
        print(f"ERROR [{name}]: missing title")
        errors += 1
    if t.get('type') == 1 and not t.get('image'):
        print(f"ERROR [{name}]: container template missing image")
        errors += 1
    if t.get('type') in (2, 3) and not t.get('repository'):
        print(f"ERROR [{name}]: stack template missing repository")
        errors += 1

print(f"\n{len(data['templates'])} templates validated, {errors} errors")
sys.exit(1 if errors > 0 else 0)
EOF
```

### CI/CD Pipeline Integration

```yaml
# .github/workflows/deploy-templates.yml
name: Deploy Templates

on:
  push:
    branches: [main]

jobs:
  validate-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate JSON
        run: python3 -m json.tool templates.json > /dev/null

      - name: Deploy to Template Server
        run: |
          rsync -av --delete . \
            ${{ secrets.TEMPLATE_SERVER_USER }}@${{ secrets.TEMPLATE_SERVER }}:/opt/portainer-templates/
```

## Conclusion

Sharing templates across multiple Portainer instances is best achieved by hosting templates at a shared URL and configuring each Portainer instance to use that URL. This approach requires minimal maintenance, centralizes updates, and scales to any number of instances. Combine it with CI/CD validation to ensure your shared template catalog remains correct and up-to-date.
