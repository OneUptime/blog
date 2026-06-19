# Validation Summary: How to Handle File Uploads in GraphQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GraphQL
- GraphQL multipart request specification
- Node.js
- Express
- Apollo Server
- Apollo Client
- graphql-upload
- apollo-upload-client
- AWS SDK for JavaScript v3
- Amazon S3
- React

## Sources Consulted
- Apollo Server expressMiddleware documentation: https://www.apollographql.com/docs/apollo-server/api/express-middleware
- Apollo Server CORS and CSRF documentation for graphql-upload: https://www.apollographql.com/docs/apollo-server/security/cors
- Apollo Server v3 file upload documentation and security notes: https://www.apollographql.com/docs/apollo-server/v3/data/file-uploads
- graphql-upload README and exported modules: https://github.com/jaydenseric/graphql-upload
- graphql-upload GraphQLUpload module documentation: https://github.com/jaydenseric/graphql-upload/blob/master/GraphQLUpload.mjs
- GraphQL multipart request specification: https://github.com/jaydenseric/graphql-multipart-request-spec
- apollo-upload-client README and exported modules: https://github.com/jaydenseric/apollo-upload-client
- apollo-upload-client UploadHttpLink module documentation: https://github.com/jaydenseric/apollo-upload-client/blob/master/UploadHttpLink.mjs
- Apollo Client mutation hook documentation: https://www.apollographql.com/docs/react/data/mutations
- Node.js stream documentation: https://nodejs.org/api/stream.html
- AWS SDK for JavaScript v3 S3 examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html
- AWS SDK for JavaScript v3 PutObjectCommand reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/PutObjectCommand/
- npm package metadata for @apollo/server, @as-integrations/express5, graphql-upload, apollo-upload-client, and @apollo/client

## Issues Found
- The dependency command did not install Express, CORS middleware, or the current Apollo Express integration package required by the server example. Updated the command to install `@as-integrations/express5`, `express`, and `cors`.
- The server example imported `expressMiddleware` from `@apollo/server/express4`, an Apollo Server 4 path that is removed in Apollo Server 5. Updated it to import from `@as-integrations/express5`.
- The server example omitted CORS middleware even though Apollo's Express middleware documentation expects CORS and JSON body parsing to be set up by the web framework. Added `cors()` to the Express middleware chain.
- The upload client example used the old `createUploadLink` API from the package root. Current `apollo-upload-client` exports deep ESM modules and uses `UploadHttpLink`. Updated the import and link construction.
- Apollo Server's CSRF prevention blocks multipart uploads unless clients send a non-empty preflight-forcing header. Added the `Apollo-Require-Preflight` header to the upload link configuration.
- The React example imported `useMutation` from `@apollo/client`, but current Apollo Client v4 exposes React hooks from `@apollo/client/react`. Updated the imports.
- The resolver used `readStream.pipe(writeStream)` with `finished(writeStream)`, which can miss read stream errors. Updated it to use `pipeline(readStream, writeStream)` from `stream/promises`.
- The upload flow diagram still referred to `pipe(readStream)` after the resolver change. Updated it to match the corrected `pipeline(readStream, writeStream)` implementation.

## Review Notes
- The post is now aligned with current Apollo Server 5, Apollo Client 4, `graphql-upload` 17, and `apollo-upload-client` 19 package APIs.
- The examples assume an ESM Node.js project because they use `import` statements, top-level `await`, and `.mjs` deep imports from `graphql-upload` and `apollo-upload-client`.
- For production systems, Apollo recommends considering out-of-band uploads such as signed URLs for simplicity and security, but the multipart upload approach remains technically valid when CSRF protections and validation are configured correctly.
- The S3 example is technically valid, but buffering an entire upload before sending it to S3 can be memory-intensive for large files. A future improvement could show streaming or managed uploads for larger objects.
