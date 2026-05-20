# How to Customize the ArgoCD UI Theme

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, UI Customization, Branding

Description: Learn how to customize the ArgoCD UI theme including colors, dark mode preferences, and visual styling to match your organization's branding and improve the user experience.

---

ArgoCD ships with a clean, functional UI out of the box, but many organizations want to customize its appearance. Whether you need to match corporate branding, distinguish between environments (production vs staging), or just make the dashboard easier to read, ArgoCD provides several customization options.

This guide covers all the ways you can modify the ArgoCD UI theme, from simple built-in settings to advanced CSS customization.

## Built-in Theme Options

ArgoCD supports light and dark themes out of the box. Users can toggle between them using the theme selector in the UI sidebar. However, you might want to set a default for your organization.

### Setting the Default Theme

Unfortunately, there is no server-side ConfigMap setting to force a specific theme for all users. The theme preference is stored in the browser's local storage. However, you can influence the visual appearance with custom CSS.

One approach is to load custom CSS that overrides the default styling:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Custom CSS to modify theme appearance
  ui.cssurl: "https://cdn.example.com/argocd-custom-theme.css"
```

We will cover the CSS approach in detail in the next sections.

## Customizing Colors with CSS Overrides

ArgoCD uses compiled styles from the Argo UI components and adds theme wrapper classes such as `.theme-light` and `.theme-dark`. Custom CSS is applied as an overlay, so target the rendered classes you want to change and test the selectors with your browser's developer tools.

First, create a CSS file and host it somewhere accessible:

```css
/* argocd-custom-theme.css */

/* Override the sidebar color */
.sidebar {
  background-color: #1a237e !important;
}

/* Custom color for the logo area */
.sidebar__logo {
  background-color: #0d47a1 !important;
}

/* Custom color for active navigation icons */
.sidebar__nav-item--active i {
  color: #1a73e8 !important;
}

/* Change the sync status colors if needed */
i[qe-id="utils-sync-status-title"][title^="Synced"] {
  color: #2e7d32 !important;
}

i[qe-id="utils-sync-status-title"][title^="OutOfSync"] {
  color: #f57f17 !important;
}
```

### Hosting the CSS File

You have several options for hosting the custom CSS:

**Option 1: Use a ConfigMap and serve from ArgoCD itself**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-styles
  namespace: argocd
data:
  custom.css: |
    .sidebar {
      background-color: #1a237e !important;
    }
```

Mount this ConfigMap into the ArgoCD server pod and reference it:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  ui.cssurl: "./custom/custom.css"
```

The CSS file must be mounted under a subdirectory of `/shared/app` in the `argocd-server` container, for example `/shared/app/custom/custom.css`, because `ui.cssurl` is resolved relative to `/shared/app`.

**Option 2: Host on a CDN or static file server**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  ui.cssurl: "https://static.example.com/argocd/custom-theme.css"
```

**Option 3: Use a small mounted CSS file**

ArgoCD documents remote URLs and files mounted into the `argocd-server` container. For minor tweaks, keep the CSS small but still serve it using one of those supported methods:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  ui.cssurl: "./custom/small-theme.css"
```

## Environment-Specific Themes

One of the most practical uses of custom themes is color-coding different environments. This helps prevent the dreaded "I thought I was on staging" mistake:

```css
/* production-theme.css - Red tinted to signal danger */
.sidebar {
  background-color: #b71c1c !important;
}

.sidebar::after {
  content: "PRODUCTION";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.3);
  font-size: 24px;
  font-weight: bold;
  letter-spacing: 8px;
  pointer-events: none;
}
```

```css
/* staging-theme.css - Yellow/amber tinted */
.sidebar {
  background-color: #f57f17 !important;
}
```

```css
/* development-theme.css - Green tinted */
.sidebar {
  background-color: #2e7d32 !important;
}
```

Deploy separate ArgoCD instances or configure them with different `ui.cssurl` values per environment.

## Customizing the Dark Theme

If your team uses the dark theme, you can customize its colors specifically:

```css
/* Custom dark theme overrides */
.theme-dark .cd-layout {
  background-color: #1a1a2e !important;
}

