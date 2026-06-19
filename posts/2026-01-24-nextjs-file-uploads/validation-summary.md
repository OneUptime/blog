# Validation Summary: How to Handle File Uploads in Next.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Next.js App Router
- Server Actions
- Route Handlers
- React Client Components
- FormData and file inputs
- XMLHttpRequest upload progress
- Node.js filesystem APIs
- AWS SDK for JavaScript v3
- Amazon S3 presigned upload URLs
- Canvas image resizing

## Sources Consulted
- Next.js Server Actions / updating data docs: https://nextjs.org/docs/app/getting-started/updating-data
- Next.js Route Handlers docs: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Next.js Pages Router API Routes custom config docs: https://nextjs.org/docs/pages/building-your-application/routing/api-routes
- Next.js `serverActions.bodySizeLimit` config docs: https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
- AWS SDK for JavaScript v3 S3 examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html
- AWS SDK `@aws-sdk/s3-request-presigner` package docs: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-s3-request-presigner/
- Vercel Functions runtime docs: https://vercel.com/docs/functions/runtimes
- MDN `XMLHttpRequestUpload` docs: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequestUpload
- MDN `HTMLCanvasElement.toBlob()` docs: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob

## Issues Found
- The Route Handler example was titled "with Streaming" but used `request.formData()` and `file.arrayBuffer()`, which parse and buffer the uploaded file before writing it. Changed the heading to "with Upload Progress" and added an inline note clarifying the buffering behavior.
- The App Router Route Handler exported `config.api.bodyParser = false`, which is Pages Router API Route configuration. Removed it because Next.js Route Handlers use the Web Request API and do not need `bodyParser` configuration.
- The XHR cancel button created an `AbortController` but never connected it to the `XMLHttpRequest`, so canceling did not abort the upload. Replaced it with an `XMLHttpRequest` ref and wired `cancelUpload()` to `xhr.abort()`.
- The XHR error handling used `error.message` directly in a `catch` block, which is not type-safe when catch variables are `unknown`. Changed it to an `instanceof Error` check.
- The local upload filename examples used original file names in generated paths. Replaced them with UUID-based names while preserving extensions to avoid unsafe or collision-prone filenames.
- The S3 helper imported `GetObjectCommand` but did not use it. Removed the unused import.
- The direct S3 upload component could pass an undefined URL to `xhr.open()` when URL generation failed. Added a guard for both `success` and `url`.
- The configuration section said it increased the body size limit for API routes, but `serverActions.bodySizeLimit` applies to Server Actions. Updated the comment and heading.
- The summary implied presigned URLs are the only option for upload progress tracking. Updated it to say Route Handlers or presigned URLs can provide progress tracking, with presigned URLs preferred for larger files.
- Added a production caveat that local filesystem uploads are best for small/self-hosted or development use and cloud storage is preferred on serverless deployments.

## Review Notes
The examples are now technically aligned with current Next.js App Router behavior and AWS SDK v3 presigned URL usage. Future improvements could include explicit S3 CORS configuration, content-type sniffing instead of trusting `file.type`, and replacing local filesystem storage entirely in production examples.
