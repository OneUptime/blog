# Validation Summary: How to Use SYSDATE() vs NOW() in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (date and time functions: NOW(), SYSDATE(), CURRENT_TIMESTAMP(), LOCALTIME(), LOCALTIMESTAMP(), CURDATE(), CURTIME())
- Statement-based replication (SBR)
- MySQL stored procedures, functions, and triggers
- MySQL --sysdate-is-now server option

## Sources Consulted
- [MySQL 8.4 Reference Manual: Date and Time Functions](https://dev.mysql.com/doc/refman/8.4/en/date-and-time-functions.html)
- [MySQL 8.0 Reference Manual: Date and Time Functions](https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html)
- [MySQL 8.4 Reference Manual: Server Command Options (--sysdate-is-now)](https://dev.mysql.com/doc/refman/8.4/en/server-options.html)
- [MySQL 5.7 Reference Manual: Replication and System Functions](https://dev.mysql.com/doc/refman/5.7/en/replication-features-functions.html)
- [MySQL Bug #99493: While-loop in Function behaves differently than in Procedure](https://bugs.mysql.com/bug.php?id=99493)

## Issues Found

### 1. Incorrect claim about NOW() behavior in stored procedures (lines 110 and 131)

**What was wrong:** The post stated that in the stored procedure example with a WHILE loop and SLEEP(1), "ts_now will be the same for all three rows (the procedure's start time)." It also introduced the section by implying NOW() returns a single fixed timestamp across all statements in a stored procedure.

**What was changed:** Corrected the explanation to clarify that in stored **procedures**, each statement gets its own NOW() value (re-evaluated per statement). The "frozen for entire call" behavior only applies to stored **functions** and **triggers**. Updated the result description to state that both ts_now and ts_sysdate will differ by ~1 second per row, and added a note clarifying the distinction with stored functions/triggers.

**Why:** MySQL documentation states that "Within a stored function or trigger, NOW() returns the time at which the function or triggering statement began to execute." This does NOT extend to stored procedures, where each individual statement is evaluated independently. MySQL Bug #99493 confirms this behavioral difference between stored functions and stored procedures.

## Review Notes
- The --sysdate-is-now option is described as "Starting MySQL 5.1" which is plausible but could not be definitively verified since MySQL 5.1 docs are no longer hosted on dev.mysql.com. The option exists in all currently documented versions (5.7+).
- The post uses the term "coordinator" in the replication section (line 139) which is the modern MySQL 8.0.26+ terminology (replacing "master"). This is correct for current versions.
- All SQL syntax, code examples, and other technical claims were verified as correct.
- The mermaid diagrams accurately represent the described behavior.
- The recommendation table and practical guidance are sound.
