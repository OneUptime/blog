# Validation Summary: How to Implement Ingress Policing for IPv4 Traffic on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux traffic control (`tc`)
- `ingress` qdisc
- `u32` filters
- `police` action
- `mirred` action
- IFB (`ifb0`)
- TBF (`tbf`) shaping
- IPv4 packet matching

## Sources Consulted
- `tc(8)` man page: https://www.man7.org/linux/man-pages/man8/tc.8.html
- `tc-police(8)` man page: https://www.man7.org/linux/man-pages/man8/tc-police.8.html
- `tc-actions(8)` man page: https://www.man7.org/linux/man-pages/man8/tc-actions.8.html
- `tc-u32(8)` man page: https://www.man7.org/linux/man-pages/man8/tc-u32.8.html
- `tc-mirred(8)` man page: https://www.man7.org/linux/man-pages/man8/tc-mirred.8.html
- `tc-skbedit(8)` man page: https://www.man7.org/linux/man-pages/man8/skbedit.8.html
- Local `tc` CLI help from the installed `iproute2-6.1.0` package (`tc -V`, `tc filter add u32 help`, `tc actions add action police help`, `tc actions add action mirred help`)

## Issues Found
- The original "Using CONTINUE Instead of DROP" section was technically incorrect. The example used `conform-exceed reclassify/pipe`, which does not mark exceeded packets, and the heading described `continue` semantics while the command did not use `continue`. I corrected this by changing the section to "Using PIPE Instead of DROP" and replacing the example with an action chain that is documented to work for this purpose: `action police ... conform-exceed pipe/ok` followed by `action skbedit mark 0x1`.
- The description and opening explanation said ingress policing could directly "mark" packets. That overstates what the policer itself does. I corrected the wording to say the policer can drop packets or pass them to later actions/filters for further handling.
- I also updated the inline comment next to `drop` so it includes `pipe` among the documented alternative control actions.

## Review Notes
None.
