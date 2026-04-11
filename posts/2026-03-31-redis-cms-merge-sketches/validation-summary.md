# Validation Summary: How to Use CMS.MERGE in Redis to Combine Sketches

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RedisBloom module
- Count-Min Sketch (CMS) data structure
- CMS.MERGE, CMS.INITBYDIM, CMS.INCRBY, CMS.QUERY commands

## Sources Consulted
- Redis official CMS.MERGE documentation: https://redis.io/docs/latest/commands/cms.merge/
- RedisBloom source code (rm_cms.c, cms.c): https://github.com/RedisBloom/RedisBloom/blob/master/src/rm_cms.c
- RedisBloom commands.json parameter definitions: https://github.com/RedisBloom/RedisBloom/blob/master/commands.json

## Issues Found

### 1. CMS.MERGE overwrites destination, does not add to existing values
- **What was wrong:** The "Merging into an Existing Non-Empty Sketch" section claimed that CMS.MERGE adds source counters to the existing destination values. In reality, CMS.MERGE completely overwrites the destination counters with the weighted sum of only the source sketches.
- **What was changed:** Corrected the section to explain that CMS.MERGE overwrites the destination, and updated the example to include the destination itself as a source (e.g., `CMS.MERGE total 2 total addition`) as the correct way to preserve existing data during a merge.
- **Why:** The RedisBloom source code (`cms.c`) initializes `itemCount` to 0 for each cell position and sums only the source sketches, then overwrites the destination array. Existing destination values are not included.

### 2. Fractional/float weights are not supported
- **What was wrong:** The weighted merge example used `WEIGHTS 0.5 1.0`, implying floating-point weights are supported. The WEIGHTS parameter only accepts integer values (parsed via `RedisModule_StringToLongLong`).
- **What was changed:** Changed the example to use integer weights `WEIGHTS 1 2` and updated the expected output from 1300 to 2600 accordingly. Added a note "(weights must be integers)" to the section.
- **Why:** The source code in `rm_cms.c` parses weights using `RedisModule_StringToLongLong()` which only accepts integer values. Passing `0.5` would return the error "CMS: invalid weight value".

### 3. Incorrect error message for dimension mismatch
- **What was wrong:** The error message was shown as `ERR width/depth mismatch`, but the actual RedisBloom error string is `CMS: width/depth is not equal`.
- **What was changed:** Updated the error message to match the actual output.
- **Why:** Source code returns the string `"CMS: width/depth is not equal"`.

### 4. Destination parameter description said "created or overwritten"
- **What was wrong:** The destination parameter was described as "created or overwritten", but CMS.MERGE requires the destination to already exist (pre-initialized via CMS.INITBYDIM or CMS.INITBYPROB).
- **What was changed:** Changed to "must already exist; overwritten".
- **Why:** The source code calls `GetCMSKey()` on the destination first, which returns an error if the key does not exist.

## Review Notes
- The blog post correctly pre-initializes the destination sketch with CMS.INITBYDIM in all examples, so the code examples would work even though the parameter description was misleading.
- Note that while RedisBloom's `commands.json` declares the weight type as `"double"`, the actual C implementation uses `long long`. The source code is the ground truth.
- The syntax, return values, dimension requirements, and general explanations of use cases are all accurate.
