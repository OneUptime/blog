# Validation Summary: Prevent Overflow When Calculating Exponential Backoff

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Java integer arithmetic and shift operators
- Capped exponential backoff and saturating multiplication
- Java `Math.multiplyExact` and `java.time.Duration`
- Java `ThreadLocalRandom` and full jitter
- Java timers and scheduled executors
- AWS SDK retry behavior

## Sources Consulted

- [Java Language Specification 21, Section 15.7: Evaluation Order](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.7)
- [Java Language Specification 21, Section 15.17.1: Multiplication Operator](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.17.1)
- [Java Language Specification 21, Section 15.19: Shift Operators](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.19)
- [Java SE 21 `Math.multiplyExact`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Math.html#multiplyExact(long,long))
- [Java SE 21 `Duration.multipliedBy`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/Duration.html#multipliedBy(long))
- [Java SE 21 `ThreadLocalRandom`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ThreadLocalRandom.html)
- [Java SE 21 `Timer.schedule`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Timer.html#schedule(java.util.TimerTask,long))
- [Java SE 21 `ScheduledExecutorService`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ScheduledExecutorService.html)
- [AWS SDK retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)

## Issues Found

- The full-jitter description said the generated delay was strictly below the ceiling, but `ThreadLocalRandom.nextLong(ceiling + 1)` returns a value from zero through `ceiling`, inclusive. The description now states the implemented inclusive range.

## Review Notes

- The capped-backoff implementation is overflow-safe for every accepted input, including odd caps, `Integer.MAX_VALUE` attempts, and a cap of `Long.MAX_VALUE`. Its results matched an exact `BigInteger` reference calculation in a boundary and property sweep.
- The full-jitter helper intentionally allows a zero delay. Its documented requirement that `maxMs` be below `Long.MAX_VALUE` is necessary because `ceiling + 1` must remain positive and representable; callers must enforce that precondition.
- Java `Timer` rejects negative delays, while `ScheduledExecutorService` treats negative one-shot delays as requests for immediate execution, supporting the post's warning about overflowed timer inputs.
- The referenced APIs are current and non-deprecated in Java 21. The examples also executed successfully on OpenJDK 17.
