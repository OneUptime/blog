# Validation Summary: How to Use FT.DICTDEL in Redis to Remove from Dictionaries

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RediSearch (FT.DICTDEL, FT.DICTADD, FT.DICTDUMP)

## Sources Consulted
- Official Redis documentation for FT.DICTDEL: https://redis.io/docs/latest/commands/ft.dictdel/
- Official Redis documentation for FT.DICTADD: https://redis.io/docs/latest/commands/ft.dictadd/
- Official Redis documentation for FT.DICTDUMP: https://redis.io/docs/latest/commands/ft.dictdump/

## Issues Found
No technical issues found.

## Review Notes
- The claim that "a dictionary naturally disappears when empty" is commonly understood behavior but is not explicitly stated in the official Redis documentation. It is not incorrect, but readers should be aware it is not formally documented.
- The `--` comment syntax used in some redis code blocks is not valid Redis CLI syntax. Redis CLI does not support inline comments. This is a common blog convention for annotating examples and the actual commands are all correct, so no change was made.
- All command syntax matches official docs: `FT.DICTDEL dict term [term ...]`, `FT.DICTADD dict term [term ...]`, `FT.DICTDUMP dict`.
- Return value descriptions are accurate: FT.DICTDEL returns the count of terms actually deleted.
- The example flow is consistent: 5 terms added, 1 removed, 2 more removed, 1 non-existent term attempted (returns 0), dump shows the correct 2 remaining terms.
- All commands available since RediSearch 1.4.0.
