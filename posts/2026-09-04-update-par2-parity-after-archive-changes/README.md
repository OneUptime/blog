# Update PAR2 Parity After Archive Changes Without Losing Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Archiving, Erasure Coding, Data Integrity, Recovery, Checksum

Description: Replace PAR2 parity safely after archive contents change by publishing a complete new generation before retiring the last verified recovery set.

---

`par2cmdline` does not provide an incremental update operation after protected files change. Create a complete new recovery set for a new immutable archive generation. Keep the old data and its old PAR2 volumes intact until the replacement generation has passed verification and a repair drill.

This is necessary because PAR 2.0 binds recovery data to the exact recovery set. File identifiers incorporate the filename, length, and content hash of the first 16 KiB. The main packet identifies an ordered set of file IDs and a fixed slice size. Recovery slices are computed across those exact ordered input slices. A changed byte, size, name, member list, or slice layout can invalidate the relationship.

## Distinguish Two Operations

For maintaining parity with `par2cmdline`, distinguish two cases:

| Situation | Correct operation |
| --- | --- |
| Filenames, membership, bytes, and lengths are unchanged; you only want more recovery blocks | Add compatible recovery volumes with the same slice size and nonoverlapping recovery exponents |
| Any protected filename, length, bytes, membership, or slice size changed | Build a completely new PAR2 recovery set |

The official client documents `-f` for adding recovery blocks to an unchanged set. For example, if the original was created with a 300 KiB block size and recovery exponents below 300:

```bash
par2 create \
  -R \
  -s307200 \
  -r5 \
  -f300 \
  archive-extra.par2 \
  SHA256SUMS payload/*
```

The new output basename avoids colliding with the existing index; it does not change the Recovery Set ID. Use the same protected paths and membership, including any explicitly added hidden files. Command-line input order does not matter because the main packet sorts file IDs numerically. The same block size is required, and `-f300` starts at recovery-block number 300 so it does not duplicate earlier blocks. This operation is **not** a way to update parity for modified inputs.

## Publish Generations, Not In-Place Mutations

Use immutable versioned directories:

```text
archive-2026q2/
  payload/
  SHA256SUMS
  archive-2026q2.par2
  archive-2026q2.vol*.par2

archive-2026q3.staging/
  payload/
  SHA256SUMS
  archive-2026q3.par2
  archive-2026q3.vol*.par2
```

Never overwrite `archive-2026q2.par2` while Q2 is the last known repairable copy. A failed parity build, power loss, full disk, or changing source could otherwise leave neither generation complete.

## Snapshot the Changed Inputs

These examples assume Bash and GNU coreutils/findutils. Stop writers or export from a consistent snapshot into a fresh staging directory:

```bash
set -euo pipefail
mkdir archive-2026q3.staging
mkdir archive-2026q3.staging/payload
cp -a changed-export/. archive-2026q3.staging/payload/

cd archive-2026q3.staging
find payload -type f -print0 |
  sort -z |
  xargs -0 sha256sum >SHA256SUMS
```

Review the inventory against the previous generation:

```bash
diff -u \
  ../archive-2026q2/SHA256SUMS \
  SHA256SUMS || { test "$?" -eq 1 || exit 1; }
```

The differences should match the approved archive change. If an application is still modifying the export, start again from a proper snapshot. PAR2 creation is not a transactional snapshot mechanism.

## Build the New Recovery Set

Choose the new slice size and recovery percentage from total bytes, expected damage pattern, verification overhead, and the PAR 2.0 limit of 32,768 input slices:

```bash
par2 create \
  -R \
  -s1048576 \
  -r15 \
  archive-2026q3.par2 \
  SHA256SUMS payload/*
```

`-R` recurses into visible directories matched by the shell, but `payload/*` omits top-level dotfiles. Compare the selected inputs with `find payload -type f`, explicitly add omitted dotfile paths, and confirm the file count before accepting the set. If automation generates a file list, use the exact syntax documented by the installed client and review the list first.

