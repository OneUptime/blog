# Validation Summary: How to Use Collation for Locale-Aware Sorting in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (collation feature)
- ICU locale identifiers
- MongoDB Shell (mongosh) query and aggregation syntax

## Sources Consulted
- MongoDB official documentation on Collation: https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB official documentation on `find` with collation: https://www.mongodb.com/docs/manual/reference/method/cursor.collation/
- MongoDB official documentation on `aggregate` with collation: https://www.mongodb.com/docs/manual/reference/method/db.collection.aggregate/
- ICU Locale documentation for Swedish (sv) collation rules
- ICU Locale documentation for German phonebook variant (`de@collation=phonebook`)
- Unicode Technical Standard #10 (Unicode Collation Algorithm) for Turkish case folding behavior

## Issues Found
1. **Swedish special characters missing diacritics (line 82)**: The text said "Swedish sorts `a`, `a`, `o` after `z`" with plain ASCII letters. Fixed to `å`, `ä`, `ö` which are the actual Swedish characters that sort after `z`.

2. **Incorrect binary sort result (line 93)**: The binary sort of "zoo", "apa", "alfa" was listed as `apa, alfa, zoo`. Lexicographic byte-order comparison gives `alfa, apa, zoo` (since `alfa` < `apa` because `l` < `p`). Fixed the result.

3. **Swedish example did not demonstrate Swedish-specific behavior**: The original example used only ASCII words ("zoo", "apa", "alfa") which have the same sort order regardless of locale. Replaced with words containing `ä` ("äpple") to demonstrate the key difference: in English collation `ä` sorts near `a`, while in Swedish collation `ä` sorts after `z`. Added an English collation example for contrast.

## Review Notes
- The collation strength explanations are correct: strength 1 = base characters only (case + accent insensitive), strength 2 = case insensitive but accent sensitive.
- The `de@collation=phonebook` locale variant syntax is correct ICU syntax supported by MongoDB.
- The aggregation collation syntax (second argument to `aggregate()`) is correct.
- The Turkish case folding discussion is accurate — Turkish I/i handling is a well-known internationalization concern.
- The performance note about collation-aware indexes is accurate but could link to specific documentation in the future.
