# Validation Summary: What Is New in Redis 6.2 (GETDEL, COPY, LMPOP)

## Status
validated

## Post Type
Reference / Feature overview

## Technologies Covered
- Redis 6.2
- Redis 7.0
- Redis CLI commands (GETDEL, GETEX, COPY, LMPOP, ZMPOP, EXPIRE, OBJECT ENCODING)

## Sources Consulted
- Official Redis GETDEL documentation: https://redis.io/docs/latest/commands/getdel/ (confirms 6.2.0)
- Official Redis GETEX documentation: https://redis.io/docs/latest/commands/getex/ (confirms 6.2.0)
- Official Redis COPY documentation: https://redis.io/docs/latest/commands/copy/ (confirms 6.2.0, syntax uses `DB` for cross-database copy)
- Official Redis LMPOP documentation: https://redis.io/docs/latest/commands/lmpop/ (confirms 7.0.0, not 6.2)
- Official Redis ZMPOP documentation: https://redis.io/docs/latest/commands/zmpop/ (confirms 7.0.0, not 6.2)
- Official Redis EXPIRE documentation: https://redis.io/docs/latest/commands/expire/ (NX/XX/GT/LT flags added in 7.0.0, not 6.2)
- Official Redis OBJECT ENCODING documentation: https://redis.io/docs/latest/commands/object-encoding/
- Redis GitHub issue on listpack migration: https://github.com/redis/redis/issues/8702 (listpack replaced ziplist in 7.0 for hashes/sorted sets/lists, 7.2 for sets)

## Issues Found

### 1. LMPOP and ZMPOP incorrectly attributed to Redis 6.2
- **What was wrong:** The post stated LMPOP and ZMPOP were part of Redis 6.2. They were actually introduced in Redis 7.0.0.
- **What was changed:** Added "(Redis 7.0)" to the section heading, corrected the introductory text to say "introduced in Redis 7.0 (not 6.2)", and noted ZMPOP is "also Redis 7.0".

### 2. EXPIRE NX/XX/GT/LT flags incorrectly attributed to Redis 6.2
- **What was wrong:** The post stated "Redis 6.2 extended EXPIRE... with condition flags." These flags were actually added in Redis 7.0.0.
- **What was changed:** Changed "Redis 6.2 extended" to "Redis 7.0 extended" and added "(Redis 7.0)" to the section heading.

### 3. listpack encoding incorrectly attributed to Redis 6.2
- **What was wrong:** The post stated "Redis 6.2 added listpack as the new compact encoding for small hashes, sets, and sorted sets, replacing ziplist." The listpack encoding actually replaced ziplist in Redis 7.0 (for hashes, sorted sets, and lists) and Redis 7.2 (for sets). Redis 6.2 still used ziplist.
- **What was changed:** Changed "Redis 6.2 added" to "Redis 7.0 introduced", corrected the data types affected, noted Redis 7.2 extended it to sets, and updated the code comment from "Redis < 6.2" to "Redis < 7.0".

### 4. Title, description, and summary updated
- **What was wrong:** The title and description implied all features were from Redis 6.2.
- **What was changed:** Updated the title to "What Is New in Redis 6.2 and 7.0", updated the description to separate 6.2 and 7.0 features, updated the intro paragraph, and corrected the summary to attribute features to their correct versions.

## Review Notes
- The GETDEL, GETEX, and COPY sections were technically accurate with correct syntax and examples.
- The COPY command's `DB` syntax for cross-database copy is correct.
- The GETEX options (EX, PX, PERSIST, EXAT) are all correctly documented with valid syntax.
- The code examples for all commands use correct syntax and would produce the expected output.
