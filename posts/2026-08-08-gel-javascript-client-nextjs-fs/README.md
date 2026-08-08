# Fix Gel Client fs Resolution Errors in Next.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gel, EdgeDB, JavaScript, TypeScript, Next.js, Client Libraries

Description: Keep the Gel Node client in Next.js server code, diagnose client and Edge imports, and choose the HTTP client only when intended.

---

`Module not found: Can't resolve 'fs'` means a Node-oriented module entered a bundle that cannot provide Node's filesystem API. With the Gel JavaScript client, the database is rarely the failing component. The important question is which Next.js module graph imported the client.

The current `gel` package has separate Node and browser entry behavior:

- its primary entry is the Node client;
- its package metadata maps that entry to a browser build for browser-aware bundlers;
- browser and Edge code cannot use `createClient()`; and
- the browser implementation tells callers to use `createHttpClient()` instead.

For a conventional Next.js application, the safest default is to keep `createClient()` in a server-only module and query Gel from Server Components, Server Actions, or Route Handlers using the Node.js runtime.

## Understand Why fs Appears

The Node client can discover connection details from a Gel project, environment variables, linked-instance credentials, and files. That implementation legitimately uses Node capabilities. A browser bundle or Edge runtime does not provide the same filesystem API.

Next.js's `use client` directive defines a module-graph boundary. Once a file is a Client Component, its imports and their transitive imports become candidates for the client bundle. The problem can therefore be several imports away:

```text
app/ui/search.tsx                 use client
  -> lib/index.ts                 shared barrel
     -> lib/db.ts                 imports createClient from gel
        -> Node-oriented modules  need filesystem support
```

The visible error may mention `fs`, `node:fs`, a credential helper, or another Node module. Read the full import trace instead of patching only the final module name.

## Put the Client Behind a Server-only Boundary

Create one shared client in a module that Next.js must never include in a Client Component:

```typescript
// src/lib/gel.server.ts
import 'server-only';
import { createClient } from 'gel';

export const gelClient = createClient();
```

The Gel client reference recommends one shared client in typical usage because each `createClient()` call creates a connection pool. Methods such as `withGlobals()` return lightweight clients that share that pool.

Use the module from a Server Component:

```typescript
// app/incidents/page.tsx
import { gelClient } from '@/lib/gel.server';

export const runtime = 'nodejs';

type Incident = {
  id: string;
  title: string;
};

export default async function IncidentsPage() {
  const incidents = await gelClient.query<Incident>(`
    select Incident {
      id,
      title
    }
    order by .title
  `);

  return (
    <ul>
      {incidents.map((incident) => (
        <li key={incident.id}>{incident.title}</li>
      ))}
    </ul>
  );
}
```

App Router pages and layouts are Server Components by default. The explicit `runtime = 'nodejs'` documents that this route needs Node; Node.js is also the current default runtime.

Next.js understands `import 'server-only'` and raises a clearer build-time error if a Client Component imports the protected module. That turns an indirect `fs` failure into a boundary violation closer to its cause.

## Pass Data, Not the Client, to Interactive Components

A Client Component can receive serializable data from its server parent:

```typescript
// app/incidents/incident-filter.tsx
'use client';

type Incident = {
  id: string;
  title: string;
};

export function IncidentFilter({ incidents }: { incidents: Incident[] }) {
  return (
    <ul>
      {incidents.map((incident) => (
        <li key={incident.id}>{incident.title}</li>
      ))}
    </ul>
  );
}
```

```typescript
// app/incidents/page.tsx
import { gelClient } from '@/lib/gel.server';
import { IncidentFilter } from './incident-filter';

export default async function IncidentsPage() {
  const incidents = await gelClient.query<{ id: string; title: string }>(`
    select Incident { id, title }
    order by .title
  `);

  return <IncidentFilter incidents={incidents} />;
}
```

The Gel client, pool, credentials, and connection configuration stay on the server. Only the result data crosses the React Server Component boundary.

For mutations initiated by the browser, call a Server Action or Route Handler that uses the Node.js runtime, validates authorization, and executes the EdgeQL on the server. Do not pass a client object through props; it is neither serializable nor an appropriate browser capability.

## Find the Import That Crossed the Boundary

Work backward from the build trace:

1. Find the first application-owned file in the trace.
2. Check whether it contains `use client` or is imported by a Client Component.
3. Inspect shared barrel files such as `lib/index.ts`.
4. Look for generated query-builder runtime imports in client-facing modules.
5. Check whether a route explicitly selects the Edge runtime.
6. Inspect installed `gel` and legacy `edgedb` package versions.

Useful dependency checks include:

```bash
npm ls gel edgedb
```

Equivalent commands are available in pnpm, Yarn, and Bun. More than one package generation or an unexpected legacy dependency can explain why the resolved entry differs from the source code you are reading.

Avoid barrels that mix server and browser exports:

```typescript
// Avoid importing this barrel from client code if it also exports gelClient.
export { gelClient } from './gel.server';
export { formatDate } from './format-date';
```

Prefer direct server imports, and put shared pure utilities in a separate client-safe module. Tree shaking is not a security or runtime boundary.

If a Client Component needs only a TypeScript type, use a type-only import from a client-safe type module:

```typescript
import type { IncidentSummary } from '@/lib/types';
```

Do not export the live client from that type module.

## Check the Selected Next.js Runtime

