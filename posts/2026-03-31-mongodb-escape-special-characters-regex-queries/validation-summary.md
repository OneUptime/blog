# Validation Summary: How to Escape Special Characters in MongoDB Regex Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (`$regex` operator, PCRE engine)
- JavaScript / Node.js (MongoDB Node.js driver, `RegExp`)
- Python (PyMongo, `re.escape()`)
- Java (MongoDB Java driver, `Pattern.quote()`)
- PHP (MongoDB PHP driver, `preg_quote()`, `MongoDB\BSON\Regex`)

## Sources Consulted
- Python `re` module documentation — https://docs.python.org/3/library/re.html (verified `re.escape()` behavior change in Python 3.7)
- MongoDB `$regex` operator documentation — https://www.mongodb.com/docs/manual/reference/operator/query/regex/
- MDN Web Docs `escapeRegExp` reference — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions#escaping
- Java `Pattern.quote()` documentation — https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/regex/Pattern.html#quote(java.lang.String)
- PCRE specification for `\Q...\E` literal quoting

## Issues Found
1. **Outdated description of Python `re.escape()`** (line 69): The post stated "`re.escape()` escapes all non-alphanumeric characters." This was true before Python 3.7, but since Python 3.7 (released June 2018), `re.escape()` only escapes characters that have special meaning in a regex. Characters like `!`, `"`, `%`, `'`, `,`, `/`, `:`, `;`, `<`, `=`, `>`, `@`, and backtick are no longer escaped. Updated the description to reflect the current behavior with a note about the version change.

## Review Notes
- The Java `Pattern.quote()` approach using `\Q...\E` boundaries works with MongoDB because MongoDB's regex engine (PCRE, and PCRE2 since MongoDB 6.1) supports this quoting syntax. This is a valid but less portable approach — developers targeting multiple database backends may prefer character-by-character escaping instead.
- The JavaScript `escapeRegex` function matches the standard MDN-recommended implementation. It does not escape the `-` character, which is only special inside character classes and not relevant when the escaped string is used as a top-level `$regex` pattern.
- The ReDoS example `(a+)+` is a well-known catastrophic backtracking pattern and is accurately described.
- The best practice recommendation to prefer equality queries over regex for exact matching is sound advice — equality queries use indexes more efficiently.
