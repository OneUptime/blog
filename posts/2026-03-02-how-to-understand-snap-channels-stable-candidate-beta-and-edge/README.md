# How to Understand Snap Channels: Stable, Candidate, Beta, and Edge

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snap, Package Management, Linux

Description: A practical guide to snap channels - stable, candidate, beta, and edge - explaining what each channel means, how to switch between them, and when to use each one.

---

Snap channels are a release management system that gives both developers and users control over which version of software they receive. Unlike traditional package managers where you generally get whatever version the distribution ships, snap channels let you explicitly choose between stable releases, release candidates, beta builds, and cutting-edge development snapshots. Understanding channels is essential for getting the right version of software and for managing updates predictably.

## The Channel Model

A full channel specification has three components:

```
<track>/<risk-level>/<branch>
```

For example: `latest/stable`, `18/stable`, `latest/edge`

Most channels you'll encounter use just the risk level (which defaults to the `latest` track):

- `stable` - Production releases
- `candidate` - Release candidates being tested
- `beta` - Beta features for testing
- `edge` - Continuous builds from the latest source

## The Four Risk Levels

### Stable

The stable channel contains releases that have passed all testing stages. This is what most users should run. Snaps on stable have typically spent time in candidate channel being tested by a wider audience before promotion.

```bash
# Install from stable (this is the default)
sudo snap install firefox

# Explicitly specify stable
sudo snap install firefox --channel=stable

# Check current channel tracking
snap list firefox
# Track column shows: latest/stable
```

Stable releases get the most conservative update policy. Breaking changes should never appear here, and regressions are treated as bugs that get hotfixed rather than "we'll fix it in the next release."

### Candidate

The candidate channel contains builds that the developer believes are ready for release but wants a final round of community testing before promoting to stable. Think of it as a "release candidate" in the traditional software development sense.

```bash
# Switch to candidate for testing a release before it hits stable
sudo snap refresh firefox --channel=candidate

# Install directly on candidate
sudo snap install myapp --channel=candidate
```

Candidate is appropriate for users who want to test upcoming releases and report issues before the general population is affected. If no issues are reported after a defined period (days to weeks), the developer promotes the candidate revision to stable.

### Beta

The beta channel contains builds with features that are complete enough for external testing but may have rough edges. Betas typically contain functionality that will appear in the next major version.

```bash
# Install on beta channel
sudo snap install inkscape --channel=beta

# Switch to beta
sudo snap refresh inkscape --channel=beta
```

Beta is suitable for power users who want early access to new features and are comfortable with occasional instability. Beta builds receive less polish than candidate or stable builds.

### Edge

Edge (sometimes called "nightly" in other systems) contains builds from the absolute latest source code commits. These are typically automated builds triggered by every merge to the main development branch.

```bash
# Install from edge (may be unstable)
sudo snap install myapp --channel=edge
```

Edge is primarily for developers testing their own applications or users who need a feature that just landed in development. Edge builds can break at any time - this is expected and normal.

## Tracks: Version Streams

Tracks allow a single snap to maintain multiple supported versions simultaneously. Without tracks, only one version of a snap can exist on a given channel.

```bash
# List available tracks for a snap
snap info firefox

# Example output showing tracks:
# channels:
#   latest/stable:    123.0.1                    2024-01-15 (4201) 256MB -
#   latest/candidate: 124.0b2                    2024-01-10 (4198) 256MB -
#   latest/beta:      125.0a1                    2024-01-08 (4190) 256MB -
#   latest/edge:      126.0a1                    2024-01-12 (4210) 256MB -
#   esr/stable:       115.7.0esr                 2024-01-12 (4205) 256MB -
```

In this example, `latest` and `esr` are tracks. The `esr` track provides the Extended Support Release version independently of the main development track.

```bash
# Install from a specific track
sudo snap install firefox --channel=esr/stable

# Switch tracks
sudo snap refresh firefox --channel=esr/stable

# Check which track you're on
snap list firefox
```

Common track patterns:
- **latest** - The default track, latest development
- **Version numbers** (like `18`, `3.6`, `lts`) - Stable version streams
- **esr/lts/maintenance** - Long-term support versions

## Switching Between Channels

```bash
# Switch to a different channel and update
sudo snap refresh firefox --channel=latest/beta

# Switch back to stable
sudo snap refresh firefox --channel=stable

# After switching, your snap tracking info updates
snap list firefox
# Now shows: latest/beta  or  latest/stable

# List available channels and current versions
snap info firefox | grep -A 20 "^channels:"
```

When switching to a higher-risk channel (stable -> beta), you typically get a newer version. When switching back (beta -> stable), you may be downgraded if the stable version is older than the beta you were running.

## Branches: Temporary Channel Modifications

Branches are short-lived channels for hotfixes or experimental features. They appear as a third component in the channel name:

```bash
# Install from a branch (typically created by snap developers)
sudo snap install myapp --channel=latest/stable/fix-login-bug

# Branches expire automatically after 30 days of inactivity
```

Branches are a developer tool - most users won't interact with them directly.

## Practical Channel Management

### For Production Systems

```bash
# Always use stable, and hold updates until tested
sudo snap install myapp --channel=stable
sudo snap refresh --hold=720h myapp

# Update manually after reviewing changelog
sudo snap refresh myapp
```

### For Testing Upcoming Releases

```bash
# Use candidate to test before it reaches your production systems
sudo snap install myapp --channel=candidate

# Check what's in candidate vs stable
snap info myapp | grep -E "stable:|candidate:"
```

### For Development and Dogfooding

```bash
# Track edge for your own or frequently-used tools
sudo snap install go --channel=1.21/stable    # Stable track for specific Go version
sudo snap install my-cli-tool --channel=edge   # Track development builds
```

### Checking Available Channel Content Without Switching

```bash
# See all channels without installing/switching
snap info firefox

# Compare versions across channels
snap info firefox | grep "latest/"
# latest/stable:    123.0.1  (4201)
# latest/candidate: 124.0b2  (4198)
# latest/beta:      125.0a1  (4190)
# latest/edge:      126.0a1  (4210)
```

## How Developers Use Channels

From a snap developer's perspective, the channel system defines the release pipeline:

```
Code commit -> Automated build -> edge
           After testing     -> beta
           Manual promotion  -> candidate
           After soak time   -> stable
```

```bash
# Developer promoting a revision through channels
snapcraft release my-snap 42 edge
# After automated tests pass:
snapcraft release my-snap 42 beta
# After manual QA:
snapcraft release my-snap 42 candidate
# After candidate soak period:
snapcraft release my-snap 42 stable
```

The revision number (42 in this example) stays the same as it moves through channels - what changes is which channel users subscribed to each channel receive.

## Finding the Right Channel

When choosing a channel for a snap:

1. **Check the snap's documentation** - many snaps document their channel policy
2. **Look at version numbers** - if candidate and stable have the same version, stable is the safe choice
3. **Consider your tolerance for breakage** - production systems use stable, development workstations might use candidate
4. **Look at how often stable updates** - a snap that rarely updates stable might have useful fixes in candidate

```bash
# Get channel information before installing
snap info myapp

# Install and immediately check what you got
sudo snap install myapp --channel=candidate
snap list myapp
```

The channel system gives users meaningful control over the update stream they receive - a major improvement over traditional package management where switching between distribution versions is cumbersome and often involves mixed package states.
