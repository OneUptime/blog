# How to Configure Custom Branding in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Branding, UI, Customization

Description: A comprehensive guide to configuring custom branding in Rancher, including logos, colors, favicons, and product names across the entire UI.

## Introduction

Rancher's white-labeling capabilities allow enterprises and MSPs to fully replace the default Rancher branding with their own corporate identity. This guide goes beyond the login page and covers branding the entire Rancher dashboard - from favicons to navigation colors.

## Prerequisites

- Rancher v2.6+
- At least cluster member permissions
- Prepared assets: logo (JPEG/PNG/SVG), favicon (PNG/SVG), and brand color hex codes

## Branding Settings Reference

Core branding settings live under `Global Settings → Branding`. In recent Rancher versions, default external links are managed under `Global Settings → Home Links`. For automation, these settings are also available through the legacy Rancher v3 API at `/v3/settings/`.

| Setting Key | Default | Description |
|---|---|---|
| `ui-logo-light` | `unset` | Logo shown in the light theme |
| `ui-logo-dark` | `unset` | Logo shown in the dark theme |
| `ui-favicon` | `unset` | Browser tab icon |
| `ui-primary-color` | `unset` | Primary color used throughout the UI |
| `ui-link-color` | `unset` | Link text color used throughout the UI |
| `ui-pl` | `rancher` | Private-label product name |
| `ui-community-links` | `true` | Show the default Home links/community support links |
| `ui-issues` | `unset` | Custom URL for "File an Issue" reports |

## Step 1: Prepare Your Assets

```bash
# Recommended image specifications from Rancher Dashboard:

# Logo: 21 px tall, max 200 px wide, JPEG/PNG/SVG, max 20 KB
# Favicon: keep it small, PNG or SVG, max 20 KB
# Example below assumes PNG files.

# Convert assets to base64 for API usage
BASE64_LOGO=$(base64 < logo.png | tr -d '\n')
BASE64_FAVICON=$(base64 < favicon.png | tr -d '\n')
```

## Step 2: Apply Branding via the UI

1. Go to **☰ → Global Settings → Branding**.
2. Upload logos for both light and dark modes.
3. Upload the favicon.
4. Use the color picker to set the primary color.
5. Enter your product name in the **Private Label** field.
6. In recent Rancher versions, manage default external links separately under **Home Links** if you need to hide documentation or community shortcuts.
7. Click **Apply**.

## Step 3: Apply Branding via API Script

Create a reusable script to apply branding across multiple Rancher instances:

```bash
#!/usr/bin/env bash
set -euo pipefail

# apply-branding.sh - Apply custom branding to a Rancher instance

RANCHER_URL="${1:?Usage: apply-branding.sh <rancher-url> <api-key>}"
RANCHER_TOKEN="${2:?}"

data_url() {
  local file="$1"
  local mime

  case "${file##*.}" in
    png|PNG) mime="image/png" ;;
    svg|SVG) mime="image/svg+xml" ;;
    jpg|JPG|jpeg|JPEG) mime="image/jpeg" ;;
    *) echo "Unsupported image format: ${file}" >&2; return 1 ;;
  esac

  printf 'data:%s;base64,%s' "${mime}" "$(base64 < "${file}" | tr -d '\n')"
}

apply_setting() {
  local key="$1"
  local value="$2"
  curl -fsSk -u "${RANCHER_TOKEN}" -X PUT \
    -H "Content-Type: application/json" \
    -d "{\"value\": \"${value}\"}" \
    "${RANCHER_URL}/v3/settings/${key}" >/dev/null
  echo "  Set ${key}"
}

# Upload logos and favicon
apply_setting "ui-logo-light"    "$(data_url logo-light.png)"
apply_setting "ui-logo-dark"     "$(data_url logo-dark.png)"
apply_setting "ui-favicon"       "$(data_url favicon.png)"
apply_setting "ui-primary-color" "#1a73e8"
apply_setting "ui-link-color"    "#1a73e8"
apply_setting "ui-pl"            "Acme Kubernetes Platform"
apply_setting "ui-community-links" "false"
apply_setting "ui-issues"        "https://support.example.com/rancher"

echo "Branding applied successfully."
```

```bash
chmod +x apply-branding.sh
./apply-branding.sh https://rancher.example.com token-xxxxx:yyyyy
```

## Step 4: Persist Branding Through Upgrades

Branding settings are stored in the Rancher database and survive upgrades. However, if you re-initialize or restore the database without those settings, you will need to re-apply them. To make that easy after disaster recovery, store the script in version control or in a Kubernetes Secret used by your automation:

```yaml
# Store branding as a Kubernetes Secret for GitOps pipelines
apiVersion: v1
kind: Secret
metadata:
  name: rancher-branding-config
  namespace: cattle-system
type: Opaque
stringData:
  apply-branding.sh: |
    # (paste script contents here)
```

The Secret only stores the script. Your recovery workflow still needs to run it.

## Step 5: Hide Community and Documentation Links

For air-gapped or compliance environments where external Home links must be removed or redirected:

```bash
# Hide the default Home links (docs, forums, Slack, etc.)
curl -fsSk -u "$RANCHER_TOKEN" -X PUT \
  -H "Content-Type: application/json" \
  -d '{"value": "false"}' \
  "https://<rancher-url>/v3/settings/ui-community-links"

# Optional: send "File an Issue" to an internal support URL
curl -fsSk -u "$RANCHER_TOKEN" -X PUT \
  -H "Content-Type: application/json" \
  -d '{"value": "https://support.example.com/rancher"}' \
  "https://<rancher-url>/v3/settings/ui-issues"
```

## Verifying Branding Changes

After applying, perform a hard refresh (`Ctrl+Shift+R`) in your browser and check:

- Logo appears in the top-left corner.
- Favicon appears in the browser tab.
- Buttons and links use the custom primary color.
- Link text uses the custom link color (if set).
- The page title shows your product name.
- Default external Home links are hidden or redirected (if configured).

## Conclusion

Custom branding in Rancher lets you deliver a seamless, white-labeled Kubernetes management experience. By configuring logos, colors, favicons, and product names - and automating the process with scripts - you can ensure consistent branding across all environments while maintaining a professional, enterprise-grade interface for your users.
