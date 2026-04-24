# Validation Summary: How to Customize the Rancher Login Page

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Rancher settings / management API
- Kubernetes
- Helm
- Shell / `curl`

## Sources Consulted
- Rancher docs: Custom Branding
  https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/custom-branding
- Rancher docs: Authentication, Permissions and Global Settings
  https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration
- Rancher docs: Rancher Helm Chart Options
  https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher docs: API Keys
  https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher docs: Enabling Experimental Features
  https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/enable-experimental-features/enable-experimental-features
- Official Rancher docs repo: `custom-branding.md`
  https://github.com/rancher/rancher-docs/blob/main/docs/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/custom-branding.md
- Official Rancher repo: `pkg/settings/setting.go`
  https://github.com/rancher/rancher/blob/main/pkg/settings/setting.go
- Official Rancher repo: `pkg/multiclustermanager/routes.go`
  https://github.com/rancher/rancher/blob/main/pkg/multiclustermanager/routes.go
- Official Rancher Dashboard repo: `shell/config/settings.ts`
  https://github.com/rancher/dashboard/blob/master/shell/config/settings.ts
- Official Rancher Dashboard repo: branding and banners UI implementation
  https://github.com/rancher/dashboard/blob/master/shell/pages/c/_cluster/settings/brand.vue
  https://github.com/rancher/dashboard/blob/master/shell/pages/c/_cluster/settings/banners.vue

## Issues Found
- The post listed `ui-banner-color` as a login-page branding setting, but Rancher does not define that setting. I replaced it with the actual login-related settings Rancher exposes, including `ui-login-background-light`, `ui-login-background-dark`, `ui-link-color`, and `ui-banners`.
- The post implied all login-page customization lives under **Global Settings → Branding**. Rancher uses **Branding** for visual assets and **Banners** for fixed notices, so I corrected the overview and UI steps.
- The API example for the login banner used `ui-banners` as a boolean flag and wrote banner text to `ui-banner-login`, which is not a valid Rancher setting. I replaced it with a valid `ui-banners` JSON payload for the login consent banner and noted that Rancher sanitizes HTML.
- The Helm section claimed branding can be pre-seeded with `extraEnv` values such as `CATTLE_UI_PL` and `CATTLE_UI_PRIMARY_COLOR`. I found no Rancher support for those environment variables, so I rewrote that section to explain that Helm installs should apply branding after install through the Rancher settings API.
- The reset example used a `resetToDefault` action on a setting resource. I did not find support for that action on Rancher settings, so I replaced it with a correct example that restores `ui-logo-light` to its default empty value.
- The prerequisite image guidance used an incorrect logo recommendation (`200×50 px for the banner logo`). I corrected it to Rancher’s documented logo guidance: 21 px height with a maximum width of 200 px.

## Review Notes
- The shell examples use GNU `base64 -w 0`. On macOS/BSD systems, admins may need to remove newlines with a different command.
