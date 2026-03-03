# How to Add Custom CSS to ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, UI Customization, CSS

Description: Learn how to add custom CSS to the ArgoCD UI using the ui.cssurl configuration, including hosting options, common styling patterns, and best practices for maintainable customizations.

---

ArgoCD allows you to inject custom CSS into its web UI through the `ui.cssurl` configuration setting. This feature lets you modify virtually any visual aspect of the ArgoCD dashboard without rebuilding the application. From changing colors and fonts to hiding UI elements and adding custom indicators, custom CSS gives you full control over the ArgoCD look and feel.

This guide covers the technical details of how to add custom CSS, multiple hosting strategies, and practical CSS patterns for common customization needs.

## How ui.cssurl Works

The `ui.cssurl` setting in the `argocd-cm` ConfigMap tells the ArgoCD UI to load an additional CSS stylesheet. The stylesheet is loaded after the default ArgoCD styles, so your rules can override them.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  ui.cssurl: "https://your-css-host.example.com/argocd-custom.css"
```

When the browser loads the ArgoCD UI, it includes a `<link>` tag pointing to your CSS URL. The CSS loads alongside the normal ArgoCD styles.

## Hosting Strategy 1: ConfigMap with Volume Mount

The most common approach is to store CSS in a ConfigMap and mount it into the ArgoCD server pod:

```yaml
# Step 1: Create a ConfigMap with your CSS
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-custom-css
  namespace: argocd
data:
  custom.css: |
    /* Your custom CSS goes here */
    .nav-bar {
      background-color: #1a237e !important;
    }
    .login__text {
      color: #ffffff !important;
    }
```

```yaml
# Step 2: Mount the ConfigMap and reference it
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-server
          volumeMounts:
            - name: custom-css
              mountPath: /shared/app/custom
      volumes:
        - name: custom-css
          configMap:
            name: argocd-custom-css
```

```yaml
# Step 3: Set the CSS URL to point to the mounted file
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  ui.cssurl: "./custom/custom.css"
```

### Helm Configuration for ConfigMap Mount

If you deploy ArgoCD with Helm, the configuration is cleaner:

```yaml
# values.yaml for the ArgoCD Helm chart
server:
  config:
    ui.cssurl: "./custom/custom.css"

  volumes:
    - name: custom-css
      configMap:
        name: argocd-custom-css

  volumeMounts:
    - name: custom-css
      mountPath: /shared/app/custom
```

Then create the ConfigMap separately:

```bash
# Create the ConfigMap from a local CSS file
kubectl create configmap argocd-custom-css \
  --from-file=custom.css=./argocd-custom.css \
  -n argocd
```

## Hosting Strategy 2: External URL

Host the CSS on a CDN or static file server:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  ui.cssurl: "https://cdn.example.com/argocd/custom.css"
```

Make sure the hosting server includes proper CORS headers if it is on a different domain:

```text
Access-Control-Allow-Origin: *
Content-Type: text/css
Cache-Control: public, max-age=3600
```

## Hosting Strategy 3: Inline Data URI

For small CSS changes, you can embed the CSS directly as a data URI:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  ui.cssurl: "data:text/css;base64,Lm5hdi1iYXIgeyBiYWNrZ3JvdW5kLWNvbG9yOiAjMWEyMzdlICFpbXBvcnRhbnQ7IH0="
```

Generate the base64 string:

```bash
# Convert CSS to base64
echo '.nav-bar { background-color: #1a237e !important; }' | base64
```

## Practical CSS Patterns

### Pattern 1: Hide Unused UI Elements

If your organization does not use certain features, you can hide them:

```css
/* Hide the user info button if using SSO exclusively */
.nav-bar__user-info {
  display: none !important;
}

/* Hide the Settings menu for non-admin users via CSS */
/* Note: This is cosmetic only - use RBAC for actual security */
.nav-bar__item[href="/settings"] {
  display: none !important;
}

/* Hide the Docs link */
.nav-bar a[href="https://argo-cd.readthedocs.io"] {
  display: none !important;
}
```

### Pattern 2: Add Environment Indicators

Add a visual banner to indicate which environment you are looking at:

```css
/* Add a red bar at the top for production */
body::before {
  content: "PRODUCTION ENVIRONMENT";
  display: block;
  background-color: #d32f2f;
  color: white;
  text-align: center;
  padding: 4px 0;
  font-weight: bold;
  font-size: 12px;
  letter-spacing: 2px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10000;
}

