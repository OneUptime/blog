# How to Debug Rancher UI Extensions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Extension, Debugging, UI

Description: A practical guide to debugging Rancher UI extensions using local development mode, browser DevTools, and common troubleshooting techniques.

## Introduction

Debugging Rancher UI Extensions requires a different approach than traditional web development because your code runs inside the Rancher shell at runtime. This guide walks through setting up a local development environment, using browser DevTools effectively, and resolving the most common issues extension developers encounter.

## Prerequisites

- Rancher running (locally via Docker or in a cluster)
- Extension project scaffolded with `@rancher/extension` (older projects may still use `@rancher/shell`)
- A Node.js version that matches your target Rancher release and Yarn (for example, Node.js 20 for current `v3` extensions and Node.js 16 for legacy `v2` / Rancher v2.9 extensions)
- Chrome or Firefox DevTools familiarity

## Step 1: Run in Local Development Mode

The fastest way to debug is to serve your extension locally against a live Rancher instance:

```bash
# Start the local dev server - this proxies your extension into a running Rancher

API=https://<rancher-url> yarn dev

# The Rancher UI will be available at https://localhost:8005
# Your extension code is hot-reloaded on every save
```

The `API` environment variable tells the dev server where to proxy API calls. Your browser connects to `https://localhost:8005` but communicates with the real Rancher backend.

## Step 2: Enable Vue DevTools

Install the [Vue DevTools](https://devtools.vuejs.org/) browser extension. Once installed:

1. Open DevTools (`F12`).
2. Navigate to the **Vue** tab.
3. Inspect component trees, props, and computed values in real time.

```javascript
// In a Composition API component
const store = useStore();
const route = useRoute();

// Temporarily expose useful debug handles
// Add this to your component during development ONLY
onMounted(() => {
  window.__MY_EXT_DEBUG__ = { store, route };
  console.log('Debug context available at window.__MY_EXT_DEBUG__');
});
```

## Step 3: Inspect the Rancher Store

The Rancher UI uses multiple Vuex stores, including `management`, `cluster`, and `rancher`. Once you've exposed a store reference, you can inspect it from the browser console:

```javascript
// Access the debug handle you exposed from a component
const { store, route } = window.__MY_EXT_DEBUG__;

// List resources already loaded in the management store
console.log(store.getters['management/all']('provisioning.cattle.io.cluster'));

// Inspect the current route context
console.log(route.fullPath);
```

## Step 4: Debug API Requests

Use the Network tab in DevTools to inspect API calls:

1. Open DevTools → **Network** tab.
2. Filter by `Fetch/XHR`.
3. Trigger an action in your extension.
4. Click the request to see headers, payload, and response.

For programmatic debugging, wrap your store dispatches:

```javascript
// Wrap dispatch calls with logging during development
async function debugDispatch(store, action, payload) {
  console.group(`[dispatch] ${action}`);
  console.log('Payload:', payload);
  try {
    const result = await store.dispatch(action, payload);
    console.log('Result:', result);
    return result;
  } catch (err) {
    console.error('Error:', err);
    throw err;
  } finally {
    console.groupEnd();
  }
}
```

## Step 5: Debug Extension Registration

If your extension routes or tabs aren't appearing, check that the product and its routes are both registered:

```javascript
import extensionRouting from './routing/extension-routing';

// In your extension's index.js, log registration steps
export default function(plugin) {
  console.log('[my-extension] Registering routes...');

  plugin.metadata = require('./package.json');
  plugin.addProduct(require('./product'));
  plugin.addRoutes(extensionRouting);

  console.log('[my-extension] Registration complete');
}
```

## Step 6: Check for Common Errors

### Extension Not Loading

```bash
# Check extension-related workloads
kubectl get pods -n cattle-ui-plugin-system

# Check the extension operator logs
kubectl logs -n cattle-ui-plugin-system deploy/ui-plugin-operator --tail=100
```

### Vue Component Errors

Look for errors in the browser console. Common causes:

- **`Cannot read properties of undefined`** - A store getter returned `undefined` before data was loaded. Use `computed()` and guard with `?.`.
- **`[Vue warn]: Missing required prop`** - The parent component isn't passing required props.
- **Navigation failure when calling `router.push()`** - You're navigating to the current route. Guard with `if (route.name !== targetName)`.

### CORS Errors in Dev Mode

```bash
# For Rancher API calls, make sure you're going through the local dev server proxy
API=https://rancher.example.com yarn dev --open
```

If you need to call a third-party API from the browser, use Rancher's `/meta/proxy/<host>/<path>` endpoint instead of calling the remote origin directly.

## Step 7: Write Unit Tests for Extension Logic

If your extension repo includes a Jest-based test setup, a simple unit test can look like:

```javascript
// __tests__/my-logic.spec.js
import { formatMetric } from '../utils/metrics';

describe('formatMetric', () => {
  it('formats bytes to human-readable strings', () => {
    expect(formatMetric(1024)).toBe('1 KiB');
    expect(formatMetric(1048576)).toBe('1 MiB');
  });
});
```

```bash
# Run unit tests using the script configured in your package.json
yarn test
```

## Conclusion

Debugging Rancher UI Extensions becomes manageable once you have the local dev server running, Vue DevTools installed, and a solid understanding of the Rancher store. By combining hot-reloading, console inspection, Network tab analysis, and targeted unit tests, you can quickly identify and resolve issues in your extension code.
