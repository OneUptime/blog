# Validation Summary: Self-Hosted Status Pages Compared: Cachet, Upptime, Gatus, cState, and OneUptime

## Status
validated

## Post Type
Comparison

## Technologies Covered
- Cachet (PHP / Laravel status page)
- Upptime (GitHub Actions + GitHub Pages static status page)
- Gatus (Go monitoring + status page)
- cState (Hugo static status page)
- OneUptime (full observability platform with status pages)

## Official Sources Consulted
- github.com/cachethq/cachet (stack, BSD-3-Clause license, v3 rewrite status)
- github.com/upptime/upptime (GitHub Actions/Pages, MIT, 5-min cron minimum)
- github.com/TwiN/gatus (Go, Apache-2.0, HTTP/TCP/DNS/ICMP/SSH/GraphQL checks)
- github.com/cstate/cstate (Hugo, MIT)
- github.com/oneuptime/oneuptime (Apache-2.0)
- oneuptime.com/blog/post/2026-02-25-atlassian-statuspage-21-day-outage (cited outage)

## Issues Found and Fixed (review 2026-06-25)
- Corrected the cited Atlassian Statuspage outage: the post said "21-day outage in April 2024." It was actually the System Metrics feature outage from February 2 to February 23, 2026. Date and scope corrected.
- Fixed the broken cross-reference link to the outage post (was a bare, non-resolving slug; updated to the canonical /blog/post/2026-02-25-atlassian-statuspage-21-day-outage/view URL).
- Added the missing validation.json and validation-summary.md files.

## Key Claims Verified
- Per-tool stacks, licenses, and feature sets (monitoring, incident management, notifications, auth, custom domains) verified against each project's repository.
- Minimum-resource figures in the comparison table are approximate guidance, not vendor-published minimums.
- The "your status page can go down with your infrastructure" reliability argument and the listed mitigations are sound.
