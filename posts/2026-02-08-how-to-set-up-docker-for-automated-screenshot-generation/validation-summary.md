# Validation Summary: How to Set Up Docker for Automated Screenshot Generation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Docker
- Docker Compose
- Node.js
- Express.js
- Puppeteer / puppeteer-core
- Headless Chrome / Chromium
- curl
- cron
- Bash
- pngjs
- pixelmatch

## Sources Consulted
- Puppeteer Page.screenshot API: https://pptr.dev/api/puppeteer.page.screenshot
- Puppeteer ScreenshotOptions API: https://pptr.dev/api/puppeteer.screenshotoptions
- Puppeteer Page.setViewport API: https://pptr.dev/api/puppeteer.page.setviewport
- Puppeteer LaunchOptions API: https://pptr.dev/api/puppeteer.launchoptions
- Puppeteer headless mode guide: https://pptr.dev/guides/headless-modes
- Puppeteer troubleshooting guide for sandbox and Docker/Linux behavior: https://pptr.dev/troubleshooting
- Puppeteer configuration guide: https://pptr.dev/guides/configuration
- Docker Compose services reference for healthcheck and shm_size: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- npm ci documentation: https://docs.npmjs.com/cli/commands/npm-ci/
- pixelmatch npm README: https://www.npmjs.com/package/pixelmatch
- pngjs npm README: https://www.npmjs.com/package/pngjs

## Issues Found
- The Docker Compose healthcheck used `curl`, but the Dockerfile did not install `curl`. I added `curl` to the `apt-get install` list so the healthcheck command exists in the container.
- The Dockerfile used `npm ci --production`. The current npm documentation describes dependency omission through `--omit=dev`, so I changed the command to `npm ci --omit=dev`.
- The Puppeteer launch example used `headless: 'new'`. Current Puppeteer LaunchOptions define `headless` as `boolean | 'shell'`, with `true` launching the new headless mode, so I changed it to `headless: true`.
- Current Puppeteer `page.screenshot()` returns a `Uint8Array` by default. Express may treat a plain `Uint8Array` as an object instead of an image response, so I wrapped the screenshot result with `Buffer.from(...)` before returning it from `captureScreenshot`.
- The Docker Compose snippet included the obsolete top-level `version: "3.8"` field. Docker Compose now treats `version` as informational and warns when it is used, so I removed it.
- The `pixelmatch` example used CommonJS `require('pixelmatch')`, but the current pixelmatch package documents ESM import usage. I changed the CommonJS module example to load pixelmatch with dynamic `import('pixelmatch')` inside an async comparison function.

## Review Notes
- The post uses `puppeteer-core` with a system Chromium binary. Puppeteer's own documentation notes that using an executable path outside the bundled browser is supported but only guaranteed with the bundled browser, so pinning compatible `puppeteer-core` and Chromium versions would make this more reproducible in a production implementation.
- The `--no-sandbox` Chromium flag is common in container examples, but Puppeteer's troubleshooting documentation strongly discourages running without a sandbox unless the opened content is trusted. A production service should validate and restrict requested URLs to avoid SSRF and untrusted-content risk.