The Gel `createClient()` implementation is the Node client. It should not run in an Edge route:

```typescript
export const runtime = 'edge';
```

Next.js documents that the Edge runtime does not support native Node APIs, including filesystem access. If a route should use the binary Gel client, select the Node runtime:

```typescript
export const runtime = 'nodejs';
```

If the deployment surface is constrained to Edge, choose an HTTP architecture deliberately. That may mean using Gel's HTTP client with appropriate security, or calling a Node-hosted backend endpoint. Changing a route to Node is not always possible on every platform, and changing it to Edge is not a harmless performance toggle.

## Know What the Current Browser Entry Does

The official `gel-js` source is explicit: the browser entry exports `createHttpClient()`, while calling `createClient()` in a browser or Edge environment throws an error directing callers to the HTTP API.

That yields three distinct outcomes:

1. A Node entry leaks into the browser graph, causing an `fs`-style bundle error.
2. The bundler honors the package's browser mapping, but application code calls `createClient()`, causing the intentional runtime error.
3. Application code intentionally uses `createHttpClient()` and supplies browser-appropriate connection and authorization configuration.

Fixing outcome one does not make outcome two valid. The binary connection pool and the stateless HTTP client are different transports.

## Use createHttpClient Only as an Architectural Choice

If the browser or Edge runtime truly must talk to Gel over HTTP, use the current package's documented source API:

```typescript
import { createHttpClient } from 'gel';

const client = createHttpClient(/* explicit connection options */);
```

Before shipping this design, address all of the following:

- for direct browser access, configure the Gel HTTP endpoint and CORS allowlist;
- use TLS with certificate and hostname verification;
- for direct browser access, expose only credentials or tokens appropriate for an untrusted end user;
- enforce access policies and, on Gel 7 and newer, role permissions;
- keep administrative DSNs and secret keys out of public bundles; and
- test the browser client against the exact Gel and `gel` package versions deployed.

Statically referenced `NEXT_PUBLIC_` variables are inlined into client JavaScript at build time. Never put a privileged Gel password, DSN, or secret key in one. A direct browser connection needs a database security model designed for untrusted clients, not the server application's administrator credentials.

For most applications, a server-side Gel client plus a narrow application API remains easier to secure and operate.

## Do Not Hide the Error With a Webpack Fallback

For a project explicitly using Webpack, this configuration is a tempting workaround:

```javascript
// next.config.js
module.exports = {
  webpack(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };

    return config;
  },
};
```

It tells Webpack that no filesystem implementation is available. Next.js 16 uses Turbopack by default, so this callback applies only when the project opts into Webpack. It does not turn Node credential discovery, TCP connections, or the binary client into browser-compatible code. The build might progress only to fail when another Node API is resolved or when the client tries to connect.

Use a fallback only when the imported library officially treats that module as optional in the selected runtime. The Gel Node client is the wrong module on the browser side of the boundary.

## Handle the EdgeDB-to-Gel Package Rename

Current code installs and imports `gel`:

```bash
npm install gel
```

```typescript
import { createClient } from 'gel';
```

Older projects may still install `edgedb` and import from `edgedb`. During migration, inspect the lockfile and generated code as well as application imports. Do not assume changing one import updates transitive dependencies or generated query-builder output.

The current `gel` package metadata declares Node 18 or newer. Current Next.js releases may require a newer Node version themselves, so satisfy both projects' documented runtime requirements.

## A Focused Repair Checklist

Use this sequence when the build fails:

- confirm the error's first application-owned importer;
- move `createClient()` to a module importing `server-only`;
- import that module only from Node-runtime Server Components, Server Actions, or Route Handlers;
- pass serializable results into Client Components;
- remove mixed server/client barrels;
- make runtime selection explicit where needed;
- inspect legacy `edgedb` and duplicate package versions;
- regenerate code with the current project toolchain if its imports are stale; and
- rebuild without an `fs: false` workaround.

If the requirement is genuinely browser or Edge access, stop treating the issue as a bundler problem and design the HTTP, CORS, TLS, identity, policy, and permission boundary first.

## Official Documentation

- [Gel JavaScript client](https://docs.geldata.com/reference/using/js/client)
- [Gel Next.js App Router guide](https://docs.geldata.com/guides/tutorials/nextjs_app_router)
- [Gel connection parameters](https://docs.geldata.com/reference/using/connection)
- [Gel HTTP client in a Next.js Edge route](https://docs.geldata.com/resources/guides/tutorials/chatgpt_bot)
- [Gel server configuration and CORS](https://docs.geldata.com/reference/running/configuration)
- [Official gel-js package metadata](https://github.com/geldata/gel-js/blob/master/packages/gel/package.json)
- [Official gel-js browser client source](https://github.com/geldata/gel-js/blob/master/packages/gel/src/browserClient.ts)
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js Node and Edge runtimes](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#runtime)
- [Next.js Node modules in the Edge runtime](https://nextjs.org/docs/messages/node-module-in-edge-runtime)

## Conclusion

An `fs` resolution error is evidence that the Gel Node client crossed into a browser or Edge module graph. Put one shared `createClient()` instance in a `server-only` module, query it from the Node runtime, and pass plain results to interactive components. If direct browser access is truly required, use `createHttpClient()` as part of an explicit HTTP security design. Do not mistake a disabled filesystem fallback for a transport or trust-boundary fix.
