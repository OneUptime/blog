# How to Add Custom Banners to ArgoCD UI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, UI Customization, Operations

Description: Learn how to add custom banners to the ArgoCD UI for displaying maintenance notices, environment warnings, announcements, and important operational messages to your team.

---

Custom banners in the ArgoCD UI are a practical way to communicate important information to your team. Whether you need to announce a maintenance window, warn users they are looking at the production instance, or display compliance notices, ArgoCD provides built-in support for UI banners.

This guide covers all the ways to add banners to ArgoCD, from the built-in banner feature to custom CSS-based approaches.

## Built-in Banner Support

ArgoCD has built-in support for displaying banners through the `argocd-cm` ConfigMap. This is the simplest approach and does not require any CSS knowledge.

### Adding a Simple Text Banner

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Display a banner at the top of the UI
  ui.bannercontent: "Scheduled maintenance: Feb 28, 2026 from 2:00 AM to 4:00 AM UTC"
  # Banner URL (optional) - makes the banner clickable
  ui.bannerurl: "https://status.example.com/incidents/123"
  # Position: top or bottom
  ui.bannerposition: "top"
  # Make the banner permanent (does not dismiss)
  ui.bannerpermanent: "true"
```

### Banner Configuration Options

| Setting | Description | Values |
|---------|-------------|--------|
| `ui.bannercontent` | The text to display in the banner | Any string |
| `ui.bannerurl` | Makes the banner a clickable link | URL string |
| `ui.bannerposition` | Where to place the banner | `top` or `bottom` |
| `ui.bannerpermanent` | Whether the user can dismiss the banner | `true` or `false` |

### Adding a Banner with a Link

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  ui.bannercontent: "New deployment policy effective March 1st. Click to read the updated guidelines."
  ui.bannerurl: "https://wiki.example.com/deployment-policy-v2"
  ui.bannerpermanent: "false"
```

When `ui.bannerpermanent` is `false`, users can dismiss the banner. The dismissal is stored in the browser's local storage, so it persists across page reloads but not across different browsers or devices.

## Environment Warning Banners

One of the most important uses for banners is warning users about which environment they are working in:

### Production Warning

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  ui.bannercontent: "WARNING: This is the PRODUCTION ArgoCD instance. All changes affect live systems."
  ui.bannerpermanent: "true"
  ui.bannerposition: "top"
```

### Staging Notice

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  ui.bannercontent: "This is the STAGING environment. Changes here do not affect production."
  ui.bannerpermanent: "true"
```

## Styling Banners with Custom CSS

The built-in banner is functional but visually basic. You can enhance it with custom CSS:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  ui.bannercontent: "PRODUCTION ENVIRONMENT - Handle with care"
  ui.bannerpermanent: "true"
  ui.cssurl: "./custom/custom.css"
```

```css
/* custom.css - Style the built-in banner */

/* Production: Red warning banner */
.ui-banner {
  background-color: #d32f2f !important;
  color: #ffffff !important;
  font-weight: bold !important;
  font-size: 14px !important;
  text-align: center !important;
  padding: 8px 16px !important;
  letter-spacing: 1px !important;
  text-transform: uppercase !important;
}

/* Add a warning icon before the text */
.ui-banner::before {
  content: "\26A0\FE0F  ";
}

/* Pulsing animation for critical warnings */
@keyframes pulse-banner {
  0% { opacity: 1; }
  50% { opacity: 0.8; }
  100% { opacity: 1; }
}

.ui-banner {
  animation: pulse-banner 2s ease-in-out infinite;
}
```

### Environment-Specific Banner Styles

For staging environments, use a calmer color:

```css
/* staging-banner.css */
.ui-banner {
  background-color: #f57f17 !important;
  color: #000000 !important;
  font-weight: 600 !important;
}
```

For development environments:

```css
/* dev-banner.css */
.ui-banner {
  background-color: #2e7d32 !important;
  color: #ffffff !important;
  font-weight: 600 !important;
}
```

## Creating Custom Banners with CSS Only

If you need more complex banners or multiple banners, you can create them entirely with CSS using the `::before` and `::after` pseudo-elements:

```css
/* Add a custom banner using CSS only (no ConfigMap banner settings needed) */

