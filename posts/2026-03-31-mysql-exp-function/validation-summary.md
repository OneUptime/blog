# Validation Summary: How to Use EXP() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (EXP(), LN(), LOG(), ROUND(), LEAST(), POWER(), SUM() OVER() window function)
- SQL math functions

## Sources Consulted
- MySQL 8.0 Reference Manual: Mathematical Functions — https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_exp
- MySQL 8.0 Reference Manual: Window Functions — https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- IEEE 754 double-precision floating-point limits (max exponent ~709.78 for EXP overflow)

## Issues Found
- **Section heading inconsistency**: The heading "Using EXP() with LOG()" referenced `LOG()` while all code and text within the section used `LN()`. While MySQL's `LOG(X)` is equivalent to `LN(X)` for single-argument calls, the heading was inconsistent with its own content. Changed heading to "Using EXP() with LN()" for consistency.

## Review Notes
- All numerical results in the basic examples were verified: EXP(0)=1, EXP(1)=2.718281828459045, EXP(2)=7.38905609893065, EXP(-1)=0.36787944117144233 are all correct.
- The exponential growth example (1000000 * EXP(0.3) = 1349859) and continuous compounding example (10000 * EXP(1.0) = 27182.82) are mathematically correct.
- The softmax SQL uses valid MySQL 8.0+ window function syntax.
- The overflow cap of 700 with LEAST() is a reasonable safeguard since EXP(709) is near the DOUBLE max (~1.8e+308) and EXP(710) overflows.
- The claim that POWER() may "not be available" is slightly misleading since POWER() is a standard MySQL function, but the broader point about using EXP(b * LN(a)) for complex exponent operations is valid.
