# Prevent Overflow When Calculating Exponential Backoff

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Backoff, Java, Overflow, Retry, Resilience, Jitter

Description: Calculate capped exponential backoff without overflowing integers, durations, powers, or timer ranges in long-running workers.

---

The familiar formula `base * 2^attempt` is unsafe when `attempt` can grow without a strict bound. Integer multiplication can wrap, a shift can discard high bits, duration arithmetic can throw, and floating-point powers can become infinity.

Cap before multiplying, not after an overflow has already happened.

## Why `min` Is Too Late

This Java expression looks capped but evaluates the multiplication first:

```java
long delayMs = Math.min(maxMs, baseMs * (1L << attempt));
```

It has several problems:

- Java masks the shift distance for `long`, so large attempts do not mean ever-larger powers.
- `baseMs * factor` can overflow to a negative or small value.
- Passing a negative result to a timer can fail or retry immediately.

`Math.min` cannot repair a value that has already overflowed.

## Use Saturating Multiplication

For a multiplier of two, compare against the cap before each multiplication:

```java
static long cappedBackoffMillis(long baseMs, int attempt, long maxMs) {
    if (baseMs <= 0) {
        throw new IllegalArgumentException("baseMs must be positive");
    }
    if (attempt < 0) {
        throw new IllegalArgumentException("attempt must be non-negative");
    }
    if (maxMs < baseMs) {
        throw new IllegalArgumentException("maxMs must be at least baseMs");
    }

    long delay = baseMs;
    for (int i = 0; i < attempt; i++) {
        if (delay > maxMs / 2) {
            return maxMs;
        }
        delay *= 2;
    }
    return Math.min(delay, maxMs);
}
```

Because `delay <= maxMs / 2` before multiplication, `delay * 2` cannot exceed the configured, representable cap. Runtime is bounded in practice because the loop exits as soon as the cap is reached.

For a general positive integer multiplier:

```java
if (delay > maxMs / multiplier) {
    return maxMs;
}
delay *= multiplier;
```

Validate `multiplier > 1`. If overflow should be an error rather than saturation, Java's `Math.multiplyExact` throws `ArithmeticException` instead of wrapping silently.

## Keep Units and Timer Limits Explicit

Do all arithmetic in one unit and convert only at the boundary. `Duration.multipliedBy` also throws `ArithmeticException` when its capacity is exceeded, so it is not a substitute for prechecking the configured cap.

Choose a practical maximum, such as seconds or minutes, far below `Long.MAX_VALUE`. Real schedulers and network clients impose their own maximum delays, and a retry that waits for centuries is operationally indistinguishable from lost work.

Attempt count should also be bounded independently by maximum attempts or total elapsed time. The delay cap protects arithmetic and the downstream service; it does not define when to abandon or dead-letter an operation.

## Add Jitter After Computing the Safe Ceiling

Full jitter selects a delay uniformly below the capped exponential ceiling:

```java
import java.util.concurrent.ThreadLocalRandom;

static long fullJitterMillis(long baseMs, int attempt, long maxMs) {
    long ceiling = cappedBackoffMillis(baseMs, attempt, maxMs);
    return ThreadLocalRandom.current().nextLong(ceiling + 1);
}
```

This version assumes the practical `maxMs` is below `Long.MAX_VALUE`, so `ceiling + 1` is representable. Document and validate that invariant. For a cap equal to `Long.MAX_VALUE`, use a random API and range construction that does not add one to the upper bound.

Randomization does not make an unsafe exponential calculation safe. First compute a saturating ceiling, then jitter within it.

## Test the Boundary, Not Just Early Attempts

Include tests for:

```java
assertEquals(100, cappedBackoffMillis(100, 0, 30_000));
assertEquals(800, cappedBackoffMillis(100, 3, 30_000));
assertEquals(30_000, cappedBackoffMillis(100, 1_000_000, 30_000));
```

Property tests should assert that every result is positive, never exceeds the cap, never decreases as the attempt increases, and reaches the cap without throwing for any accepted attempt value.

## Official Documentation

- [Java `Math.multiplyExact`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Math.html#multiplyExact(long,long))
- [Java `Duration.multipliedBy`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/Duration.html#multipliedBy(long))
- [Java `ThreadLocalRandom`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ThreadLocalRandom.html)
- [AWS SDK retry formula, cap, and full jitter](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)

## Conclusion

Never compute an unbounded exponential and clamp it afterward. Validate inputs, compare against `cap / multiplier` before multiplying, use a practical timer cap, and apply jitter only to the already-safe ceiling.
