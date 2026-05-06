# How to Clear the Portainer Browser Cache to Fix UI Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Browser Cache, UI, JavaScript, Upgrade Issues

Description: Learn how to properly clear Portainer's browser cache to fix UI glitches, blank screens, and outdated JavaScript after upgrades using browser DevTools and cache-busting techniques.

---

Portainer ships as a single-page application (SPA). After a Portainer upgrade, old JavaScript files cached by the browser can conflict with the new backend API, causing blank screens, missing UI elements, or cryptic JavaScript errors.

## The Problem with Browser Cache After Upgrades

When you upgrade Portainer, the JavaScript bundle filenames change. If your browser still has the old bundle cached, it will:

1. Load old JS files that reference API endpoints that no longer exist
2. Fail silently or show a blank screen
3. Display outdated UI components mixed with new API responses

## Step 1: Hard Reload (Quick Fix)

```text
# Windows/Linux: Ctrl + Shift + R

# Mac:           Cmd + Shift + R
# Firefox:       Ctrl + F5
```

This bypasses the browser cache for the current page. Try this first.

## Step 2: Clear Site Data via DevTools

Open DevTools (`F12`) in **Chrome or Edge** and go to the **Application** tab:

1. Click **Storage** in the left sidebar.
2. Select the storage and cache data you want to remove for the Portainer origin.
3. Click **Clear site data**.

Reload the page.

## Step 3: Clear Browser Cache Manually

**Chrome / Edge:**
1. Press `Ctrl+Shift+Delete`
2. Set time range to **All time**
3. Check **Cached images and files** and **Cookies and other site data**
4. Confirm the deletion

**Firefox:**
1. Press `Ctrl+Shift+Delete`
2. Set **When** to **Everything**
3. Ensure **Cookies and site data** and **Temporary cached files and pages** are checked
4. Click **Clear**

## Step 4: Use Incognito/Private Mode

Test in a fresh incognito/private window with a separate session:

```text
Chrome:  Ctrl+Shift+N
Firefox: Ctrl+Shift+P
Edge:    Ctrl+Shift+N
```

If Portainer works in incognito, the issue is almost certainly cached browser data.

## Step 5: Check Reverse Proxy or CDN Caching

Portainer already sends cache-control headers for its UI: HTML is served with `no-cache, no-store, must-revalidate`, while non-HTML assets are served with a long `max-age`.

If you run Portainer behind a reverse proxy or CDN, make sure it preserves Portainer's upstream `Cache-Control` headers instead of overriding them with blanket caching rules.

## Step 6: Check Service Worker Cache

A service worker registered on the Portainer origin can cache assets independently:

In Chrome DevTools: **Application > Service Workers** → click **Unregister** if one is listed for the Portainer origin.
