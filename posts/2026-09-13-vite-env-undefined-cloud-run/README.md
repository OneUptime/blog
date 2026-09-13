# Fix Undefined Vite Environment Variables on Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloud Run, Google Cloud, Vite, Docker, Troubleshooting

Description: Separate Vite build-time values from Cloud Run runtime configuration, then choose a rebuild or a public runtime config endpoint.

---

You deploy a Vite application, add `VITE_API_URL` to the Cloud Run service, and reload the browser. The value remains undefined, or the browser still calls the development API. The likely problem is timing: the JavaScript bundle was created before that environment variable existed.

Cloud Run starts a container with runtime environment variables. Vite replaces client-side environment references while building the bundle. Updating the server process environment does not rewrite a JavaScript file already stored in the image. [Vite environment variables](https://vite.dev/guide/env-and-mode).

## Identify which process reads the value

There are usually three distinct environments:

| Stage | Example consumer | When configuration is read |
| --- | --- | --- |
| Image build | Vite executing a production build | While generating static assets |
| Container startup | Node.js or another server | When the server process starts or reads its environment |
| Browser | Downloaded JavaScript | When the page executes |

A value visible to the middle row is not automatically available to the other rows. First locate the expression that is undefined. A browser expression such as `import.meta.env.VITE_API_URL` has different semantics from `process.env.API_URL` in a Node.js route.

This article concerns client bundles. Server-side rendering frameworks can have additional conventions for server-only and public configuration; follow those framework rules as well.

## Check names, modes, and build inputs

Vite exposes variables with the `VITE_` prefix by default, and values are strings. A variable named `API_URL` will not become `import.meta.env.API_URL` in client code under the default configuration. Do not solve that by exposing every environment variable.

The production build normally loads the production mode files. Mode-specific files override generic files, while values already present in the build process environment have priority. [Vite modes and loading precedence](https://vite.dev/guide/env-and-mode#modes).

An illustrative client check fails early:

```javascript
const apiUrl = import.meta.env.VITE_API_URL;

if (!apiUrl) {
  throw new Error('The public API URL was missing when this bundle was built');
}

export const publicApiUrl = apiUrl;
```

The message describes the stage responsible for the missing value. It does not suggest that a browser can inspect the Cloud Run process environment.

## Option one: supply public values during the image build

For a project with a committed lockfile and a build script, the relevant part of a Dockerfile might be:

```dockerfile
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
RUN test -n "$VITE_API_URL" && npm run build
```

A build argument is available to subsequent build commands in that stage. Supply a non-secret public URL:

```bash
docker build \
  --build-arg VITE_API_URL=https://api.example.com \
  -t example-web:staging .
```

This is a build-stage excerpt, not a complete serving image. Copy the generated assets into your existing production server stage. Review `.dockerignore` so that unrelated local environment files do not silently alter the build.

Docker documents build arguments and their scope; an `ARG` in one unrelated stage is not automatically visible in another. [Docker build variables](https://docs.docker.com/build/building/variables/).

Build arguments and client bundles are inappropriate places for private credentials. A public API base URL is configuration. A database password or privileged API token belongs behind a server endpoint.

After building, deploy the new image and inspect the revision serving traffic. Reusing the old image while only changing Cloud Run runtime variables leaves the bundle unchanged. Keeping a build identifier visible in the page or response headers helps distinguish caching from a failed rollout.

## Option two: load a public runtime configuration endpoint

If the same image must move between environments, have the server expose a narrowly defined public JSON response. The browser fetches that response before initializing API clients.

This illustrative Node.js handler uses the standard HTTP module and keeps the configuration route separate from an existing static asset handler:

```javascript
export function handleRuntimeConfig(req, res) {
  if (req.url !== '/runtime-config.json') return false;

  const apiBaseUrl = process.env.PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    res.writeHead(503, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error: 'Public configuration is unavailable'}));
    return true;
  }

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify({apiBaseUrl}));
  return true;
}
```

Call this handler before your static asset fallback. Return only allowlisted public fields. `JSON.stringify` serializes the value correctly; avoid constructing JavaScript through shell string substitution. The [Node.js HTTP API](https://nodejs.org/api/http.html) defines response headers and completion behavior.

Then bootstrap the browser explicitly:

```javascript
const response = await fetch('/runtime-config.json', {cache: 'no-store'});
if (!response.ok) throw new Error('Cannot load application configuration');
const config = await response.json();

const apiBase = new URL(config.apiBaseUrl);
if (apiBase.protocol !== 'https:') throw new Error('HTTPS API required');

// Initialize your application here with apiBase.href.
```

Set `PUBLIC_API_BASE_URL` on the Cloud Run service using its normal runtime environment configuration. [Cloud Run environment variables](https://docs.cloud.google.com/run/docs/configuring/services/environment-variables).

## Validate the complete delivery path

For a build-time design, inspect the built assets and the browser's outgoing request URL. For a runtime design, inspect the JSON endpoint first, then the application's request. An environment value appearing in a deployment screen is insufficient evidence.

Test a missing value, an invalid URL, and a second environment. Check CDN and service-worker caching if an old page persists. During a traffic split, two revisions may intentionally expose different runtime values; ensure both are compatible with the clients they serve.

The examples describe configuration patterns and have not been deployed to a Cloud Run project.

## Conclusion

An undefined Vite variable is often a build-input problem presented as a deployment problem. Provide public values when Vite builds, or create an explicit runtime configuration endpoint. Choose one path deliberately and verify the value where the browser actually consumes it.

## Official Documentation

- [Vite environment variables and modes](https://vite.dev/guide/env-and-mode)
- [Docker build variables](https://docs.docker.com/build/building/variables/)
- [Cloud Run environment variables](https://docs.cloud.google.com/run/docs/configuring/services/environment-variables)
- [Node.js HTTP API](https://nodejs.org/api/http.html)
