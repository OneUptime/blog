# How to Clear the Portainer Browser Cache to Fix UI Issues - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Browser, UI, Cache

Description: Fix Portainer UI issues by properly clearing browser cache, local storage, and cookies - the first troubleshooting step for most Portainer display and JavaScript errors.

## Introduction

Many Portainer UI issues - blank screens, outdated interfaces after upgrades, JavaScript errors, authentication loops, and stale data displays - are caused by cached browser data from a previous version. Clearing the browser cache is often the first troubleshooting step before investigating backend issues.

## What Browser Data Affects Portainer

| Data Type | What It Stores | Effect When Stale |
|-----------|---------------|------------------|
| HTTP Cache | JS/CSS files, images | Old UI code running |
| Local Storage | Session tokens, UI state | Auth loops, wrong settings |
| Session Storage | Temporary app state | Stale page data |
| Cookies | Auth and CSRF cookies | Login failures |

## Method 1: Hard Reload (Fastest)

Forces reload of all assets without clearing the full cache:

```text
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R

Or:
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
```

## Method 2: Chrome - Clear Site Data

The most thorough browser-based method for the current origin:

```text
1. Open DevTools (F12)
2. Click the "Application" tab
3. In left panel: Storage
4. Leave the available site-data categories checked
5. Click "Clear site data"
6. Reload the page
```

The exact categories shown can vary by Chrome version and by what data exists for the Portainer origin.

## Method 3: Clear Cache via Browser Settings

### Chrome

```text
1. Menu (⋮) → Delete browsing data
2. Select: All time
3. Check:
   ✓ Cookies and other site data
   ✓ Cached images and files
4. Click "Delete data"
```

Or use keyboard shortcut: `Ctrl+Shift+Delete`

### Firefox

```text
1. Menu (☰) → Settings
2. Privacy & Security → Cookies and Site Data
3. Click "Clear Data..."
4. Check:
   ✓ Cookies and Site Data
   ✓ Temporary Cached Files and Pages
5. Click "Clear"
```

Or: `Ctrl+Shift+Delete`

### Safari

```text
1. Safari → Settings → Privacy
2. Click "Manage Website Data"
3. Search for your Portainer host
4. Click "Remove" (or "Remove All")
5. If needed, use History → Clear History
```

## Method 4: Clear Portainer-Specific Web Storage via Console

Target Portainer-prefixed web storage keys without clearing other sites:

```javascript
// Open browser console on Portainer page (F12 → Console)

function removePortainerKeys(storage, label) {
  for (let i = storage.length - 1; i >= 0; i -= 1) {
    const key = storage.key(i);
    if (key && key.startsWith('portainer')) {
      storage.removeItem(key);
      console.log(`Removed ${label} key:`, key);
    }
  }
}

removePortainerKeys(localStorage, 'localStorage');
removePortainerKeys(sessionStorage, 'sessionStorage');

// Reload the page
window.location.reload();
```

Use DevTools or browser site-data settings to clear cookies as well, especially HttpOnly auth cookies that JavaScript cannot remove reliably.

## Method 5: Incognito/Private Mode Test

Before clearing, test if the issue is cache-related:

```text
Chrome: Ctrl+Shift+N → new incognito window
Firefox: Ctrl+Shift+P → new private window
Safari: File → New Private Window
Edge: Ctrl+Shift+N → new InPrivate window
```

Navigate to Portainer in the private window:
- **Issue gone** in private mode = cached site data, extensions, or browser-profile state is likely involved
- **Issue persists** in private mode = cached site data is less likely; investigate browser compatibility or server-side issues next

## Method 6: Clear Service Workers (Only if DevTools Shows One)

Current Portainer builds do not normally register a service worker. Use this only if DevTools shows a service worker or Cache Storage entries for the Portainer origin:

```javascript
// In browser console:
async function clearOriginCaches() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((reg) => {
        console.log('Unregistered:', reg.scope);
        return reg.unregister();
      })
    );
  }

  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map((cacheName) => {
        console.log('Clearing cache:', cacheName);
        return caches.delete(cacheName);
      })
    );
  }

  window.location.reload();
}

clearOriginCaches();
```

## Method 7: Use a Different Browser

Test in a completely different browser to isolate the issue:

```bash
# If issue is specific to Chrome, try Firefox

# If specific to Firefox, try Chrome or Edge
# This quickly confirms if it's browser-specific vs server-side
```

## Common UI Issues Resolved by Cache Clearing

| Symptom | Root Cause |
|---------|-----------|
| UI stuck on old Portainer version | Cached JS files |
| Login form doesn't appear | Corrupted localStorage |
| "Session expired" on every refresh | Stale session token |
| Container list doesn't update | Cached API responses |
| Settings form doesn't save | Stale application state |
| Theme changes don't apply | Cached CSS |
| 2FA screen appears after disabling 2FA | Cached auth state |

## Method 8: Fix After Portainer URL/Domain Change

If you changed Portainer's URL, remember that browser storage is scoped by origin:

```bash
# Protocol, hostname, and port each define a separate origin
# If you switch between IP, hostname, or ports, each one keeps separate site data

# Access consistently via either:
# https://portainer.yourdomain.com (always)
# OR
# https://192.168.1.100:9443 (always)
# NOT a mix of both
```

## Conclusion

Browser cache clearing is one of the fastest and most effective fixes for many Portainer UI issues. Test in incognito/private mode first - if that works, clearing the Portainer origin's cached files, local/session storage, and cookies is the right next step. For post-upgrade issues, the DevTools Application tab is the fastest way to clear the current origin's site data in one place.
