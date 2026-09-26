# How to Normalize Saved Configurations Before Git Diffing to Eliminate False Drift

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Automation, Git, Python, Configuration Management

Description: Build a conservative configuration normalizer that removes known capture noise while preserving meaningful network changes and recoverable backups.

A switch can produce a different configuration capture without any forwarding policy changing. Capture headers, timestamps, and newline conventions can bury a real interface or ACL change under repeated noise. The answer is a small, versioned normalization policy applied before comparison.

The important boundary is semantic: remove a line only when you can explain why it cannot affect configuration behavior. A useful diff must still show a reordered ACL, a changed banner, an altered secret, and a missing section.

## Keep the original capture

Maintain two artifacts for each successful collection. Store the original output in an access-controlled backup store. Store a derived comparison representation in the configuration history. Record their hashes, device identity, collection time, platform, collector version, and normalization policy version in the collection system.

A normalized file may be suitable for review but unsuitable for restoration. For example, a later redaction stage could intentionally remove passwords. Give these artifacts different storage locations and explicit purposes so a restore job never consumes the comparison copy accidentally.

Before normalization, check that collection completed. Pagination markers, timeout-truncated output, authentication errors, and an unexpected device prompt are collection failures. Do not overwrite the last good snapshot with whatever text arrived before an exception.

## Start with a narrow platform profile

The following example supports one deliberately constrained IOS-style capture: it begins with known optional capture headers, includes a `version` line, and ends with `end`. It does not claim to parse every IOS release or configuration mode. Extend the accepted envelope only after collecting representative fixtures.

Save it as `normalize.py`:

```python
import re
import sys
from pathlib import Path

HEADER_RULES = (
    re.compile(r"Building configuration\.\.\."),
    re.compile(r"Current configuration\s*:\s*\d+ bytes"),
    re.compile(r"! Last configuration change at .+"),
    re.compile(r"! NVRAM config last updated at .+"),
)


def normalize_ios(raw: str) -> str:
    text = raw.replace("\r\n", "\n")
    if "\r" in text or "\x1b" in text or "\x08" in text:
        raise ValueError("Unsupported terminal control characters")
    lines = text.split("\n")
    if lines and lines[-1] == "":
        lines.pop()  # One terminal newline, not arbitrary whitespace.
    if not lines or lines[-1] != "end":
        raise ValueError("Capture does not have the expected terminator")
    start = next(
        (i for i, line in enumerate(lines) if line.startswith("version ")),
        None,
    )
    if start is None:
        raise ValueError("Capture does not have the expected version line")
    for line in lines[:start]:
        if line in ("", "!"):
            continue
        if not any(rule.fullmatch(line) for rule in HEADER_RULES):
            raise ValueError("Unrecognized capture preamble")
    return "\n".join(lines[start:]) + "\n"


if __name__ == "__main__":
    # Decode bytes explicitly so Python does not silently translate newlines.
    raw = Path(sys.argv[1]).read_bytes().decode("utf-8")
    Path(sys.argv[2]).write_bytes(normalize_ios(raw).encode("utf-8"))
```

This deliberately leaves configuration lines untouched. It does not sort them, remove indentation, trim banner spaces, or discard all comments. An unfamiliar preamble stops publication instead of widening the ignore policy automatically.

If your platform emits timestamps elsewhere, add a parser-aware rule for that specific location. A global regex can accidentally match user-controlled banner text. Likewise, removing every line containing `time` can erase NTP configuration. Normalization should make failure visible rather than make every capture look clean.

## Test both noise and real changes

A good fixture suite has pairs that should compare equal and pairs that must remain different. For the function above:

```python
from normalize import normalize_ios

config = (
    "version 17.9\n"
    "hostname access-01\n"
    "interface GigabitEthernet1/0/1\n"
    " description Printer\n"
    "end\n"
)
noisy = "Building configuration...\nCurrent configuration : 123 bytes\n" + config
assert normalize_ios(noisy) == normalize_ios(config)
assert normalize_ios(config.replace("\n", "\r\n")) == config
assert normalize_ios(normalize_ios(noisy)) == config
assert normalize_ios(config.replace("Printer", "Camera")) != config
```

Add cases for ACL reordering, multiline banners, whitespace within banners, missing terminators, unsupported control characters, and unexpected headers. The idempotence check matters: running a normalizer twice must not remove more information.

When the policy changes, regenerate both sides from retained raw captures. Comparing yesterday's old-policy file with today's new-policy file manufactures a migration diff. Keep that migration separate from an actual device change.

## Compare without hiding operational errors

Produce candidate files in a temporary directory, validate every capture, then replace the published comparison files atomically. An unsuccessful collection should update collection health, not the configuration baseline.

For two individual files:

```bash
git diff --no-index --no-ext-diff --no-textconv -- old.cfg new.cfg
```

Git documents exit status `0` for equality and `1` for differences; treat other failures as comparison errors. `--no-index` compares filesystem paths and implies exit-code behavior. If a wrapper uses `set -e`, capture and classify the result explicitly so ordinary drift does not abort evidence collection. [Git diff reference](https://git-scm.com/docs/git-diff)

Ansible users can also configure `diff_ignore_lines` for an `ios_config` comparison. That option accepts regexes or exact lines and is intended for automatically changing output. Keep its rules aligned with your capture policy so a scheduled scan and a Git review do not disagree. [Cisco IOS configuration module](https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html)

## Keep drift coverage honest

Redaction and normalization solve different problems. Replacing every password hash with the same marker conceals credential changes. If shared reviewers cannot see those values, retain a restricted audit path that can still detect a rotation or unexpected replacement.

Report collection failures separately from configuration differences. Measure devices with fresh valid captures, normalization rejections, and observed drift. A silent normalizer is useful only when the collection succeeded and the meaningful configuration was preserved.