Keep the build on storage with enough free capacity for the new data, recovery volumes, temporary work, and a full restore copy. Do not reclaim the old generation to make the new generation fit.

## Verify Before Cutover

Run both format-level and external verification:

```bash
par2 verify archive-2026q3.par2
sha256sum -c SHA256SUMS

find . -type f ! -path ./GENERATION-SHA256SUMS -print0 |
  sort -z |
  xargs -0 sha256sum >GENERATION-SHA256SUMS
```

Copy the staging generation to another failure domain, then verify that copy independently. A local success does not prove the remote transfer or offline medium.

Run a repair drill against a disposable copy. Select an actual protected file at least 3 MiB and fail before `dd` if the path or size is wrong:

```bash
cd ..
test ! -e archive-2026q3.restore-test && test ! -L archive-2026q3.restore-test || exit 1
cp -a archive-2026q3.staging archive-2026q3.restore-test
cd archive-2026q3.restore-test

test_file=payload/replace-with-protected-file.bin
test -f "$test_file" || exit 1
test "$(wc -c <"$test_file")" -ge 3145728 || exit 1

dd if=/dev/zero \
  of="$test_file" \
  bs=1048576 count=1 seek=2 conv=notrunc status=none

verify_status=0
par2 verify archive-2026q3.par2 || verify_status=$?
test "$verify_status" -eq 1 || exit 1
par2 repair archive-2026q3.par2
par2 verify archive-2026q3.par2
sha256sum -c SHA256SUMS
```

Only a disposable copy should be deliberately corrupted. The first verification must return 1 (repair needed and possible); a zero-filled region may remain unchanged, in which case the drill stops and must be repeated on a fresh copy with a nonzero region. Any other failure also stops the drill. Capture the result and recovery time.

## Perform an Atomic Same-Filesystem Cutover

After the primary and independent copy both verify, rename staging on the same filesystem, with no existing destination:

```bash
cd ..
test ! -e archive-2026q3 && test ! -L archive-2026q3 || exit 1
mv archive-2026q3.staging archive-2026q3
```

Update a catalog or `current` pointer using the storage platform's atomic publication mechanism. Do not expose a directory while its PAR2 volumes are still being copied.

Retain `archive-2026q2` for a defined rollback and media-scrub interval. When policy permits retirement, remove its data and matching PAR2 volumes as one generation. Never mix Q2 volume files with Q3 and assume their recovery blocks add together; Recovery Set IDs are not guaranteed to distinguish every content change: a same-length edit beyond the first 16 KiB can leave the file ID and Recovery Set ID unchanged. Keep generations physically separate even when their IDs match.

## Secure the Maintenance Workflow

PAR2's MD5 and CRC fields detect accidental corruption for format operation, but they are not a modern authenticity mechanism. Sign the SHA-256 generation manifest and keep the verification key outside the archive's writable account.

Use `par2cmdline` 1.2.0 or later, or a package containing its June 2026 security fixes, especially when processing recovery sets from an untrusted source. Repair within a sandboxed scratch directory and inspect paths before allowing reconstructed files into an authoritative archive.

## Conclusion

Treat every archive change as a new immutable generation. Build new data, manifest, index, and recovery volumes side by side; verify them locally and in an independent failure domain; then publish atomically and retain the old verified generation through rollback. Additional PAR2 volumes can extend unchanged data, but modified inputs always require a new recovery set.

## Official Documentation

- [Parchive: Official par2cmdline Repository](https://github.com/Parchive/par2cmdline)
- [Parchive: PAR 2.0 File Format Specification](https://parchive.github.io/doc/Parity%20Volume%20Set%20Specification%20v2.0.html)
- [Parchive: par2cmdline 1.2.0 ChangeLog](https://github.com/Parchive/par2cmdline/blob/master/ChangeLog)
