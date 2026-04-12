# Validation Summary: How Redis Lists Work Internally (Quicklist and Listpack)

## Status
validated

## Post Type
Technical explainer / Reference

## Technologies Covered
- Redis 7.x
- Redis Lists (data structure)
- Quicklist (doubly-linked list of listpack nodes)
- Listpack (compact flat byte array encoding)
- LZF compression (for quicklist inner nodes)

## Sources Consulted
- Redis source code: `config.c`, `quicklist.c`, `t_list.c`, `listpack.c` (Redis 7.0 and 7.2)
- Redis `redis.conf` default configuration comments for `list-max-listpack-size` and `list-compress-depth`
- Redis official documentation on list encoding and configuration parameters
- Listpack specification by Salvatore Sanfilippo

## Issues Found

### 1. Incorrect listpack-to-quicklist conversion thresholds (MAJOR)

**What was wrong:** The post stated that lists convert from listpack to quicklist when "More than 128 elements" or "Any element exceeds 64 bytes." These thresholds are incorrect for lists — they are the default thresholds for hashes (`hash-max-listpack-entries`), sorted sets (`zset-max-listpack-entries 128` / `zset-max-listpack-value 64`), and sets, not for lists. With the default `list-max-listpack-size` of `-2`, the conversion is based solely on total byte size (8KB), not element count or per-element size.

**What was changed:** Replaced the incorrect threshold bullet points with an accurate explanation of how `list-max-listpack-size` works: negative values map to size-based limits (-1=4KB, -2=8KB, -3=16KB, -4=32KB, -5=64KB), and positive values set a maximum entry count per node.

**Why:** The original text would mislead readers into thinking lists use the same count/value-size threshold model as hashes and sorted sets, when lists actually use a single total-byte-size parameter.

## Review Notes
- The description of listpack entries as having a "length prefix, allowing forward traversal" is a simplification. Technically, entries have an encoding prefix (not a raw length) that enables determining entry size for forward traversal, and a backlen suffix for backward traversal. This is close enough for a blog post explanation and was not changed.
- `DEBUG OBJECT` is being restricted/deprecated in newer Redis versions. The post uses it in an example but this is a minor concern.
- The `RPUSH log:events item1 item2 ... item200` example uses `...` which isn't valid Redis CLI syntax, but it's clearly illustrative pseudocode.
