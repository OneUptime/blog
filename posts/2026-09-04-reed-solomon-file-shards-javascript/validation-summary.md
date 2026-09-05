# Validation Summary: How to Split a File into Reed-Solomon Data and Parity Shards in JavaScript

## Status

validated

## Post Type

Tutorial

## Technologies Covered

- JavaScript and Node.js CommonJS modules
- Native `@ronomon/reed-solomon` 6.0.0 addon
- Reed-Solomon erasure coding, data shards, and parity shards
- Node.js Buffer, Crypto, and file system promises APIs
- npm dependency pinning and lockfiles
- SHA-256 integrity checks, authenticated metadata, and durable storage publication

## Sources Consulted

- Codec API and recovery examples: https://github.com/ronomon/reed-solomon
- Package metadata: https://github.com/ronomon/reed-solomon/blob/master/package.json
- Published 6.0.0 package: inspected installed `package.json` and `binding.c`, including argument validation, source counts, shard alignment, and mask limits.
- Node.js Buffer API: https://nodejs.org/api/buffer.html
- Node.js Crypto API: https://nodejs.org/api/crypto.html
- Node.js file system promises API: https://nodejs.org/api/fs.html#promises-api
- Node.js worker pool configuration: https://nodejs.org/api/cli.html#uv_threadpool_sizesize
- npm install and exact version saving: https://docs.npmjs.com/cli/v11/commands/npm-install/
- npm initialization: https://docs.npmjs.com/cli/v11/commands/npm-init/
- npm dependency listing: https://docs.npmjs.com/cli/v11/commands/npm-ls/
- Reed-Solomon erasure-code properties: https://www.rfc-editor.org/rfc/rfc5510
- File and directory durability semantics: https://man7.org/linux/man-pages/man2/fsync.2.html
- Local `find` manual and GNU `sha256sum --help`.

## Issues Found

1. Padding was described as occupying the end of only the final data shard. The allocation formula can leave multiple shards partly or entirely padded for small inputs. Corrected the description to cover the remainder of the data buffer.
2. The durable publication sequence omitted syncing the containing directory after the manifest rename. Added that step and specified that the manifest being published must already be flushed; a pre-rename directory sync cannot persist a later rename.
3. The validation checklist required every file to equal the shard size, which would include `manifest.json`. Restricted this check to shard files.
4. The unknown-error correction statement could imply that this addon automatically corrects unknown errors using twice the parity budget. Clarified that its API reconstructs known erasures and does not locate unknown errors; the general error-correction bound is not a capability of this API.

## Review Notes

- Installed the exact 6.0.0 package in an isolated temporary project using the article's npm commands; `npm ls` confirmed the version. Repository dependencies were untouched.
- Extracted the article's JavaScript and passed `node --check`. Executed it successfully on macOS arm64 with Node.js v24.1.0.
- Tested input lengths 0, 1, 40, 41, 100, and 65,536 bytes, including trailing zero bytes. Checked all nine shard lengths and digests, byte-identical regenerated parity, encoded length headers, and recovered object digests.
- Reconstructed every one-, two-, and three-shard loss combination for each input: 129 combinations per input, 774 successful recovery cases overall. Missing shards were zeroed in scratch buffers before reconstruction. Both data and parity buffers matched their original bytes afterward.
- Confirmed rejection with four missing shards and refusal to reuse an existing output directory.
- The Node.js APIs used are current and non-deprecated. The codec call, masks, eight-byte alignment, header placement, encoded-size formula, and approximate primary buffer allocation are correct.
- The article's documentation links identify the intended official resources. `sha256sum` requires GNU coreutils or an equivalent installation; it is not bundled with stock macOS.
- Runtime checks qualify only the tested environment. The upstream long-running fuzz suite, crash-durability behavior, authenticated manifest handling, object-store publication, and production performance were not tested. The example implements encoding; authentication, durable commits, and recovery verification remain explicitly described deployment work.
