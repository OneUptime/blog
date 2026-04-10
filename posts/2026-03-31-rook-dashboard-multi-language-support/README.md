# How to Configure Dashboard Multi-Language Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Dashboard, Localization, Configuration

Description: Enable and configure multi-language support in the Ceph Dashboard, allowing users to switch the interface language for international team environments.

---

## Overview

The Ceph Dashboard supports multiple languages through built-in internationalization (i18n). Users can select their preferred language from the Dashboard settings, and administrators can configure the default language for new sessions.

## Supported Languages

As of Ceph Reef and Squid, the Dashboard ships with translations for:
- English (default) - en-US
- Chinese (Simplified) - zh-Hans
- Chinese (Traditional) - zh-Hant
- Czech - cs
- German - de
- Spanish - es
- French - fr
- Indonesian - id
- Italian - it
- Japanese - ja
- Korean - ko
- Polish - pl
- Portuguese (Brazil) - pt

Check available languages in the current build by listing the locale subdirectories:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-mgr -- \
  ls /usr/share/ceph/mgr/dashboard/frontend/dist/
```

## Setting User Language Preference

Individual users can set their language preference in the Dashboard UI:

1. Click the user icon in the top-right corner
2. Select "User profile"
3. Set the "Language" dropdown to the preferred locale
4. Click "Save"

This setting is stored as a browser cookie (`cd-lang`) and persists across sessions in the same browser.

## Setting the Default Language

The Ceph Dashboard does not have a CLI command to set a cluster-wide default locale at runtime. Instead, language selection follows this priority:

1. **User cookie** (`cd-lang`): Set when a user selects a language in the Dashboard UI
2. **Browser `Accept-Language` header**: Used if no `cd-lang` cookie exists
3. **Build default**: Falls back to the default language configured at build time

To list available locale codes, check the subdirectories under the frontend `dist/` path:

```bash
# List available locales
kubectl -n rook-ceph exec deploy/rook-ceph-mgr -- \
  python3 -c "
import os
dist_path = '/usr/share/ceph/mgr/dashboard/frontend/dist/'
if os.path.exists(dist_path):
    locales = [d for d in os.listdir(dist_path)
               if os.path.isdir(os.path.join(dist_path, d))]
    print('\n'.join(sorted(locales)))
"
```

## Language via Browser Accept-Language Header

The Dashboard respects the browser's `Accept-Language` header if no `cd-lang` cookie is set. Users on configured browsers will automatically see the Dashboard in their OS language:

```bash
# Example: Chrome on a Chinese locale system will request zh-Hans automatically
# No server configuration needed for browser-based language detection
```

## Verify Translation Availability

Not all languages may have complete translations. Since the Ceph Dashboard compiles translations into separate Angular builds per locale, you can verify which languages are available by checking which locale directories exist:

```bash
# Check which locale builds are available
kubectl -n rook-ceph exec deploy/rook-ceph-mgr -- \
  python3 -c "
import os
dist_path = '/usr/share/ceph/mgr/dashboard/frontend/dist/'
if os.path.exists(dist_path):
    locales = sorted(d for d in os.listdir(dist_path)
                     if os.path.isdir(os.path.join(dist_path, d)))
    print(f'Available locales ({len(locales)}): {", ".join(locales)}')
"
```

To check translation completeness percentages, visit the [Ceph Dashboard Transifex project](https://www.transifex.com/ceph/ceph-dashboard/).

## Contributing Translations

To improve translations or add a new language, contribute to the Ceph project:

```bash
# Ceph uses Transifex for translation management
# Project: https://www.transifex.com/ceph/ceph-dashboard/

# Extract strings for translation
cd src/pybind/mgr/dashboard/frontend
npm run i18n:extract
```

## Summary

Ceph Dashboard multi-language support allows individual users to select their preferred interface language via the Dashboard UI. The language preference is stored as a browser cookie (`cd-lang`), and the Dashboard falls back to the browser's `Accept-Language` header for automatic language detection when no preference is set.
