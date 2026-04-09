# Validation Summary: How to Export and Import CRUSH Maps in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CRUSH map management)
- crushtool (CRUSH map compile/decompile/test utility)
- Rook (mentioned in tags, not directly used in examples)
- Kubernetes (mentioned in tags)

## Sources Consulted
- Ceph official documentation on CRUSH map management (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Ceph official documentation on crushtool (https://docs.ceph.com/en/latest/man/8/crushtool/)
- Ceph official documentation on ceph osd commands (https://docs.ceph.com/en/latest/man/8/ceph/)

## Issues Found

1. **"three main sections" should be "four main sections"** (line 35): The text stated the decompiled CRUSH map contains "three main sections" but then listed four bullet points (tunables, devices, buckets, rules). Changed "three" to "four."

2. **Incorrect statement about negative IDs** (line 63): The original text said "Each item in a bucket has a negative ID for internal reference." This is incorrect — buckets have negative IDs, but OSDs (which are items inside buckets) have non-negative IDs. For example, `osd.0` has ID 0. Changed to: "Each bucket has a negative ID for internal reference, while OSDs have non-negative IDs."

## Review Notes
- All CLI commands (`ceph osd getcrushmap`, `crushtool -d`, `crushtool -c`, `crushtool -i --test`, `ceph osd setcrushmap`, `ceph osd crush tree`, `ceph osd crush dump`, `ceph -s`, `ceph pg stat`) are correct with proper flags and syntax.
- The decompiled CRUSH map format also contains a `# types` section (defining bucket types like osd, host, rack, root) which is not listed in the four sections. This is a minor omission but not technically wrong since the post says "main sections" and types is a small section.
- The bucket definition examples with `alg straw2`, `hash 0`, device class syntax (`id -3 class hdd`), and weight values are all accurate.
- The `crushtool --test` simulation flags (`--show-statistics`, `--rule`, `--num-rep`, `--min-x`, `--max-x`) are all valid.
- The rollback procedure using the original binary backup is sound advice.
