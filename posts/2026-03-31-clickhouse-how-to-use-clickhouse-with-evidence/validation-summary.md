# Validation Summary: How to Use ClickHouse with Evidence

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- ClickHouse
- Evidence (evidence-dev)
- Markdown-based BI / SQL reports
- `evidence-connector-clickhouse` (community datasource plugin)
- npm / npx / degit scaffolding
- Cron + rsync for deployment

## Sources Consulted
- Evidence getting started template: https://github.com/evidence-dev/template
- Evidence ClickHouse community connector: https://github.com/archiewood/evidence-connector-clickhouse
- Connector source (options spec): https://raw.githubusercontent.com/archiewood/evidence-connector-clickhouse/main/src/index.js
- Connector package.json: https://raw.githubusercontent.com/archiewood/evidence-connector-clickhouse/main/package.json
- Evidence queries / parameters docs: https://docs.evidence.dev/core-concepts/queries/
- Evidence data sources docs: https://docs.evidence.dev/core-concepts/data-sources/
- ClickHouse blog on Evidence integration: https://clickhouse.com/blog/evidence-bluesky-dashboard

## Issues Found
1. **Wrong plugin package name.** The post installed and referenced `@evidence-dev/clickhouse`, which does not exist. Evidence does not ship a first-party ClickHouse datasource; the supported community plugin is `evidence-connector-clickhouse` (by archiewood). Updated the install command, the `evidence.plugins.yaml` entry, and the narrative to reflect this.
2. **Wrong `evidence.plugins.yaml` schema.** The post used a top-level `plugins:` key and a list of `- name: ... package: ...` entries. The actual schema is a top-level `datasources:` (and/or `components:`) map keyed by the plugin package name, e.g. `datasources: { evidence-connector-clickhouse: {} }`. Corrected the snippet.
3. **Wrong connection fields.** The post showed `host`, `port`, `database`, `username`, `password` as the `connection.yaml` contents. The `evidence-connector-clickhouse` plugin's `options` spec only defines `url`, `username`, and `password` (verified in `src/index.js`), and Evidence wraps these under `name`/`type`/`options`. Replaced with the correct file shape, and added a note that it is normally generated via `http://localhost:3000/settings`.
4. **Broken nested fenced code block** in the "Using Query Parameters" section. The inner ```sql fence closed the outer ```text fence prematurely, and a stray ` ```bash` opened an unclosed code block that swallowed the rest of the document. Rewrote the example using a four-backtick outer fence (````text … ````) so the inner triple-backtick SQL block renders correctly, and added a short sentence clarifying that `${params.*}` works on templated pages like `pages/[date]/index.md`.

## Review Notes
- The `npx degit evidence-dev/template my-evidence-app` scaffold, `npm run dev` / `npm run build`, output to `build/`, and the `<BarChart>` / `<LineChart>` component usage are all correct.
- The `${params.date}` URL-parameter syntax is correct per Evidence docs; Evidence also exposes component-driven `${inputs.*}` values, but that is out of scope here.
- `evidence-connector-clickhouse` is maintained by a community author (`archiewood`), not the Evidence core team. If the Evidence team later publishes a first-party connector (e.g. `@evidence-dev/clickhouse`), this post should be revisited.
- Connection setup via the in-app settings UI (`localhost:3000/settings`) is the path the plugin README recommends; editing `sources/clickhouse/connection.yaml` directly works but field names must match the plugin's option spec (`url`, `username`, `password`).
- The cron snippet pushes the `build/` directory with `rsync`; fine as an illustrative example, but in production most users would deploy to Netlify/Vercel/Cloudflare Pages rather than rsync to a VM.