/* Dark theme navigation */
.theme-dark .sidebar {
  background-color: #0a1628 !important;
  border-right-color: #1a3050 !important;
}

/* Dark theme cards */
.theme-dark .white-box {
  background-color: #162032 !important;
  border-color: #1a3050 !important;
  color: #e4e4e4 !important;
}
```

## Customizing the Resource Tree Colors

The resource tree is the most visual part of ArgoCD. You can customize the health status colors:

```css
/* Custom health status colors */
i[qe-id="utils-health-status-title"][title^="Healthy"] {
  color: #00c853 !important;
}

i[qe-id="utils-health-status-title"][title^="Degraded"] {
  color: #ff1744 !important;
}

i[qe-id="utils-health-status-title"][title^="Progressing"],
svg[qe-id="utils-health-status-title"] {
  color: #2979ff !important;
}

svg[qe-id="utils-health-status-title"] path {
  fill: #2979ff !important;
}

i[qe-id="utils-health-status-title"][title^="Suspended"] {
  color: #9e9e9e !important;
}

i[qe-id="utils-health-status-title"][title^="Missing"] {
  color: #ff9100 !important;
}

/* Custom sync status colors */
i[qe-id="utils-sync-status-title"][title^="Synced"] {
  color: #00c853 !important;
}

i[qe-id="utils-sync-status-title"][title^="OutOfSync"] {
  color: #ffab00 !important;
}

i[qe-id="utils-sync-status-title"][title^="Unknown"],
svg[qe-id="utils-sync-status-title"] {
  color: #9e9e9e !important;
}

svg[qe-id="utils-sync-status-title"] path {
  fill: #9e9e9e !important;
}
```

## Typography Customization

You can change fonts to match your organization's style guide:

```css
/* Import a custom font */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* Apply to the entire UI */
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
}

/* Customize heading sizes */
h1, .title {
  font-weight: 700 !important;
}

h2, .subtitle {
  font-weight: 600 !important;
}

/* Adjust code blocks */
code, pre {
  font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
}
```

## Applying Theme Changes with Helm

If you deploy ArgoCD with Helm, configure the theme through values:

```yaml
# values.yaml

server:
  # Mount custom CSS from a ConfigMap
  volumes:
    - name: custom-css
      configMap:
        name: argocd-custom-css
  volumeMounts:
    - name: custom-css
      mountPath: /shared/app/custom

configs:
  cm:
    ui.cssurl: "./custom/theme.css"
```

## Verifying Theme Changes

After applying your CSS changes:

```bash
# Apply the ConfigMap
kubectl apply -f argocd-cm.yaml -n argocd

# The ArgoCD server does not need a restart for CSS URL changes
# Just refresh the browser

# Verify the setting is applied
kubectl get configmap argocd-cm -n argocd -o jsonpath='{.data.ui\.cssurl}'
```

Open the ArgoCD UI in your browser and do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R) to see the changes.

## Troubleshooting Theme Issues

**CSS not loading**: Check that the CSS URL is accessible from the browser (not just from within the cluster). Open the URL directly in your browser to verify.

**Styles partially applied**: CSS specificity issues are common. Use `!important` on overrides or increase selector specificity.

**Changes not visible**: Browser caching can prevent updates. Clear your browser cache or use a versioned CSS URL (e.g., `theme.css?v=2`).

**CORS errors**: If hosting CSS on a different domain, ensure the hosting server sends proper CORS headers:

```text
Access-Control-Allow-Origin: https://argocd.example.com
```

## Conclusion

Customizing the ArgoCD UI theme is a straightforward way to improve the user experience and add visual safety cues to your deployment dashboard. Environment-specific color coding alone can prevent accidental production deployments. Start with the sidebar color as the highest-impact, lowest-effort change, then expand to full branding if needed. For more CSS customization options, check our guide on [adding custom CSS to ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-custom-css/view).
