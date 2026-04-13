# Validation Summary: How to Use $bitsAllClear for Bitwise Queries in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query operators)
- MongoDB `$bitsAllClear` bitwise query operator
- JavaScript / mongosh shell

## Sources Consulted
- MongoDB official documentation for `$bitsAllClear`: https://www.mongodb.com/docs/manual/reference/operator/query/bitsAllClear/

## Issues Found
1. **Confusing description of the basic example query** (line 40): The original text read "Find users who have neither delete (bit 2) nor admin (bit 3) permissions clear - meaning they have neither of those permissions." The phrasing "permissions clear" was ambiguous and could be misread as saying the bits are NOT clear (i.e., set), which is the opposite of what `$bitsAllClear` does. Reworded to: "Find users who do not have delete (bit 2) or admin (bit 3) permissions — that is, where both those bits are clear (set to 0)."

2. **Incorrect claim about floating-point support** (Supported Field Types section): The post stated "It does not work on floating-point numbers or other types." Per the official MongoDB documentation, `$bitsAllClear` does work on double values that are whole numbers and representable as a signed 64-bit integer (e.g., `3.0`). It only fails to match doubles with fractional components or values outside the int64 range. Updated the section to accurately describe this behavior.

## Review Notes
- The BinData example uses `BinData(0, "AA==")` which decodes to a single zero byte (0x00), meaning no bits are checked and all documents would trivially match. A more illustrative example would use a non-zero value, but this is a pedagogical choice rather than a technical error.
- All binary representations and bit position mappings in the examples were verified to be correct.
- The indexing guidance is accurate — MongoDB confirms that `$bitsAllClear` queries cannot use indexes for the bitwise portion.
