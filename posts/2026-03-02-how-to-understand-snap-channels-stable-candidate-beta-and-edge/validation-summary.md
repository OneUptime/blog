# Validation Summary: How to Understand Snap Channels: Stable, Candidate, Beta, and Edge

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Snap / snapd package management
- snapcraft (developer tooling)
- Ubuntu / Linux package management

## Sources Consulted
- Official snap documentation on channels: https://snapcraft.io/docs/channels
- `snap refresh --help` output (verified on local system)
- `snap list` output format (verified on local system)
- `snap info` output format (verified on local system)
- Snapcraft release command docs: https://snapcraft.io/docs/release-process

## Issues Found
- Minor terminology fix: The `snap list` output column is named "Tracking", not "Track". Updated the comment in the code example under the Stable section from "Track column shows: latest/stable" to "Tracking column shows: latest/stable" to match actual `snap list` output.

## Review Notes
- Channel specification format `<track>/<risk-level>/<branch>` is consistent with official snap documentation (which uses `<track>/<risk>/<branch>`; "risk-level" is a synonymous and reasonable alternative phrasing).
- The `--hold=<duration>` option syntax (e.g., `--hold=720h`) was verified against `snap refresh --help` and is correct on current snapd.
- The `snap info` output format example matches what current snapd produces (channel, version, date, revision in parens, size, notes).
- The 30-day branch expiry is correctly stated per snap documentation.
- The `snapcraft release <snap-name> <revision> <channel>` syntax is correct.
- The four risk levels and their semantic meanings (stable, candidate, beta, edge) are accurately described.
- Comparing edge to "nightly" in other systems is a reasonable analogy, though the post correctly clarifies that edge builds are typically per-merge rather than strictly nightly.
