# How to Build PAR2 Recovery Files for Long-Term Archives and Test a Restore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Archive, Erasure Coding, Data Integrity, Recovery, Checksum

Description: Build a versioned PAR2 recovery set for an immutable archive, choose slice and redundancy settings, and prove repairability with a disposable restore drill.

---

PAR2 adds repair data to an existing set of files without wrapping them in a new archive format. It divides inputs into equal-sized slices, records per-file and per-slice checksums, and generates Reed-Solomon recovery slices. If the number of missing or damaged input slices does not exceed the intact recovery slices available, a PAR2 client can normally reconstruct the originals.

That is bounded corruption recovery, not backup. Keep independent copies in separate failure domains and protect the archive from deletion, theft, and malicious replacement.

## Use a Current, Patched Client

The shell examples assume Bash with GNU coreutils and findutils. The official `par2cmdline` project provides `create`, `verify`, and `repair`. Check the installed build:

```bash
par2 -V
```

Use a package containing the project's June 2026 security fixes, released in `par2cmdline` 1.2.0. Earlier builds had unsafe behavior when repairing crafted sets, including a symlink-related write issue. Treat recovery files received from another party as untrusted input and repair only inside a disposable, least-privilege directory.

## Freeze an Immutable Archive Generation

Do not create parity while an application is still writing the inputs. Snapshot or export the source into a versioned directory, close open writers, then create a cryptographic manifest:

```bash
mkdir -p archive-2026q3/payload
cp -a source-export/. archive-2026q3/payload/

cd archive-2026q3
find payload -type f -print0 |
  sort -z |
  xargs -0 sha256sum >SHA256SUMS
```

The PAR2 format uses MD5 and CRC32 fields internally to identify files, packets, and slices. Those checksums support format operation but are not an authenticity boundary. Keep the SHA-256 manifest, and sign it when the threat model includes deliberate tampering.

## Choose Slice Size and Recovery Count

PAR2 can repair slices, not an arbitrary byte percentage. Let:

```text
S = slice size in bytes
B = total number of input slices
R = number of recovery slices

approximate recovery bytes = R * S
recoverable damaged slices <= intact R
```

A smaller `S` localizes damage more precisely but increases slice count, checksum metadata, and processing overhead. A larger `S` reduces metadata but one bad sector can invalidate a larger recovery unit. PAR 2.0's standard layout supports at most 32,768 input blocks, so choose a slice size large enough to keep the total input block count at or below that limit.

For a 1 MiB slice and 15% recovery target:

```bash
par2 create \
  -R \
  -s1048576 \
  -r15 \
  archive-2026q3.par2 \
  SHA256SUMS payload/*
```

`-R` makes the client recurse into visible directories matched by the shell. The `payload/*` glob still omits top-level dotfiles. Compare the command's inputs with the `find payload -type f` inventory and add any omitted dotfile paths explicitly. For a generated list, use only the installed client's documented file-list syntax and inspect it before creation.

`-r15` requests recovery blocks numbering roughly 15% of the input blocks. Each file's last slice is padded to the slice size, so recovery bytes can substantially exceed 15% of the original byte count when protecting many small files; PAR2 metadata adds further overhead. It does not promise recovery from every pattern affecting exactly 15% of bytes: damage that touches many slice boundaries can consume more slices. Select redundancy from the expected media fault pattern and the time until another good copy can be obtained.

The command normally creates a small index `.par2` plus volume files whose names identify recovery-block ranges. Keep all of them. The index has verification metadata but no recovery slices, while the volume files supply repair capacity.

## Verify Immediately

Run verification before moving the generation to cold storage:

```bash
par2 verify archive-2026q3.par2
sha256sum -c SHA256SUMS
```

`par2 verify` automatically looks for the other PAR2 volumes in the same directory. A successful PAR2 verification proves that the current inputs match the recovery set. The SHA-256 check proves they match the external manifest you created.

Inventory the complete generation and copy it to at least two independent media or sites:

```bash
find . -type f ! -path './GENERATION-SHA256SUMS' -print0 |
  sort -z |
  xargs -0 sha256sum >GENERATION-SHA256SUMS
```

Store that outer manifest separately. Do not place every recovery volume on the same failing disk as the only data copy. Spreading volume files across media can leave some recovery slices available when one medium is lost.

## Run a Disposable Repair Drill

Never test repair against the only archive. Copy the whole generation to scratch storage:

```bash
cd .. || exit 1
test ! -e restore-test-2026q3 && test ! -L restore-test-2026q3 || exit 1
cp -a archive-2026q3 restore-test-2026q3 || exit 1
cd restore-test-2026q3 || exit 1
```

Choose an actual protected regular file of at least 5 MiB whose range from 3 MiB to 5 MiB contains nonzero bytes; overwriting an already-zero range would not test corruption. Set its path explicitly and make the drill stop if the path or size is wrong. Confirm that at least two intact recovery blocks are available for this two-slice drill. Damage the range in the disposable copy and remove another file only if the chosen recovery budget can cover both:

```bash
test_file=payload/replace-with-protected-file.bin
test -f "$test_file" && test ! -L "$test_file" || exit 1
test "$(wc -c <"$test_file")" -ge 5242880 || exit 1

dd if=/dev/zero \
  of="$test_file" \
  bs=1048576 count=2 seek=3 conv=notrunc status=none || exit 1

par2 verify archive-2026q3.par2
par2 repair archive-2026q3.par2
par2 verify archive-2026q3.par2
sha256sum -c SHA256SUMS
```

The first verification should identify damaged slices and say whether enough recovery blocks exist. It returns a nonzero status when repair is needed, so handle that expected status explicitly if running the drill in a script with `set -e`. `repair` verifies its reconstructed files, and the final SHA-256 check supplies an independent byte-for-byte test.

Also drill a missing-file case and a missing-PAR-volume case. Record how many recovery blocks each scenario consumes and the wall time, memory, and scratch space required. A plan that technically repairs but takes longer than the media-access window is not operationally complete.

## Maintain the Archive

Schedule read-only scrubs with both tools:

```bash
par2 verify archive-2026q3.par2
sha256sum -c SHA256SUMS
```

If verification reports damage, work on a copy, preserve all available fragments, and add misnamed or partial files explicitly to `par2 repair` so the client can scan them for usable slices. Never overwrite the last remaining media during a repair attempt.

Any change to a protected input requires a new archive generation and new PAR2 set. Keep the prior generation until the replacement has passed a full restore drill.

## Conclusion

A trustworthy PAR2 archive starts with immutable inputs, a reviewed file inventory, and a slice size chosen for both fault granularity and the format's block limit. Verify parity immediately, distribute recovery volumes away from the only data copy, and prove repair on disposable damage. Retain independent backups and a signed external manifest because PAR2 provides bounded repair, not authenticity or disaster recovery by itself.

## Official Documentation

- [Parchive: Official par2cmdline Repository](https://github.com/Parchive/par2cmdline)
- [Parchive: PAR 2.0 File Format Specification](https://parchive.github.io/doc/Parity%20Volume%20Set%20Specification%20v2.0.html)
- [Parchive: par2cmdline 1.2.0 ChangeLog](https://github.com/Parchive/par2cmdline/blob/master/ChangeLog)