/* Shift the entire UI down to accommodate the banner */
.nav-bar {
  margin-top: 24px !important;
}

.main-container {
  margin-top: 24px !important;
}
```

### Pattern 3: Improve Readability

```css
/* Increase font sizes for better readability */
.application-details__panel {
  font-size: 14px !important;
}

/* Better code block styling */
.editable-panel__code pre {
  font-size: 13px !important;
  line-height: 1.6 !important;
  padding: 16px !important;
}

/* Wider application list table */
.applications-list {
  max-width: 100% !important;
}

/* Better contrast for status text */
.application-status-panel__item {
  font-weight: 600 !important;
}
```

### Pattern 4: Custom Application Card Styles

```css
/* Style application cards in the tile view */
.application-card {
  border-radius: 8px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease !important;
}

.application-card:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
}

/* Color-code cards by sync status */
.application-card--out-of-sync {
  border-left: 4px solid #ff9800 !important;
}

.application-card--synced {
  border-left: 4px solid #4caf50 !important;
}
```

### Pattern 5: Custom Login Page

```css
/* Style the login page */
.login {
  background: linear-gradient(135deg, #1a237e 0%, #4a148c 100%) !important;
}

.login__box {
  background-color: rgba(255, 255, 255, 0.95) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
}

/* Custom logo on login page */
.login__logo img {
  content: url('https://cdn.example.com/company-logo.svg') !important;
  max-height: 60px !important;
}
```

## Debugging CSS Issues

### Finding the Right Selectors

Use your browser's Developer Tools (F12) to inspect elements and find the correct CSS selectors:

1. Open ArgoCD UI in your browser
2. Press F12 to open Developer Tools
3. Use the element picker (Ctrl+Shift+C) to click on the element you want to style
4. Note the class names and structure
5. Write your CSS rule targeting those classes

### Testing CSS Before Deploying

You can test CSS changes locally using the browser console:

```javascript
// Inject CSS temporarily via browser console
var style = document.createElement('style');
style.textContent = '.nav-bar { background-color: #1a237e !important; }';
document.head.appendChild(style);
```

### Common CSS Specificity Issues

If your styles are not being applied, the ArgoCD default styles might have higher specificity. Solutions:

```css
/* Use !important as a last resort */
.nav-bar {
  background-color: #1a237e !important;
}

/* Or increase specificity with more selectors */
body .nav-bar {
  background-color: #1a237e;
}

html body .nav-bar {
  background-color: #1a237e;
}
```

## Updating CSS Without Downtime

One advantage of the ConfigMap approach is that you can update CSS without restarting ArgoCD:

```bash
# Update the CSS ConfigMap
kubectl create configmap argocd-custom-css \
  --from-file=custom.css=./updated-custom.css \
  -n argocd --dry-run=client -o yaml | kubectl apply -f -

# The volume mount will pick up changes within a minute
# Users just need to refresh their browser
```

For external URLs, simply update the CSS file on your hosting server. If you use cache-busting, update the URL parameter:

```yaml
ui.cssurl: "https://cdn.example.com/argocd/custom.css?v=2"
```

## Security Considerations

**Do not use external CSS URLs in production without HTTPS**: A man-in-the-middle attack could inject malicious CSS (or even JavaScript through CSS injection techniques) into your ArgoCD UI.

**Validate CSS content**: If multiple teams can modify the CSS ConfigMap, review changes carefully. Malicious CSS can overlay fake UI elements or hide important information.

**CSP headers**: ArgoCD includes Content Security Policy headers. Make sure your custom CSS URL is allowed by the CSP configuration.

## Conclusion

Custom CSS in ArgoCD is a powerful customization mechanism that requires no code changes and no application rebuilds. The ConfigMap-with-volume-mount approach is the most reliable for production environments. Start with high-impact, low-effort changes like environment color coding and gradually expand to full branding. For adding custom banners and logos, see our guides on [adding custom banners to ArgoCD UI](https://oneuptime.com/blog/post/2026-02-26-argocd-custom-banners/view) and [adding company logo to ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-company-logo/view).
