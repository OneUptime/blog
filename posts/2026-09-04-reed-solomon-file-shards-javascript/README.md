# How to Split a File into Reed-Solomon Data and Parity Shards in JavaScript

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: JavaScript, Node.js, Erasure Coding, Data Integrity, Distributed Storage

Description: Split a file into equal JavaScript data shards, calculate Reed-Solomon parity, preserve trusted metadata, and prove that recovery works before deployment.

---

Reed-Solomon storage needs more than a call to an encoder. Every shard must have the same length and a stable index, the original length must survive padding, and recovery metadata must remain trustworthy. This example uses six data shards and three parity shards, so any three missing shards can be reconstructed when the remaining shards are correct.

The example uses the native `@ronomon/reed-solomon` Node.js addon because its public API exposes explicit data and parity buffers. Review and pin the exact package version you deploy. The project is mature but has not had frequent releases, and a native addon must be qualified against the exact Node.js, operating-system, CPU, and compiler combination in production.

## Install and Pin the Codec

Create an isolated project and save an exact dependency version:

```bash
mkdir rs-demo
cd rs-demo
npm init -y
npm install --save-exact @ronomon/reed-solomon@6.0.0
npm ls @ronomon/reed-solomon
```

Commit the lockfile and retain its integrity fields. In a controlled build pipeline, also record the package tarball digest and run the upstream tests against the built native module.

## Encode Equal-Length Shards

Save this as `encode.js`:

```javascript
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const ReedSolomon = require('@ronomon/reed-solomon');

const K = 6;
const M = 3;
const HEADER_BYTES = 8;

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function roundUp(value, multiple) {
  return Math.ceil(value / multiple) * multiple;
}

function encode(context, sources, targets, data, parity) {
  return new Promise((resolve, reject) => {
    ReedSolomon.encode(
      context,
      sources,
      targets,
      data,
      0,
      data.length,
      parity,
      0,
      parity.length,
      error => error ? reject(error) : resolve()
    );
  });
}

async function main(inputPath, outputDirectory) {
  if (!inputPath || !outputDirectory) {
    throw new Error('usage: node encode.js INPUT NEW_OUTPUT_DIRECTORY');
  }

  const input = await fs.readFile(inputPath);
  const storedLength = HEADER_BYTES + input.length;
  // This addon requires each shard size to be a multiple of eight bytes.
  const shardSize = roundUp(Math.ceil(storedLength / K), 8);
  const data = Buffer.alloc(shardSize * K);
  const parity = Buffer.alloc(shardSize * M);

  data.writeBigUInt64BE(BigInt(input.length), 0);
  input.copy(data, HEADER_BYTES);

  const context = ReedSolomon.create(K, M);
  let sources = 0;
  let targets = 0;
  for (let index = 0; index < K; index++) sources |= (1 << index);
  for (let index = K; index < K + M; index++) targets |= (1 << index);

  await encode(context, sources, targets, data, parity);
  await fs.mkdir(outputDirectory, { recursive: false });

  const shardRecords = [];
  for (let index = 0; index < K + M; index++) {
    const start = (index < K ? index : index - K) * shardSize;
    const source = index < K ? data : parity;
    const shard = source.subarray(start, start + shardSize);
    const name = `shard-${String(index).padStart(2, '0')}.bin`;
    await fs.writeFile(path.join(outputDirectory, name), shard, { flag: 'wx' });
    shardRecords.push({ index, name, sha256: sha256(shard) });
  }

  const manifest = {
    format: 1,
    codec: '@ronomon/reed-solomon@6.0.0',
    k: K,
    m: M,
    shardSize,
    originalLength: input.length,
    objectSha256: sha256(input),
    shards: shardRecords
  };

  // Publish metadata last so its presence means every shard write completed.
  await fs.writeFile(
    path.join(outputDirectory, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { flag: 'wx' }
  );
}

main(process.argv[2], process.argv[3]).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
```

Run it into a directory that does not yet exist:

```bash
node encode.js archive.tar archive.tar.rs
find archive.tar.rs -type f -print | sort
sha256sum archive.tar archive.tar.rs/shard-*.bin
```

