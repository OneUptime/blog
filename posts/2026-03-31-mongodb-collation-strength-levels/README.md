# How to Configure Collation Strength Levels in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Collation, Sorting, Query, Internationalization

Description: Learn how MongoDB collation strength levels control string comparison sensitivity, from base character matching to full Unicode code point comparison.

---

## What Is Collation Strength?

MongoDB collation uses the Unicode Collation Algorithm (UCA) to compare strings. The `strength` field in the collation document determines how many levels of difference are considered significant during comparison and sorting.

The strength setting directly controls what differences are ignored:

```javascript
{ locale: "en", strength: 1 }  // most permissive
{ locale: "en", strength: 5 }  // most strict
```

## The Five Strength Levels

### Strength 1 - Base Characters Only

Differences in case and accents are ignored. `"a"`, `"A"`, and `"à"` are all equal.

```javascript
db.words.find({ word: "cafe" }).collation({ locale: "en", strength: 1 })
// Matches: "cafe", "Cafe", "CAFE", "café", "Café"
```

Use strength 1 when you want the most permissive matching - useful for search boxes where users may type without accent characters.

### Strength 2 - Base + Case

Accents are ignored, but case matters. `"a"` and `"A"` differ; `"a"` and `"à"` are equal.

```javascript
db.words.find({ word: "cafe" }).collation({ locale: "en", strength: 2 })
// Matches: "cafe", "café"
// Does NOT match: "Cafe", "CAFE"
```

Wait - strength 2 ignores accents but NOT case. Let me clarify the UCA levels:

```text
Level 1 (Primary)    Base letter differences     a vs b
Level 2 (Secondary)  Accent differences          a vs à
Level 3 (Tertiary)   Case differences            a vs A
Level 4 (Quaternary) Punctuation and spacing
Level 5 (Identical)  Code point differences
```

When `strength: 2`, comparisons consider levels 1 and 2 (base characters and accents). Case (level 3) is ignored.

```javascript
db.words.find({ word: "cafe" }).collation({ locale: "en", strength: 2 })
// Matches: "cafe", "Cafe", "CAFE" (case ignored)
// Does NOT match: "café" (accent is a level-2 difference)
```

### Strength 3 - Base + Accents + Case (Default)

This is the MongoDB default when no strength is specified. All three levels are considered:

```javascript
db.words.find({ word: "Cafe" }).collation({ locale: "en", strength: 3 })
// Matches only: "Cafe"
// Does NOT match: "cafe", "CAFE", "café"
```

### Strength 4 - Adds Punctuation

Quaternary differences such as spaces and punctuation are significant. Rarely needed unless your data has punctuation-only variants.

```javascript
{ locale: "en", strength: 4 }
```

### Strength 5 - Identical (Code Point)

Every Unicode code point must match exactly. This is equivalent to standard byte comparison but within the UCA framework.

```javascript
{ locale: "en", strength: 5 }
```

## Strength Comparison Table

```text
Input    Strength 1  Strength 2  Strength 3
------   ----------  ----------  ----------
cafe     MATCH       MATCH       NO MATCH
Cafe     MATCH       MATCH       NO MATCH
CAFE     MATCH       MATCH       NO MATCH
café     MATCH       NO MATCH    NO MATCH
Café     MATCH       NO MATCH    NO MATCH
```

(Searching for `"cafe"`)

## Practical Examples

### Global Product Search (Strength 1)

Allow users to find "Hambürger" by typing "hamburger", "HAMBURGER", or "hambürger":

```javascript
db.products.find({ name: "hamburger" }).collation({ locale: "en", strength: 1 })
```

### Username Uniqueness (Strength 2)

Treat usernames as case-insensitive but distinguish accented variants:

```javascript
db.users.createIndex(
  { username: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
)
```

### Password-Sensitive Field Matching (Strength 3)

Full strict comparison including case and accents for sensitive fields:

```javascript
db.tokens.find({ value: tokenInput }).collation({ locale: "en", strength: 3 })
```

## caseLevel Option

You can also enable case distinction within strength 1 by setting `caseLevel: true`:

```javascript
{ locale: "en", strength: 1, caseLevel: true }
```

This treats case as significant even though accents are still ignored.

## Summary

MongoDB collation strength levels control which Unicode differences are treated as significant. Use strength 1 for the most permissive matching (ignores case and accents), strength 2 to ignore case only, and strength 3 (the default) for full case-and-accent-sensitive comparison. Match the strength consistently between your index and query collation to ensure indexes are used.
