# Validation Summary: How to Use clickhouse-obfuscator for Data Masking

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- clickhouse-obfuscator CLI tool
- clickhouse-client CLI
- Data formats: Native, TSV

## Sources Consulted
- ClickHouse official documentation on clickhouse-obfuscator: https://clickhouse.com/docs/en/operations/utilities/clickhouse-obfuscator
- ClickHouse source code for the obfuscator tool (Obfuscator.cpp) on GitHub
- ClickHouse DESCRIBE TABLE documentation

## Issues Found

1. **Strings obfuscation description was incorrect.** The post claimed strings are "replaced character-by-character with random characters preserving length." In reality, `clickhouse-obfuscator` trains a Markov model on input strings and generates new strings that preserve statistical character patterns. String length is also transformed, not preserved exactly. Fixed the description in both the summary list and the detailed section.

2. **Numbers obfuscation mechanism was incorrect.** The post described numbers as "shifted by a pseudo-random delta." The actual mechanism is a Feistel network-based pseudorandom permutation within the same log2 magnitude bucket. Values 0 and 1 are always preserved. Fixed the description.

3. **Dates obfuscation claim was incorrect.** The post stated dates are "shifted by a random offset." In reality, Date columns are left completely unchanged (they use IdentityModel). For DateTime columns, the date component is preserved while the time-of-day component is transformed. Fixed to accurately describe this behavior and added Date values to the "What Is NOT Changed" section.

4. **IP addresses claim was fabricated.** The post claimed IP addresses are "randomized per-octet." There is no IP address type handling in the clickhouse-obfuscator source code. IP columns stored as strings or integers would be processed by those respective models, not any IP-aware logic. Removed this claim entirely.

5. **UUIDs description was slightly inaccurate.** The post said UUIDs are "fully randomized." While UUIDs are randomized, the version and variant bits from the original UUID are preserved. Fixed to note this.

6. **Sorting order preservation claim was unsupported.** The post listed "Sorting order" as something that is not changed. The official docs do not claim sorting order is preserved. What is preserved is continuity of time values and floating-point values. Replaced with the accurate description.

7. **Piped input examples would fail.** The TSV format example and bug reproduction example used shell pipes (`clickhouse-client ... | clickhouse-obfuscator ...`). The tool requires seekable stdin because it reads the input twice (once for training, once for generation). Piped input is not seekable and would cause an error. Fixed both examples to export to a file first and use file redirection.

## Review Notes
- The official docs note that some obfuscation transforms "are one to one and could be reversed," so the seed should be kept secret. The post's use of the phrase "irreversible" in the intro is a slight overstatement but acceptable in context.
- The `--structure` flag is optional when the format carries schema information. The post implies it is always required, which is fine for a tutorial since explicitly specifying structure is a safe practice.
- The tool has additional useful flags not covered (`--limit`, `--save`, `--load`, `--silent`) which could be mentioned in a more comprehensive guide.