/* Top banner */
body::before {
  content: "PRODUCTION - All syncs are logged and audited";
  display: block;
  background: linear-gradient(90deg, #b71c1c, #d32f2f, #b71c1c);
  color: #ffffff;
  text-align: center;
  padding: 6px 0;
  font-weight: bold;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10000;
}

/* Adjust the main content to not be hidden behind the banner */
.nav-bar {
  padding-top: 28px !important;
}

.main-container {
  padding-top: 28px !important;
}
```

### Multiple CSS Banners

You can create multiple banners by targeting different elements:

```css
/* Top banner: Environment warning */
body::before {
  content: "PRODUCTION ENVIRONMENT";
  display: block;
  background-color: #d32f2f;
  color: white;
  text-align: center;
  padding: 4px 0;
  font-weight: bold;
  font-size: 11px;
  letter-spacing: 3px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10001;
}

/* Secondary banner: Maintenance notice */
body::after {
  content: "Maintenance scheduled: Mar 1, 2026 02:00-04:00 UTC | Click Settings for details";
  display: block;
  background-color: #1565c0;
  color: white;
  text-align: center;
  padding: 4px 0;
  font-size: 12px;
  position: fixed;
  top: 24px;
  left: 0;
  right: 0;
  z-index: 10000;
}

/* Adjust layout for both banners */
.nav-bar {
  padding-top: 52px !important;
}

.main-container {
  padding-top: 52px !important;
}
```

## Dynamic Banners Based on Time

While CSS cannot natively check the time, you can use a scheduled job to update the ConfigMap banner before and after maintenance windows:

```yaml
# CronJob to add maintenance banner
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-banner-maintenance-start
  namespace: argocd
spec:
  schedule: "0 1 28 2 *"  # Feb 28 at 1:00 AM UTC
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-banner-manager
          containers:
            - name: set-banner
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  kubectl patch configmap argocd-cm -n argocd --type merge \
                    -p '{"data":{"ui.bannercontent":"MAINTENANCE IN PROGRESS - Syncs may be delayed","ui.bannerpermanent":"true"}}'
          restartPolicy: OnFailure
---
# CronJob to remove maintenance banner
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-banner-maintenance-end
  namespace: argocd
spec:
  schedule: "0 4 28 2 *"  # Feb 28 at 4:00 AM UTC
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-banner-manager
          containers:
            - name: clear-banner
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  kubectl patch configmap argocd-cm -n argocd --type json \
                    -p '[{"op":"remove","path":"/data/ui.bannercontent"}]'
          restartPolicy: OnFailure
```

Create the required RBAC for the CronJob:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: argocd-banner-manager
  namespace: argocd
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: argocd-banner-manager
  namespace: argocd
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["argocd-cm"]
    verbs: ["get", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: argocd-banner-manager
  namespace: argocd
subjects:
  - kind: ServiceAccount
    name: argocd-banner-manager
roleRef:
  kind: Role
  name: argocd-banner-manager
  apiGroup: rbac.authorization.k8s.io
```

## Quick Banner Management Commands

For ad-hoc banner management:

```bash
# Add a banner
kubectl patch configmap argocd-cm -n argocd --type merge \
  -p '{"data":{"ui.bannercontent":"Deploying new infrastructure changes - expect brief disruptions","ui.bannerpermanent":"true"}}'

# Remove a banner
kubectl patch configmap argocd-cm -n argocd --type json \
  -p '[{"op":"remove","path":"/data/ui.bannercontent"},{"op":"remove","path":"/data/ui.bannerpermanent"}]'

# Update banner text
kubectl patch configmap argocd-cm -n argocd --type merge \
  -p '{"data":{"ui.bannercontent":"Updated: Infrastructure changes complete. Monitoring for issues."}}'

# Check current banner
kubectl get configmap argocd-cm -n argocd -o jsonpath='{.data.ui\.bannercontent}'
```

## Helm Values Configuration

For Helm-based deployments:

```yaml
# values.yaml
server:
  config:
    ui.bannercontent: "PRODUCTION - All changes are monitored and audited"
    ui.bannerpermanent: "true"
    ui.bannerposition: "top"
    ui.bannerurl: "https://wiki.example.com/deployment-guidelines"
```

## Conclusion

Banners are a simple but effective way to communicate with your ArgoCD users. The built-in banner feature covers most needs, while custom CSS gives you full control over appearance and the ability to create multiple banners. Use environment warnings as a permanent fixture and maintenance banners as temporary notices. The automated CronJob approach ensures maintenance banners appear and disappear on schedule without manual intervention.
