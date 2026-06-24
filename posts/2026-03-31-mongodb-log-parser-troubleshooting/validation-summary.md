# Validation Summary: How to Use the MongoDB Log Parser for Troubleshooting

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- mtools (`mloginfo`, `mlogfilter`, `mplotqueries`)
- MongoDB structured JSON log format (4.4+): `t`, `s`, `c`, `id`, `ctx`, `msg`, `attr` (with `attr.durationMillis`, `attr.ns`)
- Python log parsing

## Sources Consulted
- mtools `mlogfilter` documentation — https://github.com/rueckstiess/mtools/blob/develop/doc/mlogfilter.rst (verified that `--operation` accepts only ONE value out of query/insert/update/delete/command/getmore, that `--slow MS` takes a single millisecond threshold, and that `--version` is supported; `--namespace`, `--thread`, `--from`, `--to` confirmed)
- MongoDB Manual — Log Messages — https://www.mongodb.com/docs/manual/reference/log-messages/ (verified JSON log fields: `s` severity values incl. `E`=Error, `c` component, `id` message id, `attr.durationMillis`, `attr.ns`)

## Issues Found
- `mlogfilter ... --operation query update` passed two operations, but `mlogfilter` accepts only a single operation per invocation (per the official docs: "Currently, only one operation can be specified"). Fixed to `--operation query` and added a comment listing the valid single values (query, insert, update, delete, command, getmore).

## Review Notes
- `mloginfo --queries`, `--connections`, `--restarts`, and `--version` are valid; `mplotqueries --version` and `--type scatter --output-file latency.png` are valid (matplotlib required, as the post notes).
- The Python slow-query script keys on `attr.durationMillis`, `c == 'COMMAND'`, and `attr.ns` — these match the documented JSON log structure; slow-query lines are logged under the COMMAND component.
- The error-counting script filters `"s":"E"` (Error severity) and aggregates by `id` (the stable numeric message identifier) — both consistent with the documented log schema.
- `pip install mtools[all]` is the documented install command for the full toolkit.
