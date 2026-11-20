# Audit File Paths, Reserved Names, and Case Before Cloud Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: File Storage, Data Migration, Python

Description: Find risky names, long paths, and possible collisions before cloud migration with a read-only Python audit and a reviewed rename process.

A migration copies most files and then stalls on a few thousand exceptions. Some names are rejected, two directories merge unexpectedly, and files uploaded successfully cannot be opened by the users' desktop applications.

These failures are easier to resolve before cutover. Audit the source against the actual destination service, transfer interface, and client applications. Keep the audit separate from renaming: finding a suspicious name is not permission to change an application's paths.

## Write a destination profile first

There is no universal “cloud-safe filename” rule. A storage service, a network protocol, a sync client, and an application can impose different restrictions. The usable path must satisfy every layer the workload depends on.

For example, Azure Files documents component limits, reserved names, and path rules for its File service interfaces. Its documentation also describes version-dependent handling of trailing dots through REST headers. Record the exact protocol and API version you will use rather than applying a generic Azure label to every path. [Azure Files naming rules](https://learn.microsoft.com/en-us/rest/api/storageservices/naming-and-referencing-shares--directories--files--and-metadata).

Windows client compatibility adds another layer. Reserved device names remain problematic with extensions, such as `NUL.txt`. Windows also recognizes superscript digits in certain `COM` and `LPT` names. Trailing spaces and periods can behave differently through the filesystem and the user interface. [Windows naming conventions](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file).

Capture the profile in a short table:

| Layer | Record before scanning |
| --- | --- |
| Destination service | Product, protocol, relevant API version, naming limits |
| Transfer tool | Version, escaping behavior, rename rules, exception reporting |
| Client access | Mount or sync-root prefix, operating systems, normal applications |
| Comparison rules | Case behavior and tested Unicode handling |
| Acceptance | Required operations: create, list, open, rename, delete, restore |

A browser upload succeeding proves only that one upload route accepted the object. It does not prove that a mapped drive, desktop client, or restore tool can use the same name.

## Count the final path, not just the source suffix

A short source path can become long after adding a destination site, library, mount, or local sync-root prefix. Measure individual components and the full paths that clients will actually use. Identify whether each documented limit counts bytes, characters, or UTF-16 code units; those are not interchangeable for all text.

Windows long-path support is also application-dependent. Microsoft documents both an operating-system setting and application opt-in for the relevant Win32 behavior. Enabling a machine policy does not establish that every application now supports every long path. [Windows maximum path guidance](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation).

Set an internal review budget below the narrowest verified limit, allowing room for destination prefixes and future nesting. Label that budget as an engineering choice, not a vendor maximum.

## Run a read-only candidate audit

The Python 3.11 script below reports Windows-oriented naming concerns, possible sibling collisions, and length information. It does not rename, delete, or upload files. Save it as `audit_names.py`:

```python
import argparse
import json
import os
import re
import unicodedata
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('root', type=Path)
parser.add_argument('--relative-budget', type=int, default=200)
args = parser.parse_args()
if args.relative_budget < 1:
    parser.error('relative-budget must be positive')
if not args.root.is_dir():
    parser.error('root must be an existing directory')
reserved = re.compile(r'^(CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³])(?:\.|$)', re.I)

def emit(path, issue, **details):
    print(json.dumps({'path': path, 'issue': issue, **details}, ensure_ascii=True))

scan_failed = False

def walk_error(error):
    global scan_failed
    scan_failed = True
    emit(str(error.filename), 'scan_error', detail=str(error))

for parent, directories, files in os.walk(args.root, followlinks=False, onerror=walk_error):
    seen = {}
    for name in sorted(directories + files):
        path = Path(parent) / name
        relative = path.relative_to(args.root).as_posix()
        reasons = []
        if any(c in '<>:"/\\|?*' or ord(c) < 32 for c in name):
            reasons.append('windows_character_review')
        if name.endswith((' ', '.')):
            reasons.append('trailing_space_or_dot')
        if reserved.match(name):
            reasons.append('windows_reserved_name')
        for reason in reasons:
            emit(relative, reason)
        key = unicodedata.normalize('NFC', name).casefold().rstrip(' .')
        if key in seen:
            emit(relative, 'possible_sibling_collision', other=seen[key])
        else:
            seen[key] = relative
        units = len(relative.encode('utf-16-le', errors='surrogatepass')) // 2
        if units > args.relative_budget:
            emit(relative, 'over_review_budget', budget=args.relative_budget)
        emit(relative, 'length_inventory',
             component_filesystem_bytes=len(os.fsencode(name)),
             relative_utf16_units=units)
        if path.is_symlink():
            emit(relative, 'symlink_not_followed')

raise SystemExit(2 if scan_failed else 0)
```

Run it against a stable source view, writing output outside the scanned tree. Replace both paths with approved locations:

```bash
python3.11 audit_names.py /source/share --relative-budget 200   > /local/audit-evidence/names.jsonl
```

The `200` value is an example review budget for the relative path in UTF-16 code units. It is not an Azure, Windows, or other cloud limit. Adjust it only after calculating the actual destination/client prefix budget. The output also includes component length in the local filesystem encoding's bytes, which is a separate measurement.

Each line is a JSON record. Embedded newlines and unusual characters are escaped rather than corrupting a line-based report. A `length_inventory` record is information, not an error. Other records identify candidates for review. Exit status zero means the scan completed, not that the tree is approved; inspect the findings. A directory scan error produces a record and status two.

The scanner does not descend into symbolic-link directories, but it reports them. A symlink root, mounted subtrees, or files that change during traversal need a separately defined inventory boundary. Python documents the traversal and error callback behavior. [Python os.walk](https://docs.python.org/3.11/library/os.html#os.walk).

## Treat collision findings as questions to resolve

The comparison key combines Unicode NFC normalization, case folding, and removal of trailing spaces or dots. NFC makes certain equivalent Unicode representations comparable. This is a conservative review heuristic, not an implementation of a particular filesystem's name comparison algorithm. [Python Unicode normalization](https://docs.python.org/3.11/library/unicodedata.html#unicodedata.normalize).

That distinction matters. A reported pair might be legal on the destination, while another service-specific restriction may be absent from this script. The audit does not cover every reserved provider name, invalid Unicode case, URL encoding rule, or client limitation. Use the destination's own assessment tool and a controlled upload pilot for final acceptance.

Directory collisions need attention before file collisions. If `Reports` and `reports` become the same destination directory, their children may interact even when the child filenames were unique in each source directory. Resolve the parent mapping, then evaluate the complete proposed destination tree again.

This scanner was tested locally with Python 3.11.13 using reserved names, a superscript device name, illegal/control characters, a trailing-dot collision, an over-budget path, and a linked directory outside the fixture. Checks confirmed valid JSON output, no traversal into that linked directory, and unchanged file content. No cloud upload, Windows client, or destination naming behavior was tested.

## Make renames explicit and reversible

Do not automatically replace every forbidden character with an underscore. Different originals can collapse to the same proposed name, and changing an extension or directory name can break application references.

Create a mapping with the exact original path, proposed path, reason, owner, and approval status. Preserve original spelling and Unicode representation in that record. Check the proposed names for new collisions after applying the entire mapping, including renamed parents.

Ask application owners about embedded document links, scripts, build paths, saved shortcuts, and database references. Some datasets need an application-level export or path update rather than a filesystem rename. When a name must remain unchanged, consider a compatible destination or a documented exception instead of silently changing semantics.

Keep the mapping with the migration evidence so operators can locate files during validation and recovery. Apply it to a staging copy first. A rollback plan must explain how clients and references return to their previous state, not just how directory names change back.

## Validate through the real access paths

Build a pilot from the difficult cases: long components, deep paths, non-ASCII names, case-only differences, trailing dots, and renamed parents. Upload through the intended migration tool, then open and manipulate the files through normal client applications.

Verify expected paths and contents, test permissions, and run a small restore using the planned recovery method. Preserve exact error messages for rejected cases. An exception is resolved only when its approved outcome is visible and usable on the destination.

Finally, rerun the audit against the final consistent source view and reconcile new files against the approved mapping. Keep a count of scanned entries, reviewed findings, unresolved exceptions, and destination results. The migration should begin with a known exception list, rather than discovering its naming policy from failures during cutover.