The eight-byte header is itself encoded because it is placed at the beginning of the data buffer. Zero padding fills the remainder of the data buffer and can span multiple data shards for small files. If the original file has length `L`, the script chooses:

```text
stored bytes = L + 8
shard size   = round_up(ceil(stored bytes / K), 8)
encoded size = (K + M) * shard size
```

Never infer `L` by trimming zero bytes, because zero can be valid file data.

## Treat the Manifest as Recovery-Critical Data

The manifest binds each logical index to a length and SHA-256 digest. Store at least two independently readable copies, authenticate it with a signature or MAC, and keep the authentication key outside the shard set. An attacker who can replace both a shard and an unauthenticated digest can otherwise make corrupt data appear valid.

For a durable writer, the example needs an additional storage-specific commit protocol. Write to temporary names, flush file contents, sync the containing directory where the platform supports it, then atomically publish the flushed manifest and sync its containing directory again to persist the rename. On object storage, use generation IDs and publish a small immutable pointer only after all generation objects are durable. Do not overwrite a working generation in place.

The addon's source and target sets are JavaScript bit masks. A `6+3` layout is comfortably within that interface, but larger layouts must be checked against `MAX_K`, `MAX_M`, and JavaScript's 32-bit bitwise behavior. Do not assume a layout accepted by another Reed-Solomon implementation is wire-compatible. Field parameters, generator matrix, shard ordering, and padding are all part of the format.

## Verify Before Depending on the Parity

An encoding job should fail unless all of these checks pass:

1. Every shard file has exactly `manifest.shardSize` bytes.
2. Every per-shard SHA-256 digest matches the authenticated manifest.
3. Re-encoding parity from the six data shards produces byte-identical parity shards.
4. Recovery succeeds after deleting every single shard, representative pairs, and representative three-shard combinations.
5. The decoded length comes from the header and the recovered bytes match `objectSha256`.

Keep the source file during the first drill. Copy the shard set to a scratch directory, remove selected copies there, reconstruct the missing indexes, concatenate data shards in index order, read the eight-byte length, and hash exactly that many payload bytes. Test loss of data-only, parity-only, and mixed indexes. A successful decoder return is not enough; the final object digest is the acceptance test.

With `M = 3`, four missing shards exceed the erasure budget. Fail closed rather than returning a best-effort file. Likewise, a digest mismatch is a known erasure only when the manifest is trusted. This addon reconstructs known erasures; it does not locate or correct unknown errors. The general Reed-Solomon bound of two parity symbols per unknown error applies to error-correcting decoders, not to this erasure-only API. Reject untrusted metadata rather than relying on that bound for recovery.

## Plan for Large Files and Concurrency

The compact example reads the whole object and all parity into memory. Its peak buffer use is approximately:

```text
(K + M) * shard size, plus the input Buffer
```

For large objects, encode fixed-size stripes and include a stripe number in every digest record. Limit concurrent native calls so the libuv worker pool, CPU, and storage queue do not become oversubscribed. Benchmark the exact `K`, `M`, stripe size, concurrency, and degraded-recovery pattern on production-class hardware. Report useful input bytes per second separately from total shard bytes written.

## Conclusion

A reliable JavaScript Reed-Solomon format consists of equal shards, explicit indexes, original-length metadata, pinned codec parameters, authenticated digests, and a recoverable publication protocol. Generate parity only after the data layout is final, publish metadata last, and prove the full decode path with destructive drills on copies. Those controls turn a fast native encoding call into a storage format that operators can actually recover.

## Official Documentation

- [Ronomon Reed-Solomon repository and API examples](https://github.com/ronomon/reed-solomon)
- [Ronomon Reed-Solomon package metadata](https://github.com/ronomon/reed-solomon/blob/master/package.json)
- [Node.js Buffer API](https://nodejs.org/api/buffer.html)
- [Node.js Crypto API](https://nodejs.org/api/crypto.html)
- [Node.js file system promises API](https://nodejs.org/api/fs.html#promises-api)
