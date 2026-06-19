# Validation Summary: How to Fix 'Image Optimization' Errors in Next.js

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Next.js
- `next/image`
- Next.js image configuration
- Static export
- Sharp
- Docker
- Content Security Policy
- TypeScript / React

## Sources Consulted
- Next.js Image Component documentation: https://nextjs.org/docs/app/api-reference/components/image
- Next.js image configuration documentation: https://nextjs.org/docs/app/api-reference/config/next-config-js/images
- Next.js invalid images config error documentation: https://nextjs.org/docs/messages/invalid-images-config
- Next.js static exports documentation: https://nextjs.org/docs/app/guides/static-exports
- Next.js export with Image Optimization API error documentation: https://nextjs.org/docs/messages/export-image-api
- Next.js sharp missing in production error documentation: https://nextjs.org/docs/messages/sharp-missing-in-production
- Next.js 16 upgrade guide: https://nextjs.org/docs/app/guides/upgrading/version-16
- Sharp installation documentation: https://sharp.pixelplumbing.com/install/

## Issues Found
- The remote image configuration example included `images.domains` as a legacy approach. `images.domains` is deprecated in current Next.js, so the example was changed to use only `remotePatterns`.
- The examples used the `priority` prop for above-the-fold images. Starting with Next.js 16, `priority` is deprecated in favor of `preload`, so those examples and the performance diagram were updated.
- The static export configuration snippet declared `const nextConfig` twice in the same JavaScript block, which would not be copyable code. The two alternatives were split into separate snippets.
- The custom loader example was missing the `'use client'` directive shown in current Next.js loader file documentation, so it was added.
- The quality examples used custom values without mentioning the Next.js 16 `images.qualities` allowlist. A matching `qualities` configuration was added.
- The Sharp platform-specific npm command used outdated flag names. It was updated to npm v10/sharp documented flags: `--os`, `--cpu`, and `--libc`.
- The image size-limit section described a 10 MB maximum and used `minimumCacheTTL` as if it limited response size. Current Next.js documents `maximumResponseBody` with a default source image limit of 50 MB, so the error text and configuration were corrected.

## Review Notes
- The post is technically relevant and remains a useful troubleshooting guide after the corrections.
- Some snippets are illustrative and still require project-specific values, such as real Cloudinary account names, CSP domains, and remote image hosts.
