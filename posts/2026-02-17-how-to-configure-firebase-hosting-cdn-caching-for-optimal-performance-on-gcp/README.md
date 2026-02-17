# How to Configure Firebase Hosting CDN Caching for Optimal Performance on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Firebase, GCP, CDN, Caching, Performance

Description: A practical guide to configuring Firebase Hosting cache headers and CDN behavior for faster page loads and reduced origin requests on GCP.

---

Firebase Hosting sits on top of a global CDN backed by Google's edge network. Every file you deploy gets distributed to CDN nodes around the world, and users get served from the nearest one. But the CDN only helps if your caching configuration is right. Out of the box, Firebase Hosting applies reasonable defaults, but tuning cache headers can dramatically improve performance - especially for apps with heavy static assets or server-rendered content.

## How Firebase Hosting CDN Caching Works

When a request comes in, the CDN checks if it has a cached copy. If it does and the cache has not expired, it serves the cached version without ever hitting your origin. If it does not have a cached copy, it forwards the request to your origin (either static files or a Cloud Function/Cloud Run service), caches the response, and serves it.

The key headers that control this behavior are:

- **Cache-Control** - tells both the CDN and the browser how long to cache a response
- **ETag** - a fingerprint of the content for validation-based caching
- **Vary** - tells the CDN which request headers affect the response

Firebase Hosting automatically sets `ETag` headers for static files, so you mostly need to focus on `Cache-Control`.

## Configuring Cache Headers in firebase.json

All hosting configuration lives in your `firebase.json` file. The `headers` array lets you set cache headers for different URL patterns.

This configuration sets aggressive caching for static assets and conservative caching for HTML:

```json
{
  "hosting": {
    "public": "dist",
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|avif)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(woff|woff2|ttf|eot)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=300, s-maxage=600"
          }
        ]
      },
      {
        "source": "/",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=300, s-maxage=600"
          }
        ]
      }
    ]
  }
}
```

Let me break down the Cache-Control directives used here:

- `public` - allows both CDN and browser to cache
- `max-age=31536000` - browser cache for one year (in seconds)
- `s-maxage=600` - CDN cache for 10 minutes (overrides max-age for shared caches)
- `immutable` - tells the browser the content will never change (used with hashed filenames)

## The Immutable Strategy for Static Assets

Modern build tools like Vite, Webpack, and Next.js generate filenames with content hashes, like `app.a3b2c1.js`. When the content changes, the filename changes. This means you can safely cache these files forever - the old cached version will never be requested again because the new version has a different URL.

That is why we use `max-age=31536000, immutable` for JS, CSS, images, and fonts. The `immutable` directive prevents the browser from even making a revalidation request, saving a round trip.

## Dynamic Content Caching with s-maxage

For HTML pages and dynamic routes, you want a different strategy. The browser should check for updates relatively often, but the CDN can cache for a bit longer to absorb traffic spikes.

The `s-maxage` directive only applies to shared caches (like CDNs), while `max-age` applies to the browser. This lets you have different expiration times:

```json
{
  "source": "/blog/**",
  "headers": [
    {
      "key": "Cache-Control",
      "value": "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400"
    }
  ]
}
```

In this example:
- The browser caches for 60 seconds
- The CDN caches for 1 hour
- After the CDN cache expires, it serves stale content while fetching fresh content in the background (for up to 24 hours)

The `stale-while-revalidate` directive is powerful for user experience because it means users almost never wait for a cache miss.

## Caching Cloud Function and Cloud Run Responses

When Firebase Hosting proxies requests to Cloud Functions or Cloud Run via rewrites, the CDN respects the Cache-Control headers set by your function.

Here is a Cloud Function that sets its own cache headers:

```typescript
// functions/src/ssr.ts - Server-side rendered page with caching
import * as functions from "firebase-functions";

export const renderPage = functions.https.onRequest(async (req, res) => {
  const page = req.path;

  // Generate the HTML (could be from a template engine, React SSR, etc.)
  const html = await generatePageHTML(page);

  // Set cache headers for the CDN
  // CDN caches for 10 minutes, browser for 1 minute
  res.set("Cache-Control", "public, max-age=60, s-maxage=600");

  res.status(200).send(html);
});
```

The corresponding rewrite in firebase.json:

```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/app/**",
        "function": "renderPage"
      }
    ]
  }
}
```

## Setting Cache Headers Conditionally

Sometimes you want different caching for authenticated vs. unauthenticated users, or for different content types within the same route.

This Cloud Function varies caching based on the request:

```typescript
export const apiHandler = functions.https.onRequest(async (req, res) => {
  // Public endpoints can be cached aggressively
  if (req.path.startsWith("/api/public/")) {
    res.set("Cache-Control", "public, max-age=300, s-maxage=3600");
  }
  // Authenticated endpoints should not be cached by the CDN
  else if (req.headers.authorization) {
    res.set("Cache-Control", "private, max-age=0, no-store");
  }
  // Default: short cache
  else {
    res.set("Cache-Control", "public, max-age=60, s-maxage=300");
  }

  // Process the request
  const data = await handleRequest(req);
  res.json(data);
});
```

Important: Never let the CDN cache responses that contain user-specific data. Use `private` or `no-store` for authenticated responses.

## Cache Invalidation

Firebase Hosting automatically invalidates the CDN cache when you deploy new content. Every `firebase deploy --only hosting` clears the CDN cache for all files. This is one of the nicest aspects of Firebase Hosting - you do not need to manually purge caches.

However, for Cloud Function responses cached by the CDN, there is no manual purge mechanism. You have two options:

1. Wait for the `s-maxage` to expire
2. Change the URL (add a query parameter or version prefix)

This is why you should set reasonable `s-maxage` values for dynamic content - long enough to help with performance, short enough that updates propagate in a reasonable time.

## Measuring Cache Performance

Use the browser DevTools Network tab to verify your caching is working. Look for these indicators:

- **x-cache: HIT** in the response headers means the CDN served a cached copy
- **200 (from disk cache)** in the size column means the browser used its local cache
- **304 Not Modified** means the browser checked with the server and the content had not changed

You can also check cache hit rates using Cloud Monitoring. Navigate to the Firebase Hosting metrics dashboard to see CDN cache hit ratios over time.

## A Complete firebase.json Example

Here is a comprehensive configuration that covers most scenarios:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|avif|ico)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(js|css|map)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(woff|woff2|ttf|eot)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "/service-worker.js",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache"
          }
        ]
      },
      {
        "source": "**/*.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=300, s-maxage=600, stale-while-revalidate=86400"
          }
        ]
      },
      {
        "source": "/manifest.json",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=86400"
          }
        ]
      }
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

Notice the service worker gets `no-cache` - this is important because browsers use the service worker to control caching for your entire app, and you always want the latest version.

## Summary

Firebase Hosting CDN caching is straightforward once you understand the relationship between `max-age`, `s-maxage`, and `immutable`. Use content-hashed filenames with long `immutable` cache times for static assets, shorter `s-maxage` with `stale-while-revalidate` for dynamic content, and `private`/`no-store` for authenticated responses. Firebase handles cache invalidation on deploy for static files, so you mostly just need to think about your Cloud Function response caching. Get these headers right and your users will notice the difference.
