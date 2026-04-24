# How to Customize the Rancher Login Page

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, UI, Customization

Description: Learn how to customize the Rancher login page with custom logos, banners, and branding to match your organization's identity.

## Introduction

The Rancher login page is often the first impression users get of your Kubernetes management platform. Rancher provides built-in settings to replace the default SUSE/Rancher branding with your own logo, background, and messaging. This guide covers all available customization options and how to apply them.

## Prerequisites

- Rancher v2.6.0 or later
- Admin access to the Rancher UI
- Your logo image in JPEG, PNG, or SVG format (for logos, Rancher recommends a 21 px height with a maximum width of 200 px)

## Customization Options Overview

Rancher exposes login-page branding controls under **Global Settings** → **Branding** for logos, colors, and backgrounds, and under **Global Settings** → **Banners** for fixed notices. The login page specifically supports:

| Setting | Description |
|---|---|
| `ui-logo-light` | Logo used in light theme |
| `ui-logo-dark` | Logo used in dark theme |
| `ui-login-background-light` | Login background used in light theme |
| `ui-login-background-dark` | Login background used in dark theme |
| `ui-primary-color` | Primary accent color |
| `ui-link-color` | Link color |
| `ui-pl` | Custom product name string |
| `ui-banners` | JSON configuration for fixed header, footer, and login consent banners |

## Step 1: Access Branding Settings via the UI

1. Log in to Rancher as **admin**.
2. Click the hamburger menu → **Global Settings**.
3. Select the **Branding** tab.
4. Upload your logo under **Upload Light Logo** and **Upload Dark Logo**.
5. To change the login page background, enable **Use a Custom Background** and upload **Upload Light Background** and **Upload Dark Background** images.
6. Adjust **Primary Color** and **Link Color** using the color pickers.
7. Click **Apply**.

## Step 2: Set Branding via the Rancher API

For automated or GitOps-driven workflows, use the Rancher API:

```bash
# Set the light-theme logo (base64-encoded PNG)

LOGO_B64=$(base64 -w 0 /path/to/logo-light.png)

curl -sk -X PUT \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"value\": \"data:image/png;base64,${LOGO_B64}\"}" \
  "https://<rancher-url>/v1/management.cattle.io.settings/ui-logo-light"

# Set the primary color
curl -sk -X PUT \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "#1a73e8"}' \
  "https://<rancher-url>/v1/management.cattle.io.settings/ui-primary-color"

# Set the product name
curl -sk -X PUT \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "Acme Kubernetes Platform"}' \
  "https://<rancher-url>/v1/management.cattle.io.settings/ui-pl"
```

## Step 3: Add a Login Banner Message

Compliance-heavy environments often need a legal notice on the login screen.

```bash
# Configure the login consent banner. Rancher sanitizes HTML content.
curl -sk -X PUT \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"value":"{\"bannerConsent\":{\"html\":\"<b>Authorized users only.</b> All activity is monitored.\",\"color\":\"#141419\",\"background\":\"#EEEFF4\"},\"showConsent\":\"true\"}"}' \
  "https://<rancher-url>/v1/management.cattle.io.settings/ui-banners"
```

## Step 4: Automate Branding After a Helm Install

Rancher's Helm chart supports `extraEnv`, but it does not provide dedicated Helm values for `ui-pl`, `ui-primary-color`, logos, login backgrounds, or login banners. For fresh installs, install or upgrade Rancher with Helm first, then apply branding through the Rancher settings API shown above.

```bash
helm upgrade --install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --create-namespace \
  --set hostname=<rancher-hostname>
```

## Step 5: Verify the Changes

Open an incognito browser window and navigate to your Rancher URL. You should see:

- Your custom logo in place of the Rancher logo.
- Your custom login background, if configured.
- The custom primary color on buttons and other accent elements.
- The product name in the page title and header.
- The login banner (if configured).

## Resetting to Defaults

```bash
# Reset the light-theme logo to Rancher's default
curl -sk -X PUT \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": ""}' \
  "https://<rancher-url>/v1/management.cattle.io.settings/ui-logo-light"
```

## Conclusion

Customizing the Rancher login page is straightforward through the Branding and Banners settings panels or the Rancher API. By replacing logos, adjusting colors, setting the product name, changing the login background, and adding compliance banners, you can create a professional, on-brand experience for your users. Automating these settings through the Rancher settings API ensures consistent branding across environments, including Helm-managed installs.
